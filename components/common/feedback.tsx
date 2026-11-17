"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-label="불러오는 중" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => <div key={index} className="app-surface animate-pulse rounded-2xl p-5"><div className="h-3 w-24 rounded bg-[var(--surface-subtle)]" /><div className="mt-4 h-5 w-2/3 rounded bg-[var(--surface-subtle)]" /><div className="mt-3 h-3 w-full rounded bg-[var(--surface-subtle)]" /><div className="mt-2 h-3 w-4/5 rounded bg-[var(--surface-subtle)]" /></div>)}
    </div>
  );
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav aria-label="페이지 이동" className="flex items-center justify-center gap-2">
      <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label="이전 페이지" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-muted hover:bg-[var(--surface-subtle)] disabled:opacity-40"><ChevronLeft size={16} /></button>
      <span className="px-2 text-xs text-muted"><strong className="text-[var(--foreground)]">{currentPage}</strong> / {totalPages}</span>
      <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label="다음 페이지" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-muted hover:bg-[var(--surface-subtle)] disabled:opacity-40"><ChevronRight size={16} /></button>
    </nav>
  );
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-3 text-xs font-medium text-white shadow-lg lg:bottom-6">{message}</div>;
}
