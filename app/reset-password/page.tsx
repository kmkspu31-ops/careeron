"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
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
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage("재설정 링크가 만료됐거나 유효하지 않습니다. 재설정 이메일을 다시 요청해 주세요.");
        return;
      }
      setMessage("비밀번호를 변경했습니다.");
    } catch {
      setMessage("비밀번호 변경 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="content-width flex min-h-[calc(100vh-160px)] items-center justify-center"><section className="app-surface w-full max-w-md rounded-2xl p-6 sm:p-8"><h1 className="text-2xl font-bold">새 비밀번호 설정</h1><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-semibold">새 비밀번호<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm font-normal" /></label><button disabled={busy} className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:opacity-60">{busy ? "변경 중…" : "비밀번호 변경"}</button></form>{message && <p role="status" className="mt-4 text-xs leading-5 text-muted">{message} {message === "비밀번호를 변경했습니다." && <Link href="/login" className="font-semibold text-blue-700 dark:text-blue-300">로그인하기</Link>}</p>}</section></div>;
}
