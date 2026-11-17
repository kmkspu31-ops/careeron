import { notFound } from "next/navigation";
import { DetailPage } from "@/components/common/detail-page";
import { jobs } from "@/data/mock-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return jobs.map(({ id }) => ({ id }));
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = jobs.find((item) => item.id === id);
  if (!job) notFound();
  return <DetailPage eyebrow="JOB DETAIL · EXAMPLE" title={job.title} description={`${job.company}에서 함께할 동료를 찾고 있습니다. 이 채용 정보는 서비스 화면 미리보기용 예시입니다.`} meta={`${job.location} · ${job.employmentType} · 마감 ${job.deadline}`} tags={job.tags} backHref="/jobs" backLabel="채용 정보" sections={[{ title: "포지션 소개", body: "이 영역에 회사와 포지션의 상세 소개가 표시됩니다. 실제 채용 데이터 연동 후 담당 업무와 자격 요건을 정확하게 제공할 예정입니다." }, { title: "주요 업무 및 자격 요건", body: "프로젝트의 업무 범위와 지원 자격, 우대 사항을 확인할 수 있는 기본 틀입니다. 본 예시에는 실제 기업이나 채용 내용을 포함하지 않습니다." }]} />;
}
