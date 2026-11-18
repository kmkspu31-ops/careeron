"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("회원가입을 사용하려면 Supabase URL과 공개 키 설정이 필요합니다.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/mypage`,
      },
    });
    setBusy(false);
    setMessage(error
      ? "회원가입을 완료하지 못했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요."
      : "인증 이메일을 보냈습니다. 이메일의 인증 링크를 열어 가입을 완료해 주세요.");
  }

  return <div className="content-width flex min-h-[calc(100vh-160px)] items-center justify-center"><section className="app-surface w-full max-w-md rounded-2xl p-6 sm:p-8"><Link href="/login" className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">← 로그인으로 돌아가기</Link><h1 className="mt-6 text-2xl font-bold">CAREERON 계정 만들기</h1><p className="mt-2 text-sm text-muted">회원별 대화 저장은 선택 사항이며, 가입을 강요하지 않습니다.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-xs font-semibold">이름<input required maxLength={80} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm font-normal" /></label><label className="block text-xs font-semibold">이메일<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm font-normal" /></label><label className="block text-xs font-semibold">비밀번호<input required type="password" minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm font-normal" /><span className="mt-1 block font-normal text-muted">8자 이상</span></label><button disabled={busy} className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:opacity-60">{busy ? "가입 처리 중…" : "이메일 인증 후 가입"}</button></form>{message && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">{message}</p>}</section></div>;
}
