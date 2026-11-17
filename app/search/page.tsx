import { PageHeading } from "@/components/common/ui";
import { ResourceBrowser, type BrowseItem } from "@/components/common/resource-browser";
import { certificates, companies, jobs, occupations } from "@/data/mock-data";

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const { q = "" } = await searchParams;
  const items: BrowseItem[] = [
    ...occupations.map((item) => ({ id: `occupation-${item.id}`, title: item.title, eyebrow: `직업 · ${item.category}`, description: item.summary, meta: `평균 연봉 ${item.salary} · 전망 ${item.outlook}`, tags: [item.category], href: `/occupations/${item.id}`, category: "직업" })),
    ...jobs.map((item) => ({ id: `job-${item.id}`, title: item.title, eyebrow: `채용 · ${item.company}`, description: `${item.location} · ${item.employmentType} · 마감 ${item.deadline}`, meta: item.location, tags: item.tags, href: `/jobs/${item.id}`, category: "채용" })),
    ...companies.map((item) => ({ id: `company-${item.id}`, title: item.name, eyebrow: `기업 · ${item.industry}`, description: item.description, meta: `${item.location} · ${item.size}`, tags: [item.industry], href: `/companies/${item.id}`, category: "기업" })),
    ...certificates.map((item) => ({ id: `certificate-${item.id}`, title: item.name, eyebrow: `자격증 · ${item.category}`, description: `${item.issuer} · 시험 일정 ${item.nextDate}`, meta: item.issuer, tags: [item.category], href: `/certificates/${item.id}`, category: "자격증" })),
  ];
  return <div className="content-width"><PageHeading eyebrow="SEARCH" title={q ? `“${q}” 검색 결과` : "통합 검색"} description="직업, 채용공고, 기업, 자격증 예시 데이터를 검색합니다." /><ResourceBrowser items={items} categories={["전체", "직업", "채용", "기업", "자격증"]} initialQuery={q} searchPlaceholder="관심 키워드를 입력하세요" /></div>;
}
