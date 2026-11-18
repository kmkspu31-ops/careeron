"use client";

import { Bookmark, Mail, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading, SectionHeading, Surface, Tag } from "@/components/common/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Account = { id: string; email: string; fullName: string };

export default function MyPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<"loading" | "guest" | "member" | "error">("loading");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/account", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          setStatus("guest");
          return;
        }
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || !("email" in payload) || !("fullName" in payload) || !("id" in payload)) {
          throw new Error("account");
        }
        const profile = payload as Account;
        setAccount(profile);
        setFullName(profile.fullName);
        setStatus("member");
      })
      .catch(() => {
        setStatus("error");
        setMessage("계정 정보를 불러오지 못했습니다. Supabase 연결 설정을 확인해 주세요.");
      });
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName }),
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const error = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "프로필을 저장하지 못했습니다.";
        setMessage(error);
      } else {
        setAccount((current) => current ? { ...current, fullName: fullName.trim() } : current);
        setMessage("프로필을 저장했습니다.");
      }
    } catch {
      setMessage("프로필을 저장하지 못했습니다. 연결 상태를 확인해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("계정을 삭제할까요? 계정과 연결된 AI 대화도 함께 영구 삭제됩니다.")) return;
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setMessage(payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "계정을 삭제하지 못했습니다.");
        return;
      }
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch {
      setMessage("계정을 삭제하지 못했습니다. 연결 상태를 확인해 주세요.");
    }
  }

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase 설정을 확인해 주세요.");
      return;
    }
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setMessage("로그아웃하지 못했습니다. 다시 시도해 주세요.");
        return;
      }
    } catch {
      setMessage("로그아웃하지 못했습니다. 다시 시도해 주세요.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return <div className="content-width">
    <PageHeading eyebrow="MY CAREERON" title="나의 커리어 공간" description="계정과 회원별 AI 대화를 관리합니다." />
    <Surface className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-2xl font-bold text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"><UserRound size={28} /></span>
      <div className="flex-1">
        <div className="flex items-center gap-2"><h2 className="text-lg font-bold">{account?.fullName || (status === "loading" ? "확인 중…" : "비회원")}</h2><Tag>{status === "member" ? "회원" : status === "guest" ? "게스트" : "계정 상태 확인 중"}</Tag></div>
        <p className="mt-1 text-sm text-muted">{account?.email ?? "로그인하지 않아도 공개 정보와 AI 기능을 이용할 수 있습니다."}</p>
      </div>
      {status === "guest" && <div className="flex gap-2"><Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">로그인</Link><Link href="/signup" className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-center text-sm font-semibold">가입</Link></div>}
      {status === "member" && <button type="button" onClick={() => void signOut()} className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--surface-subtle)]">로그아웃</button>}
    </Surface>

    {status === "member" && account && <section className="section-gap">
      <SectionHeading title="계정 정보" description="프로필 수정과 계정 보안" />
      <Surface className="p-5 sm:p-6">
        <form onSubmit={saveProfile} className="max-w-xl space-y-4">
          <label className="block text-xs font-semibold">이름<input required maxLength={80} value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm font-normal" /></label>
          <div className="flex items-center gap-3 text-sm"><Mail size={16} className="text-muted" /><span className="text-muted">이메일</span><span>{account.email}</span></div>
          <div className="flex items-center gap-3 text-sm"><ShieldCheck size={16} className="text-muted" /><span className="text-muted">인증</span><span>이메일 계정</span></div>
          <div className="flex flex-wrap gap-3"><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "저장 중…" : "프로필 저장"}</button><button type="button" onClick={() => void deleteAccount()} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10">회원 탈퇴</button></div>
        </form>
      </Surface>
    </section>}

    <div className="section-gap grid gap-6 xl:grid-cols-2">
      <section><SectionHeading title="AI 대화" description="회원은 대화를 계정에 저장하고 기기 간에 동기화할 수 있습니다." /><Surface className="p-5"><p className="text-sm text-muted">{status === "member" ? "회원 대화는 AI 상담 화면에서 조회·검색·수정·삭제할 수 있습니다." : "비회원 대화는 저장에 동의한 경우 현재 브라우저에만 보관됩니다."}</p><Link href="/ai/career" className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">AI 상담 열기</Link></Surface></section>
      <section><SectionHeading title="즐겨찾기 및 환경 설정" description="계정에 연결된 데이터만 표시합니다." /><Surface className="flex items-start gap-3 p-5"><Bookmark size={18} className="mt-0.5 text-muted" /><p className="text-sm leading-6 text-muted">즐겨찾기, 알림, 포트폴리오 공개 설정의 회원별 저장은 아직 연결되지 않았습니다. 변경 내용을 저장한 것처럼 표시하지 않습니다.</p></Surface></section>
    </div>
    {(message || status === "error") && <p role="status" className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">{message}</p>}
  </div>;
}
