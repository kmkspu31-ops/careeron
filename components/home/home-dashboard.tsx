import { Award, BookOpenCheck, BriefcaseBusiness, Building2, Compass, GraduationCap, Sparkles } from "lucide-react";
import Link from "next/link";
import { ButtonLink, PageHeading, SectionHeading, StatCard, Surface, Tag } from "@/components/common/ui";
import { searchCatalog } from "@/lib/catalog/server";
import type { CatalogPage, CatalogRecord, CatalogType } from "@/lib/catalog/types";

const sections: Array<{ type: CatalogType; title: string; href: string; icon: typeof BriefcaseBusiness }> = [
  { type: "occupation", title: "직업·직무 정보", href: "/occupations", icon: Compass },
  { type: "skill", title: "NCS 직무 역량", href: "/skills", icon: BookOpenCheck },
  { type: "job", title: "전국 채용공고", href: "/jobs", icon: BriefcaseBusiness },
  { type: "certification", title: "국가자격·시험 일정", href: "/certificates", icon: Award },
  { type: "company", title: "기업 정보", href: "/companies", icon: Building2 },
  { type: "training", title: "직업교육 과정", href: "/training", icon: GraduationCap },
];

function countText(page: CatalogPage): string {
  if (page.status === "not_configured") return "설정 필요";
  if (page.status === "unavailable") return "조회 오류";
  return page.total.toLocaleString("ko-KR");
}

function countDetail(page: CatalogPage): string {
  if (page.status === "ready") return "Supabase에서 조회한 실제 공개 레코드";
  return "실제 데이터 연결 후 표시됩니다";
}

function formatVerifiedDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "확인 시각 정보 없음"
    : new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

function ResourceList({ records, type }: { records: CatalogRecord[]; type: CatalogType }) {
  if (!records.length) {
    return <Surface className="p-5 text-sm text-muted">연결된 실제 데이터가 없습니다. 공식 API 승인과 서버 설정 후 표시됩니다.</Surface>;
  }

  const listPath = sections.find((section) => section.type === type)?.href ?? "/";
  return (
    <Surface className="divide-y divide-[var(--border)]">
      {records.map((record) => (
        <Link key={record.id} href={`${listPath}/${record.id}`} className="block p-4 transition hover:bg-[var(--surface-subtle)] sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            {record.category && <Tag tone="blue">{record.category}</Tag>}
            {record.region && <Tag>{record.region}</Tag>}
          </div>
          <h3 className="mt-2 font-semibold">{record.title}</h3>
          {record.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{record.summary}</p>}
          <p className="mt-2 text-xs text-muted">{record.source?.provider ?? "공식 출처"} · 최종 확인 {formatVerifiedDate(record.last_verified_at)}</p>
        </Link>
      ))}
    </Surface>
  );
}

export async function HomeDashboard() {
  const pages = await Promise.all(sections.map(({ type }) => searchCatalog(type)));
  const pagesByType = Object.fromEntries(sections.map((section, index) => [section.type, pages[index]])) as Record<CatalogType, CatalogPage>;

  return (
    <div className="content-width">
      <PageHeading eyebrow="DISCOVER YOUR CAREER" title="커리어의 다음 장을 시작해요" description="공식 출처에서 확인된 취업·진로 데이터를 탐색하고, 준비하고, 도전하세요." action={<ButtonLink href="/ai/career"><Sparkles size={16} className="mr-2" />AI 진로 상담</ButtonLink>} />

      <section className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -right-2 -top-8 h-44 w-44 rounded-full border border-white/10" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-blue-100"><Sparkles size={14} /> 공식 출처 기반 커리어 탐색</div>
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">나에게 맞는 일을 찾는 여정,<br className="hidden sm:block" /> 지금 시작해볼까요?</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">공식 데이터 출처와 최신 확인 시각을 살펴보고 실제 정보에 기반해 다음 기회를 찾아보세요.</p>
          <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/jobs">채용 정보 찾기</ButtonLink><Link href="/training" className="inline-flex h-10 items-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10">교육 과정 탐색</Link></div>
        </div>
      </section>

      <div className="section-gap grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {sections.map(({ type, title, icon }, index) => <StatCard key={type} label={title} value={countText(pages[index])} detail={countDetail(pages[index])} icon={icon} />)}
      </div>

      <section className="section-gap">
        <SectionHeading title="취업·진로 데이터 탐색" description="각 분야에서 확인된 공식 데이터만 검색합니다." />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {sections.map(({ type, title, href, icon: Icon }) => (
            <Link key={type} href={href} className="app-surface rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800">
              <Icon size={20} className="text-blue-600 dark:text-blue-300" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-xs text-muted">{countText(pagesByType[type])}건</p>
            </Link>
          ))}
        </div>
      </section>

      <div className="section-gap grid gap-6 xl:grid-cols-2">
        <section>
          <SectionHeading title="최근 확인한 채용공고" description="실제 원문과 최종 확인 시각을 함께 제공합니다." href="/jobs" />
          <ResourceList records={pagesByType.job.records.slice(0, 3)} type="job" />
        </section>
        <section>
          <SectionHeading title="직업·직무 정보" description="공식 직무 분류와 역량 정보를 탐색하세요." href="/occupations" />
          <ResourceList records={pagesByType.occupation.records.slice(0, 3)} type="occupation" />
        </section>
      </div>

      <div className="section-gap grid gap-6 xl:grid-cols-3">
        {(["certification", "company", "training"] as const).map((type) => {
          const section = sections.find((item) => item.type === type);
          if (!section) return null;
          return (
            <section key={type}>
              <SectionHeading title={section.title} href={section.href} />
              <ResourceList records={pagesByType[type].records.slice(0, 2)} type={type} />
            </section>
          );
        })}
      </div>

      <section className="section-gap rounded-2xl border border-blue-100 bg-blue-50/80 p-5 dark:border-blue-900 dark:bg-blue-950/30 sm:p-6">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 dark:bg-blue-900"><BookOpenCheck size={19} /></span><div><p className="font-bold">정보의 출처와 최신성을 확인하세요</p><p className="mt-1 text-sm text-muted">각 상세 페이지에서 원본 링크, 제공기관, 최종 확인 시각을 확인할 수 있습니다. 연결 설정이 없거나 확인되지 않은 정보는 표시하지 않습니다.</p></div></div>
        <Link href="/search" className="mt-4 inline-flex text-sm font-semibold text-blue-700 underline underline-offset-2 dark:text-blue-300">통합 검색하기</Link>
      </section>
    </div>
  );
}
