import { CatalogBrowser } from "@/components/common/catalog-browser";
import { PageHeading } from "@/components/common/ui";
import { parseCatalogFilters } from "@/lib/catalog/params";
import { searchCatalog } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams);
  const page = await searchCatalog("all", filters);

  return (
    <div className="content-width">
      <PageHeading eyebrow="SEARCH" title={filters.q ? `“${filters.q}” 검색 결과` : "공식 취업·진로 정보 통합 검색"} description="채용, 직무 역량, 자격증, 기업, 교육 과정의 실제 공개 데이터를 출처와 함께 검색합니다." />
      <CatalogBrowser type="all" page={page} filters={filters} />
    </div>
  );
}
