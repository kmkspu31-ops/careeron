import { notFound } from "next/navigation";
import { DetailPage } from "@/components/common/detail-page";
import { certificates } from "@/data/mock-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return certificates.map(({ id }) => ({ id }));
}

export default async function CertificateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const certificate = certificates.find((item) => item.id === id);
  if (!certificate) notFound();
  return <DetailPage eyebrow="CERTIFICATE · EXAMPLE" title={certificate.name} description="학습 계획과 시험 준비에 필요한 기본 정보를 확인할 수 있습니다." meta={`${certificate.category} · ${certificate.issuer} · 일정 ${certificate.nextDate}`} tags={[certificate.category, `난이도 ${certificate.difficulty}`]} backHref="/certificates" backLabel="자격증" sections={[{ title: "자격 안내", body: "자격 취득을 통해 확인할 수 있는 역량과 응시 자격, 시험 과목을 안내하는 공간입니다. 현재 표시된 일정과 설명은 예시이므로 실제 기관의 공고를 확인해주세요." }, { title: "학습 계획", body: "학습 목표와 주간 계획, 진도 기록을 연결할 수 있습니다. 학습 관리에서 개인 목표를 기록해보세요." }]} />;
}
