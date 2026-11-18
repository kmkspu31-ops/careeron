"use client";

import { ArrowLeft, BriefcaseBusiness, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("error")) {
      setNotice("인증을 완료하지 못했습니다. 다시 시도해 주세요.");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setNotice("로그인 기능을 사용하려면 Supabase URL과 공개 키 설정이 필요합니다.");
      return;
    }

    setBusy(true);
    setNotice("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      setNotice(error.message.includes("Invalid login credentials")
        ? "이메일 또는 비밀번호를 확인해 주세요."
        : "로그인하지 못했습니다. 이메일 인증 상태를 확인하거나 잠시 후 다시 시도해 주세요.");
      return;
    }
    router.replace("/mypage");
    router.refresh();
  }

  return <div className="content-width flex min-h-[calc(100vh-160px)] items-center justify-center"><div className="app-surface w-full max-w-md rounded-2xl p-6 sm:p-8"><Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-blue-600"><ArrowLeft size={14} /> 홈으로</Link><div className="mt-6 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"><BriefcaseBusiness size={21} /></div><h2 className="mt-5 text-2xl font-bold">다시 만나서 반가워요</h2><p className="mt-2 text-sm text-muted">CAREERON 계정으로 커리어 여정을 이어가세요.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-semibold">이메일</span><span className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3"><Mail size={16} className="text-muted" /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></span></label><label className="block"><span className="mb-1.5 block text-xs font-semibold">비밀번호</span><input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호 입력" className="h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-blue-500" /></label><button type="submit" disabled={busy} className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{busy ? "로그인 중…" : "로그인"}</button>{notice && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{notice}</p>}</form><Link href="/forgot-password" className="mt-4 block text-center text-xs font-medium text-blue-700 hover:underline dark:text-blue-300">비밀번호를 잊으셨나요?</Link><div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-[var(--border)]" />또는<span className="h-px flex-1 bg-[var(--border)]" /></div><Link href="/signup" className="flex h-11 w-full items-center justify-center rounded-lg border border-[var(--border)] text-sm font-semibold transition hover:bg-[var(--surface-subtle)]">새 계정 만들기</Link><p className="mt-5 text-center text-[11px] leading-5 text-muted">대화 저장과 개인화는 로그인 후에만 사용할 수 있습니다. 비회원 AI 이용은 계속 열려 있습니다.</p></div></div>;
}
