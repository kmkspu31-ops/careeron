import { LoadingSkeleton } from "@/components/common/feedback";

export default function Loading() {
  return <div className="content-width"><div className="mb-7"><div className="h-3 w-32 animate-pulse rounded bg-[var(--surface-subtle)]" /><div className="mt-4 h-8 w-64 animate-pulse rounded bg-[var(--surface-subtle)]" /><div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-[var(--surface-subtle)]" /></div><LoadingSkeleton rows={3} /></div>;
}
