export const CATALOG_TYPES = ["job", "occupation", "skill", "certification", "company", "training"] as const;

export type CatalogType = (typeof CATALOG_TYPES)[number];
export type CatalogStatus = "ready" | "not_configured" | "unavailable";

export type CatalogRecord = {
  id: string;
  source_id: string;
  record_type: CatalogType;
  external_id: string;
  title: string;
  summary: string;
  category: string | null;
  region: string | null;
  source_url: string | null;
  fields: Record<string, unknown>;
  data_status: "active" | "expired" | "withdrawn" | "unknown";
  collected_at: string;
  last_verified_at: string;
  expires_at: string | null;
  source?: {
    provider: string;
    dataset_name: string;
    dataset_url: string;
    license_name: string;
  } | null;
};

export type CatalogPage = {
  status: CatalogStatus;
  records: CatalogRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export type CatalogRecordResult = {
  status: CatalogStatus;
  record: CatalogRecord | null;
};

export type CatalogFilters = {
  q?: string;
  kind?: CatalogType;
  category?: string;
  region?: string;
  page?: number;
};

export const CATALOG_LABELS: Record<CatalogType, string> = {
  job: "채용공고",
  occupation: "직업",
  skill: "직무 역량",
  certification: "자격증",
  company: "기업",
  training: "교육 과정",
};

export type CatalogViewType = CatalogType | "all";
