import { CatalogBrowser } from "@/components/common/catalog-browser";
import { PageHeading } from "@/components/common/ui";
import { parseCatalogFilters } from "@/lib/catalog/params";
import { searchCatalog } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CompaniesPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams);
  const page = await searchCatalog("company", filters);

  return (
    <div className="content-width">
      <PageHeading eyebrow="COMPANY DIRECTORY" title="공식 기업 정보를 검색하세요" description="현재 공개 데이터 연동이 설정된 기업 정보만 표시합니다. 기업 규모나 복지는 확인된 출처가 없으면 제공하지 않습니다." />
      <CatalogBrowser type="company" page={page} filters={filters} />
    </div>
  );
}
