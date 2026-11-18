import { NextResponse } from "next/server";
import { AI_MODE_IDS, type AiConversation, type AiExpertMode, type AiMessage, type AiMode } from "@/lib/ai/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const expertModes = ["general", "career", "resume", "interview", "job-analysis", "certification", "roadmap"] as const;

function isMode(value: unknown): value is AiMode {
  return typeof value === "string" && AI_MODE_IDS.includes(value as AiMode);
}

export async function GET(): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ authenticated: false, conversations: [] });

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return NextResponse.json({ authenticated: false, conversations: [] });

  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id,title,mode,updated_at,ai_messages(id,role,content,mode,created_at,status)")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: "저장된 대화를 불러오지 못했습니다." }, { status: 503 });

  const conversations: AiConversation[] = (data ?? []).map((row) => {
    const messages = (row.ai_messages ?? [])
      .filter((message) => message.status === "completed")
      .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
      .map((message): AiMessage => ({
        id: message.id,
        role: message.role,
        content: message.content,
        mode: message.mode as AiExpertMode,
      }));
    return {
      id: row.id,
      title: row.title,
      mode: isMode(row.mode) ? row.mode : "auto",
      messages,
      updatedAt: Date.parse(row.updated_at),
    };
  });
  return NextResponse.json({ authenticated: true, conversations });
}

export async function POST(request: Request): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 내용을 읽을 수 없습니다." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("conversations" in body) || !Array.isArray(body.conversations) || body.conversations.length > 25) {
    return NextResponse.json({ error: "가져올 대화 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const conversations: AiConversation[] = [];
  let totalCharacters = 0;
  for (const candidate of body.conversations) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return NextResponse.json({ error: "대화 형식이 올바르지 않습니다." }, { status: 400 });
    }
    const item = candidate as Record<string, unknown>;
    if (
      typeof item.id !== "string" || !uuidPattern.test(item.id) ||
      typeof item.title !== "string" || item.title.length > 80 ||
      !isMode(item.mode) || !Array.isArray(item.messages) || item.messages.length > 20
    ) return NextResponse.json({ error: "대화 형식이 올바르지 않습니다." }, { status: 400 });

    const messages: AiMessage[] = [];
    for (const candidateMessage of item.messages) {
      if (!candidateMessage || typeof candidateMessage !== "object" || Array.isArray(candidateMessage)) {
        return NextResponse.json({ error: "메시지 형식이 올바르지 않습니다." }, { status: 400 });
      }
      const message = candidateMessage as Record<string, unknown>;
      if (
        typeof message.id !== "string" || !uuidPattern.test(message.id) ||
        (message.role !== "user" && message.role !== "assistant") ||
        typeof message.content !== "string" || message.content.length > 12_000 ||
        (message.mode !== undefined && (typeof message.mode !== "string" || !expertModes.includes(message.mode as AiExpertMode)))
      ) return NextResponse.json({ error: "메시지 형식이 올바르지 않습니다." }, { status: 400 });
      if (message.role === "assistant" && (message.status === "failed" || message.status === "streaming")) continue;
      totalCharacters += message.content.length;
      if (totalCharacters > 100_000) return NextResponse.json({ error: "가져오기 용량을 초과했습니다." }, { status: 413 });
      messages.push({
        id: message.id,
        role: message.role,
        content: message.content,
        mode: typeof message.mode === "string" ? message.mode as AiExpertMode : "general",
      });
    }
    conversations.push({
      id: item.id,
      title: item.title,
      mode: item.mode,
      updatedAt: Date.now(),
      messages,
    });
  }

  const imported: AiConversation[] = [];
  for (const conversation of conversations) {
    const { data: wasImported, error } = await supabase.rpc("import_ai_conversation", {
      p_id: conversation.id,
      p_title: conversation.title,
      p_mode: conversation.mode,
      p_messages: conversation.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        mode: message.mode ?? "general",
      })),
    });
    if (error || typeof wasImported !== "boolean") {
      return NextResponse.json({ error: "대화를 가져오지 못했습니다. 다시 시도해 주세요." }, { status: 503 });
    }
    if (wasImported) imported.push(conversation);
  }

  return NextResponse.json({ conversations: imported });
}

export async function PATCH(request: Request): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 내용을 읽을 수 없습니다." }, { status: 400 });
  }
  if (
    !body || typeof body !== "object" || !("id" in body) || !("title" in body) ||
    typeof body.id !== "string" || !uuidPattern.test(body.id) ||
    typeof body.title !== "string" || !body.title.trim() || body.title.length > 80
  ) return NextResponse.json({ error: "대화 제목이 올바르지 않습니다." }, { status: 400 });

  const { data, error } = await supabase
    .from("ai_conversations")
    .update({ title: body.title.trim(), updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "대화 제목을 변경하지 못했습니다." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "대화를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request): Promise<Response> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 내용을 읽을 수 없습니다." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string" || !uuidPattern.test(body.id)) {
    return NextResponse.json({ error: "대화 식별자가 올바르지 않습니다." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", body.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "대화를 삭제하지 못했습니다." }, { status: 503 });
  if (!data) return NextResponse.json({ error: "대화를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
