import OpenAI from "openai";
import { createOpenAiClient } from "@/lib/ai/openai";
import { getAiInstructions } from "@/lib/ai/prompts";
import { getAiModel, isAiConfigured } from "@/lib/ai/model-config";
import { routeAiMode } from "@/lib/ai/mode-router";
import { AI_MODE_IDS, type AiExpertMode, type AiMessage, type AiMode } from "@/lib/ai/types";
import { recordAiUsage, reserveAiRequest, type UsageResult } from "@/lib/ai/usage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const encoder = new TextEncoder();
const maxMessageLength = 6_000;
const maxHistoryMessageLength = 12_000;
const maxHistoryLength = 20;
const maxHistoryCharacters = 24_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ChatInput = {
  mode: AiMode;
  message: string;
  history: Array<Pick<AiMessage, "role" | "content">>;
  conversationId?: string;
  requestId?: string;
  userMessageId?: string;
  assistantMessageId?: string;
  regenerate?: boolean;
};

type StreamPayload =
  | { type: "meta"; mode: AiExpertMode }
  | { type: "delta"; text: string }
  | { type: "saving" }
  | { type: "done" }
  | { type: "error"; message: string };

function jsonError(status: number, message: string): Response {
  return Response.json({ error: message }, { status });
}

function parseChatInput(value: unknown): ChatInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const mode = data.mode === undefined ? "auto" : data.mode;
  const message = data.message;
  const history = data.history === undefined ? [] : data.history;
  const optionalIds = ["conversationId", "requestId", "userMessageId", "assistantMessageId"] as const;

  if (typeof mode !== "string" || !AI_MODE_IDS.includes(mode as AiMode)) return null;
  if (typeof message !== "string" || !message.trim() || message.length > maxMessageLength) return null;
  if (!Array.isArray(history) || history.length > maxHistoryLength) return null;
  if (data.regenerate !== undefined && typeof data.regenerate !== "boolean") return null;
  for (const key of optionalIds) {
    if (data[key] !== undefined && (typeof data[key] !== "string" || !uuidPattern.test(data[key]))) return null;
  }

  let historyCharacters = 0;
  const validatedHistory: ChatInput["history"] = [];
  for (const item of history) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as Record<string, unknown>;
    if ((record.role !== "user" && record.role !== "assistant") || typeof record.content !== "string") return null;
    historyCharacters += record.content.length;
    const messageLengthLimit = record.role === "user" ? maxMessageLength : maxHistoryMessageLength;
    if (record.content.length > messageLengthLimit || historyCharacters > maxHistoryCharacters) return null;
    validatedHistory.push({ role: record.role, content: record.content });
  }

  return {
    mode: mode as AiMode,
    message: message.trim(),
    history: validatedHistory,
    ...(typeof data.conversationId === "string" ? { conversationId: data.conversationId } : {}),
    ...(typeof data.requestId === "string" ? { requestId: data.requestId } : {}),
    ...(typeof data.userMessageId === "string" ? { userMessageId: data.userMessageId } : {}),
    ...(typeof data.assistantMessageId === "string" ? { assistantMessageId: data.assistantMessageId } : {}),
    ...(typeof data.regenerate === "boolean" ? { regenerate: data.regenerate } : {}),
  };
}

function getStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  return typeof error.status === "number" ? error.status : null;
}

function getErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  return typeof error.code === "string" ? error.code : null;
}

