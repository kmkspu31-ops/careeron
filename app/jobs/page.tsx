import { CatalogBrowser } from "@/components/common/catalog-browser";
import { PageHeading } from "@/components/common/ui";
import { parseCatalogFilters } from "@/lib/catalog/params";
import { searchCatalog } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function JobsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams);
  const page = await searchCatalog("job", filters);

  return (
    <div className="content-width">
      <PageHeading eyebrow="JOB BOARD" title="전국 채용공고를 찾아보세요" description="공식 출처에서 수집한 공고만 표시합니다. 고용24 데이터는 API 승인, 이용 조건 확인 및 초기 동기화 후 검색할 수 있습니다." />
      <CatalogBrowser type="job" page={page} filters={filters} />
    </div>
  );
}
