import "server-only";

import { XMLParser } from "fast-xml-parser";
import { getSupabaseAdminConfig, type SupabaseAdminConfig } from "@/lib/catalog/server";
import { fetchWithRetry } from "@/lib/catalog/fetch-with-retry";
import type { CatalogRecord } from "@/lib/catalog/types";

export const WORK24_SOURCE_ID = "work24-job-postings";
export const WORK24_LIST_URL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do";
export const WORK24_DETAIL_URL = "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210D01.do";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => name === "wanted",
});

export type Work24Filters = {
  region?: string;
  occupation?: string;
  education?: string;
  career?: string;
  salaryType?: string;
  minPay?: number;
  maxPay?: number;
  certLic?: string;
};

export type Work24SyncRecord = {
  externalId: string;
  title: string;
  company: string;
  region: string;
  sourceUrl: string | null;
  closeAt: string | null;
  fields: Record<string, string | number>;
};

export type Work24DetailResult =
  | { status: "not_configured" }
  | { status: "unavailable" }
  | { status: "ready"; record: CatalogRecord };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const result = String(value).trim();
  return result ? result : null;
}

function findWork24Records(value: unknown, key: string): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((item) => findWork24Records(item, key));
  }
  if (!isRecord(value)) return [];
  const candidate = value[key];
  if (Array.isArray(candidate)) return candidate.filter(isRecord);
  if (isRecord(candidate)) return [candidate];
  return Object.values(value).flatMap((child) => findWork24Records(child, key));
}

function findWork24Value(value: unknown, key: string): string | null {
  if (!isRecord(value)) return null;
  const direct = text(value[key]);
  if (direct) return direct;
  for (const child of Object.values(value)) {
    const found = findWork24Value(child, key);
    if (found) return found;
  }
  return null;
}

function hasProviderError(payload: unknown): boolean {
  const providerCode = findWork24Value(payload, "errCd")
    ?? findWork24Value(payload, "errorCode")
    ?? findWork24Value(payload, "resultCode");
  const providerMessage = findWork24Value(payload, "error")
    ?? findWork24Value(payload, "errMsg")
    ?? findWork24Value(payload, "errorMessage");
  return Boolean(providerMessage)
    || Boolean(providerCode && !["00", "0000", "00000", "SUCCESS"].includes(providerCode.toUpperCase()));
}

