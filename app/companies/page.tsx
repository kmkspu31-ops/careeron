import { PageHeading } from "@/components/common/ui";
import { ResourceBrowser, type BrowseItem } from "@/components/common/resource-browser";
import { companies } from "@/data/mock-data";

const items: BrowseItem[] = companies.map((company) => ({
  id: company.id,
  title: company.name,
  eyebrow: company.industry,
  description: company.description,
  meta: `${company.location} · 구성원 ${company.size}`,
  tags: [company.industry, company.size],
  href: `/companies/${company.id}`,
  category: company.industry,
}));

export default function CompaniesPage() {
  return <div className="content-width"><PageHeading eyebrow="COMPANY DIRECTORY" title="나와 잘 맞는 기업을 발견하세요" description="기업의 분야와 문화를 살펴보고 나에게 맞는 환경을 찾아보세요. 아래 기업은 실제 기업 정보가 아닌 예시입니다." /><ResourceBrowser items={items} categories={["전체", ...Array.from(new Set(companies.map((item) => item.industry)))]} searchPlaceholder="기업명, 업종, 지역 검색" /></div>;
}
