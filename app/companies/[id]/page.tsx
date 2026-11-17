import { notFound } from "next/navigation";
import { DetailPage } from "@/components/common/detail-page";
import { companies } from "@/data/mock-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return companies.map(({ id }) => ({ id }));
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = companies.find((item) => item.id === id);
  if (!company) notFound();
  return <DetailPage eyebrow="COMPANY PROFILE · EXAMPLE" title={company.name} description={company.description} meta={`${company.industry} · ${company.location} · ${company.size}`} tags={[company.industry, company.size]} backHref="/companies" backLabel="기업 정보" sections={[{ title: "기업 소개", body: "기업의 미션과 제품, 일하는 방식 등 진로 탐색에 필요한 소개가 표시됩니다. 이 회사 프로필은 샘플 데이터로 구성되어 있습니다." }, { title: "문화와 채용", body: "향후 채용 중인 포지션, 복지, 조직 문화 및 구성원 이야기를 데이터 연결을 통해 제공할 예정입니다." }]} />;
}
