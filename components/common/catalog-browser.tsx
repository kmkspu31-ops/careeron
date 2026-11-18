import Link from "next/link";
import { EmptyState, Tag } from "@/components/common/ui";
import type { CatalogFilters, CatalogPage, CatalogRecord, CatalogType, CatalogViewType } from "@/lib/catalog/types";
import { CATALOG_LABELS, CATALOG_TYPES } from "@/lib/catalog/types";

const paths: Record<CatalogType, string> = {
  job: "jobs",
  occupation: "occupations",
  skill: "skills",
  certification: "certificates",
  company: "companies",
  training: "training",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "확인 정보 없음";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "확인 정보 없음" : new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function getFieldValues(fields: Record<string, unknown>, limit: number): Array<[string, string]> {
  return Object.entries(fields)
    .filter(([key]) => !/bizno|registration|representative|ceo|phone|fax/i.test(key))
    .flatMap(([key, value]) => {
      if (typeof value === "string" && value.trim()) return [[key, value.trim()] as [string, string]];
      if (typeof value === "number" || typeof value === "boolean") return [[key, String(value)] as [string, string]];
      return [];
    })
    .slice(0, limit);
}

function sourceUrl(value: string | null | undefined): string | null {
  try {
    if (!value) return null;
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isStale(value: string): boolean {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) || Date.now() - date.valueOf() > 30 * 24 * 60 * 60 * 1000;
}

function pageHref(page: number, filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.kind) params.set("kind", filters.kind);
  if (filters.category) params.set("category", filters.category);
  if (filters.region) params.set("region", filters.region);
  params.set("page", String(page));
  return `?${params.toString()}`;
}

function CatalogCard({ record }: { record: CatalogRecord }) {
  const originalUrl = sourceUrl(record.source_url);
  const url = originalUrl ?? sourceUrl(record.source?.dataset_url);
  const details = getFieldValues(record.fields, 3);

  return (
    <article className="app-surface flex min-h-56 flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="blue">{record.source?.provider ?? "공식 출처"}</Tag>
          {record.category && <Tag>{record.category}</Tag>}
          {record.region && <Tag>{record.region}</Tag>}
          {record.data_status === "expired" && <Tag tone="amber">마감/종료</Tag>}
          {record.data_status === "unknown" && <Tag tone="amber">진행 상태 확인 필요</Tag>}
          {isStale(record.last_verified_at) && <Tag tone="amber">오래된 정보</Tag>}
        </div>
      </div>
      <Link href={`/${paths[record.record_type]}/${record.id}`} className="mt-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <h2 className="font-bold">{record.title}</h2>
        {record.summary && <p className="mt-2 line-clamp-3 text-sm text-muted">{record.summary}</p>}
      </Link>
      {details.length > 0 && (
        <dl className="mt-3 grid gap-1 text-xs text-muted">
          {details.map(([key, value]) => <div key={key} className="flex gap-2"><dt className="shrink-0 font-semibold">{key}</dt><dd className="line-clamp-1">{value}</dd></div>)}
        </dl>
      )}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs text-muted">
        <span>최종 확인 {formatDate(record.last_verified_at)}</span>
        {url && <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline underline-offset-2 dark:text-blue-300">{originalUrl ? "공식 원문" : "데이터 출처 안내"}</a>}
      </div>
    </article>
  );
}

export function CatalogBrowser({
  type,
  page,
  filters,
  categories = [],
  regions = [],
}: {
  type: CatalogViewType;
  page: CatalogPage;
  filters: CatalogFilters;
  categories?: string[];
  regions?: string[];
}) {
  const label = type === "all" ? "통합 검색" : CATALOG_LABELS[type];
  const totalPages = Math.max(1, Math.ceil(page.total / page.pageSize));

  return (
    <section     aria-label={`${label} 검색 결과`}>
      <form method="get" className="app-surface grid gap-3 rounded-2xl p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          검색어
          <input name="q" defaultValue={filters.q} maxLength={100} placeholder={`${label} 검색`} className="h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--foreground)] outline-none focus:border-blue-500" />
        </label>
        {type === "all" && (
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            자료 유형
            <select name="kind" defaultValue={filters.kind ?? ""} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]">
              <option value="">전체 유형</option>
              {CATALOG_TYPES.map((kind) => <option key={kind} value={kind}>{CATALOG_LABELS[kind]}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          분야
          {categories.length ? (
            <select name="category" defaultValue={filters.category ?? ""} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]">
              <option value="">전체 분야</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          ) : <input name="category" defaultValue={filters.category} maxLength={80} placeholder="분야" className="h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--foreground)] outline-none focus:border-blue-500" />}
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          지역
          {regions.length ? (
            <select name="region" defaultValue={filters.region ?? ""} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]">
              <option value="">전국</option>
              {regions.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          ) : <input name="region" defaultValue={filters.region} maxLength={80} placeholder="지역" className="h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--foreground)] outline-none focus:border-blue-500" />}
        </label>
        <button type="submit" className="h-10 self-end rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">검색</button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted" role="status">
        {page.status === "ready" ? (
          <span>실제 공개 데이터 <strong className="text-[var(--foreground)]">{page.total.toLocaleString("ko-KR")}</strong>건 · 페이지 {page.page}/{totalPages}</span>
        ) : page.status === "not_configured" ? (
          <span>데이터베이스 연결 설정이 없어 실제 데이터를 조회하지 않았습니다.</span>
        ) : (
          <span>데이터베이스 조회에 실패했습니다. 실제 데이터 대신 예시를 표시하지 않습니다.</span>
        )}
        {page.status === "ready" && <span>페이지당 {page.pageSize}건</span>}
      </div>

      {page.status !== "ready" ? (
        <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">{page.status === "not_configured" ? "Supabase 설정 필요" : "실제 데이터 연결 오류"}</p>
          <p className="mt-1">운영 환경에서 Supabase URL과 서버 전용 키, 공개 데이터 마이그레이션 및 동기화를 설정한 뒤 이용할 수 있습니다.</p>
        </div>
      ) : page.records.length ? (
        <>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {page.records.map((record) => <CatalogCard key={record.id} record={record} />)}
          </div>
          {totalPages > 1 && (
            <nav aria-label="검색 결과 페이지" className="mt-6 flex items-center justify-center gap-3">
              {page.page > 1 ? <Link className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm" href={pageHref(page.page - 1, filters)}>이전</Link> : <span className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-muted/50">이전</span>}
              <span className="text-sm text-muted">{page.page} / {totalPages}</span>
              {page.page < totalPages ? <Link className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm" href={pageHref(page.page + 1, filters)}>다음</Link> : <span className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-muted/50">다음</span>}
            </nav>
          )}
        </>
      ) : (
        <div className="mt-5">
          <EmptyState title="연결된 실제 데이터가 없습니다" description="공식 데이터 제공처 승인, 서버 키 설정 및 초기 동기화가 완료되면 여기에 결과가 표시됩니다." />
        </div>
      )}
    </section>
  );
}
