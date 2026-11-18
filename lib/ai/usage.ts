import "server-only";

import { createHmac } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type UsageReservation = {
  subjectHash: string;
  userId: string | null;
  store: "supabase" | "memory";
};

export type UsageResult =
  | { ok: true; reservation: UsageReservation }
  | { ok: false; status: number; message: string };

type DailyUsage = { date: string; count: number; lastRequestedAt?: number };
const localUsage = new Map<string, DailyUsage>();

function getMinimumIntervalSeconds(): number {
  const value = Number(process.env.AI_MIN_REQUEST_INTERVAL_SECONDS);
  return Number.isSafeInteger(value) && value >= 1 ? value : 3;
}

function getDailyLimit(): number | null {
  const value = Number(process.env.AI_DAILY_REQUEST_LIMIT);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function getSubjectHash(request: Request, userId: string | null): string | null {
  const secret = process.env.AI_RATE_LIMIT_SECRET?.trim();
  if (!secret || secret.length < 32) return null;

  const subject = userId
    ? `user:${userId}`
    : `ip:${request.headers.get("x-real-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}`;
  return createHmac("sha256", secret).update(subject).digest("hex");
}

export async function reserveAiRequest(request: Request, userId: string | null): Promise<UsageResult> {
  const dailyLimit = getDailyLimit();
  const subjectHash = getSubjectHash(request, userId);
  if (!dailyLimit || !subjectHash) {
    return {
      ok: false,
      status: 503,
      message: "AI 사용량 보호 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.",
    };
  }

  const admin = createSupabaseAdminClient();
  if (admin) {
    let result: { data: number | null; error: unknown };
    try {
      result = await admin.rpc("reserve_ai_daily_request", {
        p_subject_hash: subjectHash,
        p_daily_limit: dailyLimit,
        p_min_interval_seconds: getMinimumIntervalSeconds(),
      });
    } catch {
      return {
        ok: false,
        status: 503,
        message: "사용량 확인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      };
    }

    if (result.error || typeof result.data !== "number") {
      return {
        ok: false,
        status: 503,
        message: "사용량 확인을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
    if (result.data === -1) {
      return {
        ok: false,
        status: 429,
        message: "요청 간격이 너무 짧습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
    if (result.data === 0) {
      return {
        ok: false,
        status: 429,
        message: "오늘의 AI 상담 이용 한도에 도달했습니다. 내일 다시 이용해 주세요.",
      };
    }
    return { ok: true, reservation: { subjectHash, userId, store: "supabase" } };
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
  const now = Date.now();
  if (current?.date === today && now - (current.lastRequestedAt ?? 0) < getMinimumIntervalSeconds() * 1_000) {
    return { ok: false, status: 429, message: "요청 간격이 너무 짧습니다. 잠시 후 다시 시도해 주세요." };
  }
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
    lastRequestedAt: now,
  });
  return { ok: true, reservation: { subjectHash, userId, store: "memory" } };
}

export async function recordAiUsage(
  reservation: UsageReservation,
  model: string,
  inputTokens: number,
  outputTokens: number,
  status: "completed" | "failed",
): Promise<void> {
  if (reservation.store === "memory") return;

  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase usage storage is not configured.");
  const { error } = await admin.rpc("record_ai_usage", {
    p_subject_hash: reservation.subjectHash,
    p_model: model,
    p_input_tokens: Math.max(0, inputTokens),
    p_output_tokens: Math.max(0, outputTokens),
    p_user_id: reservation.userId,
    p_status: status,
  });
  if (error) throw new Error("Usage recording failed.");
}
