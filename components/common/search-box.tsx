"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function SearchBox({
  placeholder = "직업, 채용공고, 기업을 검색해보세요",
  compact = false,
}: {
  placeholder?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={`flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 ${compact ? "h-10" : "h-14"}`}
    >
      <Search className="shrink-0 text-muted" size={compact ? 17 : 20} />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="통합 검색"
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-muted"
      />
      {!compact && (
        <button className="hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 sm:block" type="submit">
          검색
        </button>
      )}
    </form>
  );
}