function apiErrorMessage(status: number | null, code: string | null): string {
  if (status === 401 || status === 403) return "AI 서비스 설정을 확인할 수 없습니다. 관리자에게 문의해 주세요.";
  if (status === 404 || code === "model_not_found") return "AI 모델 설정을 확인할 수 없습니다. OPENAI_MODEL 값을 확인해 주세요.";
  if (status === 429) return "AI 요청이 일시적으로 많습니다. 잠시 후 다시 시도해 주세요.";
  if (status === 400) return "AI가 요청을 처리하지 못했습니다. 질문을 조금 바꿔 다시 시도해 주세요.";
  return "AI 응답을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function createEventStream(
  upstream: AsyncIterable<OpenAI.Responses.ResponseStreamEvent>,
  mode: AiExpertMode,
  reservation: Extract<UsageResult, { ok: true }>["reservation"],
  model: string,
  abortController: AbortController,
  persistence: {
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    conversationId: string;
    requestId: string;
    userMessageId: string;
    assistantMessageId: string;
    regenerate: boolean;
    conversationMode: AiMode;
    content: string;
    title: string;
    persist: boolean;
  },
): ReadableStream<Uint8Array> {
  let cancelled = false;
  return new ReadableStream({
    start(controller) {
      const send = (payload: StreamPayload) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          cancelled = true;
          abortController.abort();
        }
      };

      void (async () => {
        let usage: { inputTokens: number; outputTokens: number } | null = null;
        let completed = false;
        let persisted = false;
        let usageRecorded = false;
        let responseText = "";
        try {
          send({ type: "meta", mode });
          for await (const event of upstream) {
            if (event.type === "response.output_text.delta") {
              responseText += event.delta;
              send({ type: "delta", text: event.delta });
            } else if (event.type === "response.completed") {
              completed = true;
              usage = {
                inputTokens: event.response.usage?.input_tokens ?? 0,
                outputTokens: event.response.usage?.output_tokens ?? 0,
              };
            } else if (event.type === "response.failed" || event.type === "error") {
              send({ type: "error", message: "AI 응답을 완료하지 못했습니다. 다시 시도해 주세요." });
              return;
            }
          }

          if (!completed) {
            send({ type: "error", message: "AI 응답이 완료되기 전에 연결이 종료됐습니다. 다시 시도해 주세요." });
            return;
          }
          if (!responseText.trim()) {
            send({ type: "error", message: "AI가 답변을 생성하지 못했습니다. 다시 시도해 주세요." });
            return;
          }
          if (persistence.persist && persistence.supabase) {
            send({ type: "saving" });
            const { error } = await persistence.supabase.rpc("save_ai_exchange", {
              p_conversation_id: persistence.conversationId,
              p_request_id: persistence.requestId,
              p_user_message_id: persistence.userMessageId,
              p_assistant_message_id: persistence.assistantMessageId,
              p_user_content: persistence.content,
              p_assistant_content: responseText,
              p_mode: mode,
              p_title: persistence.title,
              p_regenerate: persistence.regenerate,
              p_conversation_mode: persistence.conversationMode,
            });
            if (error) {
              send({ type: "error", message: "답변은 생성됐지만 대화 저장을 완료하지 못했습니다. 다시 시도해 주세요." });
              return;
            }
            persisted = true;
          }
          await recordAiUsage(reservation, model, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0, "completed");
          usageRecorded = true;
          send({ type: "done" });
        } catch {
          send({ type: "error", message: "AI 응답 중 연결이 끊겼습니다. 다시 시도해 주세요." });
        } finally {
          if (!usageRecorded) {
            try {
              await recordAiUsage(reservation, model, usage?.inputTokens ?? 0, usage?.outputTokens ?? 0, "failed");
            } catch {
              send({ type: "error", message: "응답 상태와 사용량을 기록하지 못했습니다. 관리자에게 문의해 주세요." });
            }
          }
          if (persistence.persist && !persisted && persistence.supabase) {
            await persistence.supabase
              .from("ai_request_keys")
              .delete()
              .eq("conversation_id", persistence.conversationId)
              .eq("request_id", persistence.requestId);
          }
          if (!cancelled) controller.close();
        }
      })();
    },
    cancel() {
      cancelled = true;
      abortController.abort();
    },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isAiConfigured()) {
    return jsonError(503, "AI 연결 설정이 완료되지 않았습니다. OPENAI_API_KEY와 OPENAI_MODEL을 설정해 주세요.");
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 100_000) {
    return jsonError(413, "요청 크기가 허용된 한도를 초과했습니다.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "요청 내용을 읽을 수 없습니다.");
  }

  const input = parseChatInput(body);
  if (!input) {
    return jsonError(400, "질문이나 대화 형식이 올바르지 않거나 허용된 길이를 초과했습니다.");
  }

  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const conversationId = input.conversationId ?? crypto.randomUUID();
  const requestId = input.requestId ?? crypto.randomUUID();
  const userMessageId = input.userMessageId ?? crypto.randomUUID();
  const assistantMessageId = input.assistantMessageId ?? crypto.randomUUID();
  const selectedMode = input.mode === "auto" ? routeAiMode(input.message) : input.mode;
  const title = input.message.slice(0, 42);
  let contextHistory = input.history;

  if (user && supabase) {
    const { error: conversationError } = await supabase.from("ai_conversations").upsert(
      { id: conversationId, user_id: user.id, title, mode: input.mode, updated_at: new Date().toISOString() },
      { onConflict: "id", ignoreDuplicates: true },
    );
    if (conversationError) return jsonError(503, "대화를 준비하지 못했습니다. 다시 시도해 주세요.");

    const { error: keyError } = await supabase.from("ai_request_keys").insert({
      conversation_id: conversationId,
      request_id: requestId,
      user_id: user.id,
    });
    if (keyError) {
      if ("code" in keyError && keyError.code === "23505") {
        return jsonError(409, "이미 처리 중이거나 완료된 요청입니다.");
      }
      return jsonError(503, "중복 요청 방지 기능을 사용할 수 없습니다. 다시 시도해 주세요.");
    }
    let before: string | null = null;
    if (input.regenerate) {
      if (!input.userMessageId) {
        await supabase.from("ai_request_keys").delete().eq("conversation_id", conversationId).eq("request_id", requestId);
        return jsonError(400, "다시 생성할 사용자 메시지를 확인할 수 없습니다.");
      }
      const { data: targetMessage, error: targetError } = await supabase
        .from("ai_messages")
        .select("created_at")
        .eq("id", input.userMessageId)
        .eq("conversation_id", conversationId)
        .eq("role", "user")
        .maybeSingle();
      if (targetError || !targetMessage) {
        await supabase.from("ai_request_keys").delete().eq("conversation_id", conversationId).eq("request_id", requestId);
        return jsonError(404, "다시 생성할 사용자 메시지를 찾을 수 없습니다.");
      }
      before = targetMessage.created_at;
    }

    let historyQuery = supabase
      .from("ai_messages")
      .select("role,content,status")
      .eq("conversation_id", conversationId)
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    if (before) historyQuery = historyQuery.lt("created_at", before);
    const { data: savedMessages, error: historyError } = await historyQuery.limit(maxHistoryLength);
    if (historyError) {
      await supabase.from("ai_request_keys").delete().eq("conversation_id", conversationId).eq("request_id", requestId);
      return jsonError(503, "이전 대화 내용을 불러오지 못했습니다. 다시 시도해 주세요.");
    }
    let historyCharacters = 0;
    const recentMessages = (savedMessages ?? []).filter((item) => {
      const maxLength = item.role === "user" ? maxMessageLength : maxHistoryMessageLength;
      if (item.content.length > maxLength || historyCharacters + item.content.length > maxHistoryCharacters) return false;
      historyCharacters += item.content.length;
      return true;
    });
    contextHistory = recentMessages
      .reverse()
      .map((item) => ({ role: item.role as "user" | "assistant", content: item.content }));
  }

  const usage = await reserveAiRequest(request, user?.id ?? null);
  if (!usage.ok) {
    if (user && supabase) {
      await supabase.from("ai_request_keys").delete().eq("conversation_id", conversationId).eq("request_id", requestId);
    }
    return jsonError(usage.status, usage.message);
  }

  const client = createOpenAiClient();
  const model = getAiModel();
  if (!client || !model) {
    if (user && supabase) await supabase.from("ai_request_keys").delete().eq("conversation_id", conversationId).eq("request_id", requestId);
    return jsonError(503, "AI 연결 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.");
  }

  try {
    const abortController = new AbortController();
    if (request.signal.aborted) abortController.abort();
    else request.signal.addEventListener("abort", () => abortController.abort(), { once: true });

    const upstream = await client.responses.create(
      {
        model,
        instructions: getAiInstructions(selectedMode),
        input: [...contextHistory, { role: "user" as const, content: input.message }],
        max_output_tokens: 1_200,
        store: false,
        stream: true,
      },
      { signal: abortController.signal },
    );

    return new Response(createEventStream(upstream, selectedMode, usage.reservation, model, abortController, {
      supabase,
      conversationId,
      requestId,
      userMessageId,
      assistantMessageId,
      regenerate: input.regenerate === true,
      conversationMode: input.mode,
      content: input.message,
      title,
      persist: Boolean(user),
    }), {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/event-stream; charset=utf-8",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (user && supabase) await supabase.from("ai_request_keys").delete().eq("conversation_id", conversationId).eq("request_id", requestId);
    const status = getStatusCode(error);
    const message = apiErrorMessage(status, getErrorCode(error));
    return jsonError(status === 429 ? 429 : status === 400 ? 400 : 502, message);
  }
}
