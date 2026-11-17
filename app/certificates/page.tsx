import { PageHeading } from "@/components/common/ui";
import { ResourceBrowser, type BrowseItem } from "@/components/common/resource-browser";
import { certificates } from "@/data/mock-data";

const items: BrowseItem[] = certificates.map((certificate) => ({
  id: certificate.id,
  title: certificate.name,
  eyebrow: certificate.category,
  description: `${certificate.issuer}에서 시행하는 자격 시험입니다. 시험 일정과 상세 정보는 실제 기관 공지에서 확인하세요.`,
  meta: `시행 기관 ${certificate.issuer} · 다음 일정 ${certificate.nextDate}`,
  tags: [certificate.category, `난이도 ${certificate.difficulty}`],
  href: `/certificates/${certificate.id}`,
  category: certificate.category,
}));

export default function CertificatesPage() {
  return <div className="content-width"><PageHeading eyebrow="CERTIFICATION" title="목표에 맞는 자격증을 준비하세요" description="분야별 자격증을 살펴보고 나만의 학습 계획을 세워보세요. 일정 및 정보는 UI 미리보기용 예시입니다." /><ResourceBrowser items={items} categories={["전체", "국가기술자격", "국가전문자격", "민간자격"]} searchPlaceholder="자격증명, 시행 기관으로 검색" /></div>;
}
