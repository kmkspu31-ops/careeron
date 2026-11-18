import "server-only";

import type { CatalogFilters, CatalogPage, CatalogRecord, CatalogRecordResult, CatalogType, CatalogViewType } from "@/lib/catalog/types";

const pageSize = 20;
const allowedSearchCharacters = /[^\p{L}\p{N}\s.-]/gu;

export type SupabaseAdminConfig = { url: string; key: string };

export function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const url = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

function getSearchTerm(value: string | undefined): string {
  return (value ?? "").replace(allowedSearchCharacters, " ").trim().slice(0, 100);
}

function getPage(value: number | undefined): number {
  return Number.isSafeInteger(value) ? Math.min(Math.max(value ?? 1, 1), 100_000) : 1;
}

function getCount(response: Response, fallback: number): number {
  const contentRange = response.headers.get("content-range");
  const total = contentRange?.split("/")[1];
  if (!total || total === "*") return fallback;
  const parsed = Number(total);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

async function requestRows(url: URL, config: { url: string; key: string }): Promise<Response> {
  return fetch(url, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: "application/json",
      Prefer: "count=exact",
    },
    cache: "no-store",
  });
}

export async function searchCatalog(type: CatalogViewType, filters: CatalogFilters = {}): Promise<CatalogPage> {
  const config = getSupabaseAdminConfig();
  const page = getPage(filters.page);
  if (!config) return { status: "not_configured", records: [], total: 0, page, pageSize };

  const from = (page - 1) * pageSize;
  const url = new URL(`${config.url}/rest/v1/catalog_records`);
  url.searchParams.set(
    "select",
    "id,source_id,record_type,external_id,title,summary,category,region,source_url,fields,data_status,collected_at,last_verified_at,expires_at,source:data_sources(provider,dataset_name,dataset_url,license_name)",
  );
  const selectedType = type === "all" ? filters.kind : type;
  if (selectedType) url.searchParams.set("record_type", `eq.${selectedType}`);
  url.searchParams.set("data_status", "in.(active,expired)");
  url.searchParams.set("order", "last_verified_at.desc");
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("offset", String(from));

  const query = getSearchTerm(filters.q);
  if (query) {
    const pattern = `*${query}*`;
    url.searchParams.set(
      "or",
      `(title.ilike.${pattern},summary.ilike.${pattern},category.ilike.${pattern},region.ilike.${pattern})`,
    );
  }
  const category = getSearchTerm(filters.category);
  if (category) url.searchParams.set("category", `eq.${category}`);
  const region = getSearchTerm(filters.region);
  if (region) url.searchParams.set("region", `ilike.*${region}*`);
  if (selectedType === "job") {
    if (filters.education) url.searchParams.set("fields->>education_code", `eq.${filters.education}`);
    if (filters.career) url.searchParams.set("fields->>career_code", `eq.${filters.career}`);
    if (filters.occupation) url.searchParams.set("fields->>occupation_code", `ilike.*${filters.occupation}*`);
    if (filters.minPay) url.searchParams.set("fields->>max_salary", `gte.${filters.minPay}`);
    if (filters.maxPay) url.searchParams.set("fields->>min_salary", `lte.${filters.maxPay}`);
    const certLic = getSearchTerm(filters.certLic);
    if (certLic) url.searchParams.set("fields->>cert_license_codes", `ilike.*${certLic}*`);
  }

  try {
    const response = await requestRows(url, config);
    if (!response.ok) return { status: "unavailable", records: [], total: 0, page, pageSize };
    const records: unknown = await response.json();
    if (!Array.isArray(records)) return { status: "unavailable", records: [], total: 0, page, pageSize };
    return {
      status: "ready",
      records: records as CatalogRecord[],
      total: getCount(response, from + records.length),
      page,
      pageSize,
    };
  } catch {
    return { status: "unavailable", records: [], total: 0, page, pageSize };
  }
}

export async function getCatalogRecord(type: CatalogType, id: string): Promise<CatalogRecordResult> {
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return { status: "ready", record: null };
  const config = getSupabaseAdminConfig();
  if (!config) return { status: "not_configured", record: null };

  const url = new URL(`${config.url}/rest/v1/catalog_records`);
  url.searchParams.set(
    "select",
    "id,source_id,record_type,external_id,title,summary,category,region,source_url,fields,data_status,collected_at,last_verified_at,expires_at,source:data_sources(provider,dataset_name,dataset_url,license_name)",
  );
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("record_type", `eq.${type}`);
  url.searchParams.set("data_status", "in.(active,expired)");
  url.searchParams.set("limit", "1");

  try {
    const response = await requestRows(url, config);
    if (!response.ok) return { status: "unavailable", record: null };
    const records: unknown = await response.json();
    return Array.isArray(records)
      ? { status: "ready", record: (records[0] as CatalogRecord | undefined) ?? null }
      : { status: "unavailable", record: null };
  } catch {
    return { status: "unavailable", record: null };
  }
}

export function isCatalogConfigured(): boolean {
  return getSupabaseAdminConfig() !== null;
}

export function isDataGovKeyConfigured(): boolean {
  return Boolean(process.env.DATA_GO_KR_API_KEY?.trim());
}

export function isDartKeyConfigured(): boolean {
  return Boolean(process.env.DART_API_KEY?.trim());
}
