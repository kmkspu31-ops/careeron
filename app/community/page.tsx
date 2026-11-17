"use client";

import { Eye, MessageCircle, PenLine, Search, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ActionButton } from "@/components/common/action-button";
import { EmptyState, PageHeading, SectionHeading, Surface, Tag } from "@/components/common/ui";

const posts = [
  { id: "career-start", category: "진로 고민", title: "첫 직무를 고를 때 가장 중요하게 본 기준은 무엇인가요?", author: "새싹러너", date: "11.17", views: 128, comments: 18, likes: 32, popular: true },
  { id: "study-routine", category: "취업 준비", title: "자격증 공부 루틴을 어떻게 유지하고 계신가요?", author: "차근차근", date: "11.16", views: 96, comments: 12, likes: 21, popular: true },
  { id: "portfolio-tips", category: "포트폴리오", title: "프로젝트 경험이 적을 때 포트폴리오 구성 팁", author: "design-note", date: "11.15", views: 82, comments: 9, likes: 17, popular: false },
  { id: "interview", category: "면접 후기", title: "면접에서 협업 경험 질문에는 어떻게 답하면 좋을까요?", author: "취준일기", date: "11.14", views: 63, comments: 7, likes: 14, popular: false },
];

export default function CommunityPage() {
  const [category, setCategory] = useState("전체");
  const [query, setQuery] = useState("");
  const visiblePosts = useMemo(() => posts.filter((post) => (category === "전체" || post.category === category) && (!query.trim() || `${post.title} ${post.category} ${post.author}`.includes(query.trim()))), [category, query]);
  const categories = ["전체", "진로 고민", "취업 준비", "포트폴리오", "면접 후기", "자유 게시판"];

  return <div className="content-width"><PageHeading eyebrow="COMMUNITY" title="커리어 고민을 함께 나눠요" description="진로와 취업 준비 경험을 나누는 커뮤니티 공간입니다. 현재 게시글은 예시이며 작성 기능은 준비 중입니다." action={<ActionButton message="게시글 작성 기능은 준비 중입니다." className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><PenLine size={15} /> 글쓰기</ActionButton>} />
    <div className="app-surface mb-5 rounded-2xl p-4"><label className="flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3"><Search size={16} className="text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="게시글 검색" placeholder="게시글, 카테고리, 작성자 검색" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" /></label><div className="thin-scrollbar mt-3 flex gap-2 overflow-auto pb-1">{categories.map((item) => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold ${category === item ? "border-blue-600 bg-blue-600 text-white" : "border-[var(--border)] text-muted hover:border-blue-300"}`}>{item}</button>)}</div></div>
    <div className="grid gap-6 xl:grid-cols-[1fr_300px]"><section><SectionHeading title="최신 게시글" description={`검색 결과 ${visiblePosts.length}개 · 예시 게시글`} />{visiblePosts.length ? <Surface className="divide-y divide-[var(--border)]">{visiblePosts.map((post) => <Link key={post.id} href={`/community/${post.id}`} className="block p-4 transition hover:bg-[var(--surface-subtle)] sm:p-5"><div className="flex items-center gap-2"><Tag tone={post.popular ? "blue" : "gray"}>{post.category}</Tag>{post.popular && <Tag tone="amber">인기</Tag>}<span className="ml-auto text-[11px] text-muted">{post.date}</span></div><h3 className="mt-3 font-semibold">{post.title}</h3><div className="mt-3 flex items-center justify-between"><span className="text-xs text-muted">{post.author} · 예시 작성자</span><span className="flex gap-3 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><Eye size={13} />{post.views}</span><span className="inline-flex items-center gap-1"><MessageCircle size={13} />{post.comments}</span><span className="inline-flex items-center gap-1"><ThumbsUp size={13} />{post.likes}</span></span></div></Link>)}</Surface> : <EmptyState title="게시글을 찾을 수 없습니다" description="다른 검색어나 카테고리를 선택해보세요." />}<div className="mt-5 flex justify-center"><button disabled className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold text-muted opacity-60">더 불러오기</button></div></section>
    <aside className="space-y-5"><section><SectionHeading title="이번 주 인기" /><Surface className="p-4"><ol className="space-y-4">{posts.filter((post) => post.popular).map((post, index) => <li key={post.id}><Link href={`/community/${post.id}`} className="flex gap-3"><span className="font-bold text-blue-600">{String(index + 1).padStart(2, "0")}</span><span className="text-sm font-medium leading-5 hover:text-blue-600">{post.title}</span></Link></li>)}</ol></Surface></section><Surface className="bg-blue-50 p-5 dark:bg-blue-950/30"><h3 className="font-bold">함께 지켜요</h3><p className="mt-2 text-xs leading-5 text-muted">서로를 존중하고, 개인정보와 민감한 정보를 게시하지 않도록 유의해주세요.</p></Surface></aside></div>
  </div>;
}
