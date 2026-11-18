import { CATALOG_TYPES, type CatalogFilters, type CatalogType } from "@/lib/catalog/types";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCatalogFilters(params: SearchParams): CatalogFilters {
  const rawPage = Number(firstValue(params.page));
  const rawKind = firstValue(params.kind);
  return {
    q: firstValue(params.q)?.trim().slice(0, 100),
    kind: rawKind && (CATALOG_TYPES as readonly string[]).includes(rawKind) ? rawKind as CatalogType : undefined,
    category: firstValue(params.category)?.trim().slice(0, 80),
    region: firstValue(params.region)?.trim().slice(0, 80),
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 100_000) : 1,
  };
}