function getProviderErrorCode(payload: unknown): string {
  const message = (
    findWork24Value(payload, "error")
    ?? findWork24Value(payload, "errMsg")
    ?? findWork24Value(payload, "errorMessage")
    ?? ""
  ).toLowerCase();
  if (message.includes("서비스가 존재하지 않습니다")) return "work24_service_not_available";
  if (/auth|key|인증|권한|키/.test(message)) return "work24_auth_failed";
  if (/limit|quota|초과|제한/.test(message)) return "work24_rate_limited";
  if (/parameter|param|필수|항목|요청값/.test(message)) return "work24_invalid_parameters";
  return "work24_provider_error";
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  const date = new Date(iso ? `${iso[1]}-${iso[2]}-${iso[3]}T23:59:59+09:00` : value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function numberOrNull(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeLink(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.toString();
    if (url.protocol === "http:" && (url.hostname === "work.go.kr" || url.hostname.endsWith(".work.go.kr"))) {
      url.protocol = "https:";
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function parseWork24Item(item: Record<string, unknown>): Work24SyncRecord | null {
  const externalId = text(item.wantedAuthNo);
  const title = text(item.title);
  if (!externalId || !/^[A-Za-z0-9_-]{1,128}$/.test(externalId) || !title) return null;

  const closeAt = parseDate(text(item.closeDt));
  const region = text(item.region) ?? [text(item.basicAddr), text(item.strtnmCd)].filter(Boolean).join(" ");
  const minSalary = numberOrNull(text(item.minSal));
  const maxSalary = numberOrNull(text(item.maxSal));
  const fields: Record<string, string | number> = {};
  const fieldMap: Record<string, string> = {
    company: "company",
    industry: "indTpNm",
    salary_type: "salTpNm",
    salary: "sal",
    work_type: "holidayTpNm",
    minimum_education: "minEdubg",
    maximum_education: "maxEdubg",
    career: "career",
    registration_date: "regDt",
    application_end: "closeDt",
    employment_type_code: "empTpCd",
    occupation_code: "jobsCd",
    modified_at: "smodifyDtm",
    address: "basicAddr",
    road_address: "strtnmCd",
  };
  for (const [field, source] of Object.entries(fieldMap)) {
    const value = text(item[source]);
    if (value) fields[field] = value;
  }
  const educationName = text(item.minEdubg);
  if (educationName) fields.education = educationName;
  const educationCode = text(item.edubgCd) ?? text(item.education);
  if (educationCode) fields.education_code = educationCode;
  const careerCode = text(item.careerCd);
  if (careerCode) fields.career_code = careerCode;
  const salaryTypeCode = text(item.salTp);
  if (salaryTypeCode) fields.salary_type_code = salaryTypeCode;
  if (minSalary !== null) fields.min_salary = minSalary;
  if (maxSalary !== null) fields.max_salary = maxSalary;
  const certLic = text(item.certLic);
  if (certLic) fields.cert_license_codes = certLic;

  return {
    externalId,
    title,
    company: text(item.company) ?? "",
    region,
    sourceUrl: normalizeLink(text(item.wantedInfoUrl) ?? text(item.wantedMobileInfoUrl)),
    closeAt,
    fields,
  };
}

export async function fetchWork24Jobs(
  apiKey: string,
  page: number,
  filters: Work24Filters = {},
): Promise<{ total: number; rawCount: number; records: Work24SyncRecord[] }> {
  const url = new URL(WORK24_LIST_URL);
  url.searchParams.set("authKey", apiKey);
  url.searchParams.set("callTp", "L");
  url.searchParams.set("returnType", "XML");
  url.searchParams.set("startPage", String(page));
  url.searchParams.set("display", "100");
  url.searchParams.set("sortOrderBy", "DESC");
  for (const [name, value] of Object.entries({
    region: filters.region,
    occupation: filters.occupation,
    education: filters.education,
    career: filters.career,
    salTp: filters.salaryType,
    minPay: filters.minPay === undefined ? undefined : String(filters.minPay),
    maxPay: filters.maxPay === undefined ? undefined : String(filters.maxPay),
    certLic: filters.certLic,
  })) {
    if (value) url.searchParams.set(name, value);
  }

  let response: Response;
  try {
    response = await fetchWithRetry(url, {
      headers: { Accept: "application/xml, text/xml" },
      cache: "no-store",
      redirect: "error",
    });
  } catch (error) {
    throw new Error(error instanceof Error && error.name === "TimeoutError"
      ? "work24_timeout"
      : "work24_network_error");
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("work24_auth_failed");
    if (response.status === 404) throw new Error("work24_service_not_available");
    if (response.status === 400) throw new Error("work24_invalid_parameters");
    if (response.status === 429) throw new Error("work24_rate_limited");
    if (response.status >= 500) throw new Error("work24_provider_unavailable");
    throw new Error(`work24_http_${response.status}`);
  }
  const raw = await response.text();
  if (raw.length > 10 * 1024 * 1024) throw new Error("work24_response_too_large");
  const payload: unknown = parser.parse(raw.replace(/^\uFEFF/, ""));
  if (hasProviderError(payload)) throw new Error(getProviderErrorCode(payload));

  const rawRecords = findWork24Records(payload, "wanted");
  const records = rawRecords.map(parseWork24Item).filter((record): record is Work24SyncRecord => record !== null);
  const rawTotal = findWork24Value(payload, "total");
  if (rawTotal === null) throw new Error("work24_invalid_response");
  const total = Number(rawTotal);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error("work24_invalid_response");
  return { total, rawCount: rawRecords.length, records };
}

function flattenDetails(value: unknown, prefix = "", depth = 0): Record<string, string> {
  if (depth > 5 || !isRecord(value)) return {};
  const result: Record<string, string> = {};
  for (const [key, child] of Object.entries(value)) {
    const name = key.startsWith("@_") ? key.slice(2) : key;
    if (/phone|tel|email|e-mail|mobile|fax|contact|manager|charger|담당자|연락처|전화|휴대폰|이메일/i.test(name)) continue;
    if (typeof child === "string" || typeof child === "number") {
      const content = String(child).trim();
      if (content) result[prefix ? `${prefix}.${name}` : name] = content.slice(0, 5000);
    } else if (isRecord(child)) {
      Object.assign(result, flattenDetails(child, prefix ? `${prefix}.${name}` : name, depth + 1));
    }
  }
  return result;
}

export async function enrichWork24Job(record: CatalogRecord): Promise<Work24DetailResult> {
  if (record.source_id !== WORK24_SOURCE_ID) return { status: "ready", record };
  const apiKey = process.env.WORK24_API_KEY?.trim();
  if (!apiKey) return { status: "not_configured" };

  const checkedAt = text(record.fields.work24_detail_checked_at);
  const checkedDate = checkedAt ? new Date(checkedAt) : null;
  const cachedDetails = record.fields.work24_detail;
  if (
    checkedDate &&
    !Number.isNaN(checkedDate.valueOf()) &&
    Date.now() - checkedDate.valueOf() < 24 * 60 * 60 * 1000 &&
    isRecord(cachedDetails)
  ) {
    return { status: "ready", record };
  }

  const config: SupabaseAdminConfig | null = getSupabaseAdminConfig();
  if (!config) return { status: "not_configured" };

  try {
    const url = new URL(WORK24_DETAIL_URL);
    url.searchParams.set("authKey", apiKey);
    url.searchParams.set("callTp", "D");
    url.searchParams.set("returnType", "XML");
    url.searchParams.set("wantedAuthNo", record.external_id);
    const response = await fetchWithRetry(url, {
      headers: { Accept: "application/xml, text/xml" },
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) return { status: "unavailable" };
    const raw = await response.text();
    if (raw.length > 10 * 1024 * 1024) return { status: "unavailable" };
    const payload: unknown = parser.parse(raw.replace(/^\uFEFF/, ""));
    if (hasProviderError(payload)) return { status: "unavailable" };
    const wanted = ["wanted", "wantedRoot", "wantedInfo", "wantedDetail"]
      .map((key) => findWork24Records(payload, key)[0])
      .find((record) => record !== undefined);
    if (!wanted) return { status: "unavailable" };

    const detail = flattenDetails(wanted);
    if (!Object.keys(detail).length) return { status: "unavailable" };
    const updatedFields = {
      ...record.fields,
      work24_detail: detail,
      work24_detail_checked_at: new Date().toISOString(),
    };
    const updateUrl = new URL(`${config.url}/rest/v1/catalog_records`);
    updateUrl.searchParams.set("id", `eq.${record.id}`);
    const update = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ fields: updatedFields }),
      cache: "no-store",
    });
    if (!update.ok) return { status: "unavailable" };
    return { status: "ready", record: { ...record, fields: updatedFields } };
  } catch {
    return { status: "unavailable" };
  }
}
