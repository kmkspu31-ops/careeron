import { CatalogBrowser } from "@/components/common/catalog-browser";
import { PageHeading } from "@/components/common/ui";
import { parseCatalogFilters } from "@/lib/catalog/params";
import { searchCatalog } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function TrainingPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams);
  const page = await searchCatalog("training", filters);

  return (
    <div className="content-width">
      <PageHeading eyebrow="TRAINING" title="공식 직업교육 과정을 찾아보세요" description="현재는 e새일 직업교육훈련 데이터 연결을 지원합니다. 전국 국민내일배움카드 과정 API는 공식 공개 API 문서를 확인하지 못해 연결된 것처럼 표시하지 않습니다." />
      <CatalogBrowser type="training" page={page} filters={filters} />
    </div>
  );
}
