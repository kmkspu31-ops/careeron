import { CatalogBrowser } from "@/components/common/catalog-browser";
import { PageHeading } from "@/components/common/ui";
import { parseCatalogFilters } from "@/lib/catalog/params";
import { searchCatalog } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OccupationsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams);
  const page = await searchCatalog("occupation", filters);

  return (
    <div className="content-width">
      <PageHeading eyebrow="CAREER EXPLORER" title="공식 직업·직무 정보를 탐색하세요" description="확인된 직업 분류와 직무 정보를 출처와 함께 제공합니다. 근거가 없는 연봉이나 전망은 표시하지 않습니다." />
      <CatalogBrowser type="occupation" page={page} filters={filters} />
    </div>
  );
}
