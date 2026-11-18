import { CatalogBrowser } from "@/components/common/catalog-browser";
import { PageHeading } from "@/components/common/ui";
import { parseCatalogFilters } from "@/lib/catalog/params";
import { searchCatalog } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SkillsPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseCatalogFilters(await searchParams);
  const page = await searchCatalog("skill", filters);

  return (
    <div className="content-width">
      <PageHeading eyebrow="NCS SKILLS" title="국가직무능력표준 역량을 탐색하세요" description="NCS 능력단위는 직업 자체가 아니라 직무 수행에 필요한 지식·기술·태도 기준입니다. 공식 데이터를 구분해 제공합니다." />
      <CatalogBrowser type="skill" page={page} filters={filters} />
    </div>
  );
}
