"use client";

import { ArrowLeft, Bookmark, CheckCircle2, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ButtonLink, PageHeading, SectionHeading, Surface, Tag } from "@/components/common/ui";

export function DetailPage({
  eyebrow,
  title,
  description,
  meta,
  tags,
  backHref,
  backLabel,
  sections,
}: {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  tags: string[];
  backHref: string;
  backLabel: string;
  sections: { title: string; body: string }[];
}) {
  const [bookmarked, setBookmarked] = useState(false);
  const [notice, setNotice] = useState("");

  async function sharePage() {
    try {
      await window.navigator.clipboard.writeText(window.location.href);
      setNotice("페이지 링크를 복사했습니다.");
    } catch {
      setNotice("이 브라우저에서는 링크를 복사할 수 없습니다.");
    }
  }

  return (
    <div className="content-width">
      <Link href={backHref} className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-blue-600"><ArrowLeft size={14} />{backLabel}로 돌아가기</Link>
      <PageHeading eyebrow={eyebrow} title={title} description={description} action={<div className="flex gap-2"><button aria-label={bookmarked ? "즐겨찾기 해제" : "즐겨찾기"} aria-pressed={bookmarked} onClick={() => { setBookmarked(!bookmarked); setNotice(bookmarked ? "즐겨찾기에서 해제했습니다." : "미리보기 세션에 즐겨찾기했습니다."); }} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-muted hover:bg-[var(--surface-subtle)]"><Bookmark size={17} fill={bookmarked ? "currentColor" : "none"} /></button><button aria-label="공유" onClick={sharePage} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border)] text-muted hover:bg-[var(--surface-subtle)]"><Share2 size={17} /></button></div>} />
      {notice && <p role="status" className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">{notice}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {sections.map((section) => <section key={section.title}><SectionHeading title={section.title} /><Surface className="p-5 sm:p-6"><p className="text-sm leading-7 text-muted">{section.body}</p></Surface></section>)}
          <Surface className="p-5"><div className="flex gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-blue-600" /><p className="text-xs leading-5 text-muted">이 상세 화면은 프로젝트 1단계 UI 미리보기입니다. 실제 정보와 기능은 데이터 연동 후 제공됩니다.</p></div></Surface>
        </div>
        <aside><Surface className="p-5"><p className="text-xs font-semibold text-muted">기본 정보</p><p className="mt-3 text-sm font-medium">{meta}</p><div className="mt-4 flex flex-wrap gap-2">{tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><div className="mt-5 border-t border-[var(--border)] pt-4"><ButtonLink href={backHref}>목록에서 더 둘러보기</ButtonLink></div></Surface></aside>
      </div>
    </div>
  );
}
