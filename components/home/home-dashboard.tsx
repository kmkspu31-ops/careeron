import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Clock3,
  Compass,
  FileText,
  Flame,
  Sparkles,
  Target,
} from "lucide-react";
import Link from "next/link";
import { certificates, companies, jobs, occupations } from "@/data/mock-data";
import { ButtonLink, PageHeading, SectionHeading, StatCard, Surface, Tag } from "@/components/common/ui";
import { SearchBox } from "@/components/common/search-box";

export function HomeDashboard() {
  return (
    <div className="content-width">
      <PageHeading eyebrow="DISCOVER YOUR CAREER" title="커리어의 다음 장을 시작해요" description="진로를 탐색하고, 준비하고, 도전하는 모든 순간을 CAREERON과 함께하세요." action={<ButtonLink href="/ai/career"><Sparkles size={16} className="mr-2" />AI 진로 상담</ButtonLink>} />

      <section className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-8 text-white sm:px-9 sm:py-10">
        <div className="absolute -right-14 -top-20 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -right-2 -top-8 h-44 w-44 rounded-full border border-white/10" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-blue-100"><Sparkles size={14} /> 오늘의 커리어 탐색</div>
          <h2 className="text-2xl font-bold leading-tight sm:text-3xl">나에게 맞는 일을 찾는 여정,<br className="hidden sm:block" /> 지금 시작해볼까요?</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">관심 있는 분야를 탐색하고, 작은 목표부터 차근차근 쌓아보세요.</p>
          <div className="mt-6 flex flex-wrap gap-3"><ButtonLink href="/occupations">직업 탐색하기 <ArrowRight size={16} className="ml-2" /></ButtonLink><Link href="/study" className="inline-flex h-10 items-center rounded-lg border border-white/20 px-4 text-sm font-semibold text-white transition hover:bg-white/10">학습 계획 세우기</Link></div>
          <div className="mt-6 max-w-xl"><SearchBox placeholder="직업, 채용공고, 기업을 검색해보세요" /></div>
          <div className="mt-6"><Link href="/search" className="text-xs text-slate-300 underline decoration-slate-500 underline-offset-4">실제 정보가 아닌 CAREERON 예시 데이터 안내</Link></div>
        </div>
      </section>

      <div className="section-gap grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="탐색 가능한 직업" value="120+" detail="다양한 분야의 커리어 정보" icon={Compass} />
        <StatCard label="신규 채용 공고" value="1,240" detail="예시 데이터 · 실제 공고 아님" icon={BriefcaseBusiness} tone="green" />
        <StatCard label="이번 주 학습 목표" value="3 / 5시간" detail="목표까지 2시간 남았어요" icon={Clock3} tone="amber" />
        <StatCard label="준비 중인 자격증" value="2개" detail="학습 현황을 기록해보세요" icon={Award} tone="violet" />
      </div>

      <section className="section-gap">
        <SectionHeading title="요즘 주목받는 직업" description="다양한 진로 가능성을 둘러보세요." href="/occupations" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {occupations.slice(0, 3).map((occupation) => (
            <Link href={`/occupations/${occupation.id}`} key={occupation.id} className="app-surface rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:hover:border-blue-800">
              <div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{occupation.icon}</span><ArrowUpRight size={17} className="text-muted" /></div>
              <p className="mt-4 text-xs font-semibold text-blue-600 dark:text-blue-300">{occupation.category}</p><h3 className="mt-1 font-bold">{occupation.title}</h3><p className="mt-2 line-clamp-2 text-sm text-muted">{occupation.summary}</p>
              <div className="mt-4 flex gap-2"><Tag>평균 {occupation.salary}</Tag><Tag tone="green">전망 {occupation.outlook}</Tag></div>
            </Link>
          ))}
        </div>
      </section>

      <div className="section-gap grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionHeading title="최신 채용공고" description="예시 공고 데이터로 구성된 화면입니다." href="/jobs" />
          <Surface className="divide-y divide-[var(--border)]">
            {jobs.slice(0, 3).map((job) => (
              <Link href={`/jobs/${job.id}`} key={job.id} className="flex flex-col gap-3 p-4 transition hover:bg-[var(--surface-subtle)] sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0"><p className="text-xs font-medium text-muted">{job.company} · {job.location}</p><h3 className="mt-1 truncate font-semibold">{job.title}</h3><div className="mt-2 flex gap-1.5">{job.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div></div>
                <div className="flex items-center justify-between gap-4 text-xs text-muted sm:flex-col sm:items-end"><Tag tone="blue">{job.employmentType}</Tag><span>~ {job.deadline}</span></div>
              </Link>
            ))}
          </Surface>
        </section>
        <section>
          <SectionHeading title="추천 기업" description="진로 탐색을 위한 샘플 기업 정보" href="/companies" />
          <Surface className="divide-y divide-[var(--border)]">
            {companies.map((company) => <Link href={`/companies/${company.id}`} key={company.id} className="flex items-center gap-3 p-4 transition hover:bg-[var(--surface-subtle)]"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{company.name.slice(0, 1)}</span><span className="min-w-0 flex-1"><span className="block font-semibold">{company.name}</span><span className="mt-0.5 block truncate text-xs text-muted">{company.industry} · {company.location}</span></span><ArrowUpRight size={16} className="text-muted" /></Link>)}
          </Surface>
        </section>
      </div>

      <div className="section-gap grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeading title="많이 찾는 자격증" description="관심 분야의 학습 계획을 세워보세요." href="/certificates" />
          <div className="grid gap-3 sm:grid-cols-2">
            {certificates.slice(0, 2).map((certificate) => <Link href={`/certificates/${certificate.id}`} key={certificate.id} className="app-surface rounded-xl p-4 transition hover:border-blue-200"><div className="flex items-center justify-between"><Tag tone="blue">{certificate.category}</Tag><Award size={17} className="text-muted" /></div><h3 className="mt-3 font-semibold">{certificate.name}</h3><p className="mt-1 text-xs text-muted">{certificate.issuer}</p></Link>)}
          </div>
        </section>
        <section>
          <SectionHeading title="CAREERON과 함께 준비하기" description="다음 한 걸음을 작게 시작해보세요." />
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/ai/employment" className="app-surface rounded-xl p-4 transition hover:border-blue-200"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><FileText size={18} /></span><h3 className="mt-3 font-semibold">취업 준비 도구</h3><p className="mt-1 text-xs text-muted">자기소개서와 면접을 연습해요.</p></Link>
            <Link href="/study" className="app-surface rounded-xl p-4 transition hover:border-blue-200"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300"><BookOpenCheck size={18} /></span><h3 className="mt-3 font-semibold">학습 루틴 만들기</h3><p className="mt-1 text-xs text-muted">목표와 진도를 기록해요.</p></Link>
          </div>
        </section>
      </div>

      <section className="section-gap rounded-2xl border border-blue-100 bg-blue-50/80 p-5 dark:border-blue-900 dark:bg-blue-950/30 sm:flex sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 dark:bg-blue-900"><Target size={19} /></span><div><p className="font-bold">이번 주 작은 목표를 세워보세요</p><p className="mt-1 text-sm text-muted">10분의 탐색도 당신의 다음 기회를 만듭니다.</p></div></div>
        <Link href="/study" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 sm:mt-0 dark:text-blue-300">목표 만들기 <ArrowRight size={16} /></Link>
      </section>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted"><CheckCircle2 size={14} /> 위에 표시된 공고, 기업, 자격증 정보는 UI 미리보기를 위한 예시입니다.</div>
      <div className="sr-only"><Building2 /><Flame /></div>
    </div>
  );
}
