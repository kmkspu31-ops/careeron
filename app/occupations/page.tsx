import { PageHeading } from "@/components/common/ui";
import { ResourceBrowser, type BrowseItem } from "@/components/common/resource-browser";
import { categories, occupations } from "@/data/mock-data";

const items: BrowseItem[] = occupations.map((item) => ({
  id: item.id,
  title: item.title,
  eyebrow: item.category,
  description: item.summary,
  meta: `평균 연봉 ${item.salary} · 전망 ${item.outlook}`,
  tags: [item.category, `전망 ${item.outlook}`],
  href: `/occupations/${item.id}`,
  category: item.category,
}));

export default function OccupationsPage() {
  return <div className="content-width"><PageHeading eyebrow="CAREER EXPLORER" title="나에게 맞는 직업을 탐색해보세요" description="관심 분야와 강점을 살펴보고 새로운 커리어 가능성을 발견하세요. 직업 정보는 서비스 화면 미리보기용 예시입니다." /><ResourceBrowser items={items} categories={categories} searchPlaceholder="직업명, 분야, 역량으로 검색" /></div>;
}
