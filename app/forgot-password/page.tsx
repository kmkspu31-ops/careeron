"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("비밀번호 재설정을 사용하려면 Supabase 설정이 필요합니다.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    setMessage(error ? "재설정 이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요." : "계정이 존재하는 경우 비밀번호 재설정 이메일을 보냈습니다.");
  }

  return <div className="content-width flex min-h-[calc(100vh-160px)] items-center justify-center"><section className="app-surface w-full max-w-md rounded-2xl p-6 sm:p-8"><Link href="/login" className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">← 로그인으로 돌아가기</Link><h1 className="mt-6 text-2xl font-bold">비밀번호 재설정</h1><p className="mt-2 text-sm text-muted">가입한 이메일로 재설정 링크를 보내드립니다.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-semibold">이메일<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm font-normal" /></label><button disabled={busy} className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:opacity-60">{busy ? "전송 중…" : "재설정 이메일 보내기"}</button></form>{message && <p role="status" className="mt-4 text-xs leading-5 text-muted">{message}</p>}</section></div>;
}
