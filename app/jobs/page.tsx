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
      <PageHeading eyebrow="JOB BOARD" title="전국의 공공 채용을 찾아보세요" description="공식 출처에서 수집·확인한 공고만 표시합니다. 현재는 나라일터 공공 채용과 이용 권한이 확인된 데이터 연동을 지원합니다." />
      <CatalogBrowser type="job" page={page} filters={filters} />
    </div>
  );
}
