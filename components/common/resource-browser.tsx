"use client";

import { Bookmark, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, Tag } from "@/components/common/ui";

export type BrowseItem = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  meta: string;
  tags: string[];
  href: string;
  category: string;
};

export function ResourceBrowser({
  items,
  categories,
  searchPlaceholder,
  initialQuery = "",
  emptyTitle = "검색 결과가 없습니다",
  emptyDescription = "다른 검색어나 필터를 선택해보세요.",
}: {
  items: BrowseItem[];
  categories: string[];
  searchPlaceholder: string;
  initialQuery?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [saved, setSaved] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "전체" || item.category === selectedCategory || item.tags.includes(selectedCategory) || item.meta.includes(selectedCategory);
      const searchable = `${item.title} ${item.eyebrow} ${item.description} ${item.meta} ${item.tags.join(" ")}`.toLocaleLowerCase();
      return matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [items, query, selectedCategory]);

  return (
    <div>
      <div className="app-surface rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <label className="flex h-11 items-center gap-3 rounded-lg border border-[var(--border)] px-3 focus-within:border-blue-500">
            <Search size={17} className="text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
            <span className="hidden items-center gap-1 text-xs text-muted sm:flex"><SlidersHorizontal size={14} /> 검색</span>
          </label>
          <div className="thin-scrollbar flex gap-2 overflow-x-auto pb-1" role="group" aria-label="카테고리 필터">
            {categories.map((category) => (
              <button key={category} type="button" onClick={() => setSelectedCategory(category)} aria-pressed={selectedCategory === category} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${selectedCategory === category ? "border-blue-600 bg-blue-600 text-white" : "border-[var(--border)] text-muted hover:border-blue-300 hover:text-blue-600"}`}>
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      {notice && <p role="status" className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-200">{notice}</p>}
      <div className="mt-5 flex items-center justify-between text-xs text-muted"><span>검색 결과 <strong className="text-[var(--foreground)]">{visibleItems.length}</strong>개</span><span>예시 데이터</span></div>
      {visibleItems.length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((item) => (
            <article key={item.id} className="app-surface group relative flex min-h-52 flex-col rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800">
              <div className="flex items-start justify-between gap-2"><span className="text-xs font-semibold text-blue-600 dark:text-blue-300">{item.eyebrow}</span><button type="button" onClick={() => { setSaved((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]); setNotice("즐겨찾기는 현재 화면에서만 표시되며 계정이나 브라우저에 저장되지 않습니다."); }} aria-label={saved.includes(item.id) ? `${item.title} 즐겨찾기 해제` : `${item.title} 즐겨찾기`} aria-pressed={saved.includes(item.id)} className={`rounded-lg p-2 transition ${saved.includes(item.id) ? "text-blue-600" : "text-muted hover:bg-[var(--surface-subtle)]"}`}><Bookmark size={17} fill={saved.includes(item.id) ? "currentColor" : "none"} /></button></div>
              <Link href={item.href} className="mt-2 block rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"><h3 className="text-base font-bold group-hover:text-blue-700 dark:group-hover:text-blue-300">{item.title}</h3><p className="mt-2 line-clamp-2 text-sm text-muted">{item.description}</p></Link>
              <p className="mt-3 text-xs text-muted">{item.meta}</p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-4">{item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
            </article>
          ))}
        </div>
      ) : <div className="mt-5"><EmptyState title={emptyTitle} description={emptyDescription} /></div>}
    </div>
  );
}
