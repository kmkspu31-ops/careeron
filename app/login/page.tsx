"use client";

import { ArrowLeft, BriefcaseBusiness, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [notice, setNotice] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("계정 인증 기능은 아직 연결되지 않았습니다. 입력한 정보는 전송되거나 저장되지 않습니다.");
  }
  return <div className="content-width flex min-h-[calc(100vh-160px)] items-center justify-center"><div className="app-surface w-full max-w-md rounded-2xl p-6 sm:p-8"><Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-blue-600"><ArrowLeft size={14} /> 홈으로</Link><div className="mt-6 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white"><BriefcaseBusiness size={21} /></div><h2 className="mt-5 text-2xl font-bold">다시 만나서 반가워요</h2><p className="mt-2 text-sm text-muted">CAREERON 계정으로 커리어 여정을 이어가세요.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-semibold">이메일</span><span className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)] px-3"><Mail size={16} className="text-muted" /><input required type="email" placeholder="name@example.com" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></span></label><label className="block"><span className="mb-1.5 block text-xs font-semibold">비밀번호</span><input required type="password" placeholder="비밀번호 입력" className="h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-blue-500" /></label><button type="submit" className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700">로그인</button>{notice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{notice}</p>}</form><div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-[var(--border)]" />또는<span className="h-px flex-1 bg-[var(--border)]" /></div><button onClick={() => setNotice("회원가입 기능은 서비스 인증 연동 후 제공됩니다.")} className="h-11 w-full rounded-lg border border-[var(--border)] text-sm font-semibold transition hover:bg-[var(--surface-subtle)]">새 계정 만들기</button><p className="mt-5 text-center text-[11px] leading-5 text-muted">로그인과 회원가입은 현재 미리보기용 화면이며 실제 계정 처리는 되지 않습니다.</p></div></div>;
}
