import "server-only";

import { createHmac } from "node:crypto";

type UsageReservation = {
  subjectHash: string;
  store: "supabase" | "memory";
};

export type UsageResult =
  | { ok: true; reservation: UsageReservation }
  | { ok: false; status: number; message: string };

type DailyUsage = { date: string; count: number };
const localUsage = new Map<string, DailyUsage>();

function getDailyLimit(): number | null {
  const value = Number(process.env.AI_DAILY_REQUEST_LIMIT);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function getSubjectHash(request: Request): string | null {
  const secret =
    process.env.AI_RATE_LIMIT_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();
  if (!secret) return null;

  const forwardedAddress =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local";
  return createHmac("sha256", secret).update(forwardedAddress).digest("hex");
}

async function callSupabaseRpc(
  name: string,
  body: Record<string, string | number>,
): Promise<Response | null> {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  return fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

export async function reserveAiRequest(request: Request): Promise<UsageResult> {
  const dailyLimit = getDailyLimit();
  const subjectHash = getSubjectHash(request);
  if (!dailyLimit || !subjectHash) {
    return {
      ok: false,
      status: 503,
      message: "AI 사용량 보호 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.",
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (supabaseUrl && serviceKey) {
    let response: Response | null;
    try {
      response = await callSupabaseRpc("reserve_ai_daily_request", {
        p_subject_hash: subjectHash,
        p_daily_limit: dailyLimit,
      });
    } catch {
      return {
        ok: false,
        status: 503,
        message: "사용량 확인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    if (!response?.ok) {
      return {
        ok: false,
        status: 503,
        message: "사용량 확인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
    const requestCount: unknown = await response.json().catch(() => null);
    if (typeof requestCount !== "number") {
      return {
        ok: false,
        status: 503,
        message: "사용량 확인 응답을 처리할 수 없습니다. 관리자에게 문의해 주세요.",
      };
    }
    if (requestCount === 0) {
      return {
        ok: false,
        status: 429,
        message: "오늘의 AI 상담 이용 한도에 도달했습니다. 내일 다시 이용해 주세요.",
      };
    }
    return { ok: true, reservation: { subjectHash, store: "supabase" } };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      status: 503,
      message: "서비스 사용량 보호를 위한 Supabase 설정이 필요합니다.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const current = localUsage.get(subjectHash);
  if (current?.date === today && current.count >= dailyLimit) {
    return {
      ok: false,
      status: 429,
      message: "오늘의 AI 상담 이용 한도에 도달했습니다. 내일 다시 이용해 주세요.",
    };
  }
  localUsage.set(subjectHash, {
    date: today,
    count: current?.date === today ? current.count + 1 : 1,
  });
  return { ok: true, reservation: { subjectHash, store: "memory" } };
}

export async function recordAiUsage(
  reservation: UsageReservation,
  model: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  if (reservation.store === "memory") return;

  const response = await callSupabaseRpc("record_ai_usage", {
    p_subject_hash: reservation.subjectHash,
    p_model: model,
    p_input_tokens: Math.max(0, inputTokens),
    p_output_tokens: Math.max(0, outputTokens),
  });
  if (!response?.ok) throw new Error("Usage recording failed.");
}
