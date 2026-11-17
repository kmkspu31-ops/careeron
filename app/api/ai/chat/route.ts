import OpenAI from "openai";
import { createOpenAiClient } from "@/lib/ai/openai";
import { getAiInstructions } from "@/lib/ai/prompts";
import { getAiModel, isAiConfigured } from "@/lib/ai/model-config";
import { routeAiMode } from "@/lib/ai/mode-router";
import { AI_MODE_IDS, type AiExpertMode, type AiMessage, type AiMode } from "@/lib/ai/types";
import { recordAiUsage, reserveAiRequest } from "@/lib/ai/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

const encoder = new TextEncoder();
const maxMessageLength = 6_000;
const maxHistoryMessageLength = 12_000;
const maxHistoryLength = 20;
const maxHistoryCharacters = 24_000;

type ChatInput = {
  mode: AiMode;
  message: string;
  history: Array<Pick<AiMessage, "role" | "content">>;
};

type StreamPayload =
  | { type: "meta"; mode: AiExpertMode }
  | { type: "delta"; text: string }
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

  if (typeof mode !== "string" || !AI_MODE_IDS.includes(mode as AiMode)) return null;
  if (typeof message !== "string" || !message.trim() || message.length > maxMessageLength) return null;
  if (!Array.isArray(history) || history.length > maxHistoryLength) return null;

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

  return { mode: mode as AiMode, message: message.trim(), history: validatedHistory };
}

function getStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("status" in error)) return null;
  return typeof error.status === "number" ? error.status : null;
}

function apiErrorMessage(status: number | null): string {
  if (status === 401 || status === 403) return "AI 서비스 설정을 확인할 수 없습니다. 관리자에게 문의해 주세요.";
  if (status === 429) return "AI 요청이 일시적으로 많습니다. 잠시 후 다시 시도해 주세요.";
  if (status === 400) return "AI가 요청을 처리하지 못했습니다. 질문을 조금 바꿔 다시 시도해 주세요.";
  return "AI 응답을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function createEventStream(
  upstream: AsyncIterable<OpenAI.Responses.ResponseStreamEvent>,
  mode: AiExpertMode,
  reservation: { subjectHash: string; store: "supabase" | "memory" },
  model: string,
  abortController: AbortController,
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
        try {
          send({ type: "meta", mode });
          for await (const event of upstream) {
            if (event.type === "response.output_text.delta") {
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
          if (usage) {
            try {
              await recordAiUsage(reservation, model, usage.inputTokens, usage.outputTokens);
            } catch {
              send({
                type: "error",
                message: "답변은 생성됐지만 사용량 기록을 완료하지 못했습니다. 관리자에게 문의해 주세요.",
              });
              return;
            }
          }
          send({ type: "done" });
        } catch {
          send({ type: "error", message: "AI 응답 중 연결이 끊겼습니다. 다시 시도해 주세요." });
        } finally {
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

  const usage = await reserveAiRequest(request);
  if (!usage.ok) return jsonError(usage.status, usage.message);

  const client = createOpenAiClient();
  const model = getAiModel();
  if (!client || !model) {
    return jsonError(503, "AI 연결 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.");
  }

  const mode = input.mode === "auto" ? routeAiMode(input.message) : input.mode;

  try {
    const abortController = new AbortController();
    if (request.signal.aborted) abortController.abort();
    else request.signal.addEventListener("abort", () => abortController.abort(), { once: true });

    const upstream = await client.responses.create(
      {
        model,
        instructions: getAiInstructions(mode),
        input: [...input.history, { role: "user" as const, content: input.message }],
        max_output_tokens: 1_200,
        store: false,
        stream: true,
      },
      { signal: abortController.signal },
    );

    return new Response(createEventStream(upstream, mode, usage.reservation, model, abortController), {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/event-stream; charset=utf-8",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const status = getStatusCode(error);
    const message = apiErrorMessage(status);
    return jsonError(status === 429 ? 429 : status === 400 ? 400 : 502, message);
  }
}
