import Link from "next/link";
import { PageHeading } from "@/components/common/ui";
import type { CatalogRecord, CatalogStatus, CatalogType } from "@/lib/catalog/types";
import { CATALOG_LABELS } from "@/lib/catalog/types";

const listPaths: Record<CatalogType, string> = {
  job: "/jobs",
  occupation: "/occupations",
  skill: "/skills",
  certification: "/certificates",
  company: "/companies",
  training: "/training",
};

const fieldLabels: Record<string, string> = {
  organization: "기관",
  employer: "기관/기업",
  employment_type: "고용 형태",
  education: "학력 요건",
  experience: "경력 요건",
  pay: "급여 정보",
  headcount: "모집 인원",
  region_code: "지역 코드",
  application_start: "접수 시작",
  application_end: "접수 마감",
  practical_application_start: "실기 접수 시작",
  practical_application_end: "실기 접수 마감",
  exam_year: "시행 연도",
  exam_period: "시험 회차",
  written_exam_start: "필기시험",
  written_exam_end: "필기시험 종료",
  written_result_date: "필기 합격 발표",
  practical_exam_start: "실기시험",
  practical_exam_end: "실기시험 종료",
  practical_result_date: "실기 합격 발표",
  course_year: "교육 연도",
  training_hours: "교육 시간",
  course_end: "교육 종료일",
  competency_code: "능력단위 코드",
  competency_level: "능력단위 수준",
  major_category: "NCS 대분류",
  middle_category: "NCS 중분류",
  minor_category: "NCS 소분류",
  detailed_category: "NCS 세분류",
};

function safeSourceUrl(value: string | null | undefined): string | null {
  try {
    if (!value) return null;
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function getDisplayFields(fields: Record<string, unknown>): Array<[string, string]> {
  return Object.entries(fields).flatMap(([key, value]) => {
    if (/bizno|registration|representative|ceo|phone|fax/i.test(key)) return [];
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return [];
    const text = String(value).trim();
    return text ? [[fieldLabels[key] ?? key, text] as [string, string]] : [];
  });
}

function formatDate(value: string | null): string {
  if (!value) return "확인 정보 없음";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "확인 정보 없음" : new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function CatalogDetail({ record }: { record: CatalogRecord }) {
  const originalUrl = safeSourceUrl(record.source_url);
  const sourceUrl = originalUrl ?? safeSourceUrl(record.source?.dataset_url);
  const fields = getDisplayFields(record.fields);

  return (
    <div className="content-width">
      <PageHeading
        eyebrow={`${CATALOG_LABELS[record.record_type]} · ${record.source?.provider ?? "공식 출처"}`}
        title={record.title}
        description={record.summary || "공식 원천에서 확인한 상세 정보입니다."}
        action={<Link href={listPaths[record.record_type]} className="inline-flex h-10 items-center rounded-lg border border-[var(--border)] px-4 text-sm font-semibold">목록으로</Link>}
      />
      <div className="section-gap grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="app-surface rounded-2xl p-5 sm:p-7">
          <h2 className="font-bold">공식 데이터</h2>
          {fields.length ? (
            <dl className="mt-4 divide-y divide-[var(--border)]">
              {fields.map(([label, value]) => (
                <div key={label} className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <dt className="text-sm font-semibold text-muted">{label}</dt>
                  <dd className="break-words text-sm">{value}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="mt-3 text-sm text-muted">제공된 상세 필드가 없습니다. 원문에서 최신 정보를 확인하세요.</p>}
        </section>
        <aside className="app-surface h-fit rounded-2xl p-5">
          <h2 className="font-bold">출처 및 최신성</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div><dt className="text-xs text-muted">데이터 제공처</dt><dd className="mt-1">{record.source?.dataset_name ?? record.source_id}</dd></div>
            {record.source?.license_name && <div><dt className="text-xs text-muted">이용 조건</dt><dd className="mt-1">{record.source.license_name}</dd></div>}
            <div><dt className="text-xs text-muted">수집 시각</dt><dd className="mt-1">{formatDate(record.collected_at)}</dd></div>
            <div><dt className="text-xs text-muted">최종 확인</dt><dd className="mt-1">{formatDate(record.last_verified_at)}</dd></div>
            {record.expires_at && <div><dt className="text-xs text-muted">종료/마감</dt><dd className="mt-1">{formatDate(record.expires_at)}</dd></div>}
          </dl>
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex font-semibold text-blue-700 underline underline-offset-2 dark:text-blue-300">{originalUrl ? "공식 원문에서 확인" : "데이터셋 문서 (개별 원문 링크 없음)"}</a> : <p className="mt-5 text-xs text-muted">원본 링크를 확인할 수 없습니다.</p>}
        </aside>
      </div>
    </div>
  );
}

export function CatalogDetailUnavailable({ type, status }: { type: CatalogType; status: Exclude<CatalogStatus, "ready"> }) {
  const configured = status === "not_configured";
  return (
    <div className="content-width">
      <PageHeading
        eyebrow={CATALOG_LABELS[type]}
        title={configured ? "실제 데이터 연결 설정이 필요합니다" : "데이터를 불러올 수 없습니다"}
        description={configured
          ? "이 환경에는 데이터베이스 설정이 없어 실제 레코드를 조회하지 않았습니다."
          : "데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해 주세요."}
        action={<Link href={listPaths[type]} className="inline-flex h-10 items-center rounded-lg border border-[var(--border)] px-4 text-sm font-semibold">목록으로</Link>}
      />
    </div>
  );
}
