import { CatalogBrowser } from "@/components/common/catalog-browser";
import { PageHeading } from "@/components/common/ui";
import { parseCatalogFilters } from "@/lib/catalog/params";
import { searchCatalog } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CertificatesPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams);
  const page = await searchCatalog("certification", filters);

  return (
    <div className="content-width">
      <PageHeading eyebrow="CERTIFICATION" title="국가자격과 시험일정을 확인하세요" description="자격 구분과 일정은 공식 시행기관 자료를 기준으로 표시합니다. 일정이 제공되지 않으면 임의로 예상하지 않습니다." />
      <CatalogBrowser type="certification" page={page} filters={filters} />
    </div>
  );
}
