import { notFound } from "next/navigation";
import { DetailPage } from "@/components/common/detail-page";
import { occupations } from "@/data/mock-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return occupations.map(({ id }) => ({ id }));
}

export default async function OccupationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const occupation = occupations.find((item) => item.id === id);
  if (!occupation) notFound();
  return <DetailPage eyebrow="CAREER PROFILE · EXAMPLE" title={occupation.title} description={occupation.summary} meta={`${occupation.category} · 평균 연봉 ${occupation.salary} · 전망 ${occupation.outlook}`} tags={[occupation.category, `전망 ${occupation.outlook}`]} backHref="/occupations" backLabel="직업 탐색" sections={[{ title: "어떤 일을 하나요?", body: `${occupation.title}은(는) 관련 분야의 문제를 발견하고 해결하는 전문가입니다. 상세 업무와 직무 정보는 실제 데이터 제공처 연동 후 확인할 수 있습니다.` }, { title: "필요 역량과 준비 방법", body: "직무에 필요한 기술과 역량, 관련 교육 및 첫 경험을 쌓는 방법을 소개하는 영역입니다. 관심 분야를 탐색하고 학습 계획을 세워보세요." }]} />;
}
