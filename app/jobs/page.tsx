import { PageHeading } from "@/components/common/ui";
import { ResourceBrowser, type BrowseItem } from "@/components/common/resource-browser";
import { jobs } from "@/data/mock-data";

const items: BrowseItem[] = jobs.map((job) => ({
  id: job.id,
  title: job.title,
  eyebrow: job.company,
  description: `${job.location}에서 함께할 동료를 찾고 있습니다. 이 공고는 디자인 미리보기용 예시 정보입니다.`,
  meta: `${job.location} · ${job.employmentType} · 마감 ${job.deadline}`,
  tags: [...job.tags, job.title.includes("디자이너") ? "디자인" : job.title.includes("데이터") || job.title.includes("개발자") ? "IT·데이터" : "기획·운영"],
  href: `/jobs/${job.id}`,
  category: job.employmentType,
}));

export default function JobsPage() {
  return <div className="content-width"><PageHeading eyebrow="JOB BOARD" title="다음 기회를 찾아보세요" description="관심 있는 직무와 조건으로 채용 정보를 탐색하세요. 현재 공고 데이터는 실제 채용 정보가 아닌 예시입니다." /><ResourceBrowser items={items} categories={["전체", "서울", "경기", "디자인", "IT·데이터", "기획·운영", "신입", "경력", "인턴", "고졸 가능", "정규직"]} searchPlaceholder="직무, 기업, 지역 검색" /></div>;
}
