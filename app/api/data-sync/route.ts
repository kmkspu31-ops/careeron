import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { NextResponse } from "next/server";
import { getSupabaseAdminConfig } from "@/lib/catalog/server";
import { fetchWork24Jobs, WORK24_LIST_URL, WORK24_SOURCE_ID, type Work24SyncRecord } from "@/lib/catalog/work24";
import type { CatalogType } from "@/lib/catalog/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => name === "item",
});
const sourceIds = [
  "narailter-public-jobs",
  "qnet-national-qualification-schedules",
  "qnet-ncs-competency-units",
  "esaeil-training-courses",
  WORK24_SOURCE_ID,
] as const;
const allowedApiUrls: Record<SourceId, string> = {
  "narailter-public-jobs": "https://apis.data.go.kr/1760000/PblJobService",
  "qnet-national-qualification-schedules": "https://apis.data.go.kr/B490007/qualExamSchd",
  "qnet-ncs-competency-units": "https://c.q-net.or.kr/openapi/Ncs1info/ncsinfo.do",
  "esaeil-training-courses": "https://apis.data.go.kr/1383000/nwis/workTrainningEducationCourseService",
  [WORK24_SOURCE_ID]: WORK24_LIST_URL,
};
type SourceId = (typeof sourceIds)[number];
type DataStatus = "active" | "expired" | "unknown";
type CatalogUpsert = {
  source_id: SourceId;
  record_type: CatalogType;
  external_id: string;
  title: string;
  summary: string;
  category: string | null;
  region: string | null;
  source_url: string | null;
  fields: Record<string, string | number | boolean>;
  data_status: DataStatus;
  last_verified_at: string;
  updated_at: string;
  expires_at: string | null;
};
type JsonRecord = Record<string, unknown>;
type SourceInfo = { id: SourceId; api_url: string; dataset_url: string; usage_status: string };
type SyncResult = {
  source_id: string;
  status: "completed" | "failed";
  seen?: number;
  inserted?: number;
  updated?: number;
  duplicates?: number;
  failed_records?: number;
  error?: string;
};

class SyncError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  return text ? text : null;
}

function getField(record: JsonRecord, names: string[]): string | null {
  for (const name of names) {
    const result = getString(record[name]);
    if (result) return result;
  }
  return null;
}

function findItems(value: unknown, depth = 0): JsonRecord[] | null {
  if (depth > 8 || !isRecord(value)) return null;
  for (const key of ["item", "items", "list", "data"]) {
    const candidate = value[key];
    if (Array.isArray(candidate) && candidate.every(isRecord)) return candidate;
    if (isRecord(candidate)) {
      const nested = findItems(candidate, depth + 1);
      if (nested) return nested;
    }
  }
  for (const child of Object.values(value)) {
    const nested = findItems(child, depth + 1);
    if (nested) return nested;
  }
  return null;
}

function findValue(value: unknown, names: string[], depth = 0): string | null {
  if (depth > 8 || !isRecord(value)) return null;
  for (const name of names) {
    const result = getString(value[name]);
    if (result) return result;
  }
  for (const child of Object.values(value)) {
    const result = findValue(child, names, depth + 1);
    if (result) return result;
  }
  return null;
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const compact = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  const normalized = compact ? `${compact[1]}-${compact[2]}-${compact[3]}` : value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const date = new Date(`${normalized}T23:59:59+09:00`);
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  }
  const date = new Date(normalized);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function statusFromExpiry(expiry: string | null): DataStatus {
  if (!expiry) return "unknown";
  return new Date(expiry).valueOf() < Date.now() ? "expired" : "active";
}

function stableExternalId(sourceId: SourceId, providerId: string | null, record: JsonRecord): string {
  const seed = providerId ?? JSON.stringify(record);
  return createHash("sha256").update(`${sourceId}\0${seed}`).digest("hex");
}

function safeHttpsUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function fetchPayload(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json, application/xml, text/xml;q=0.9" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new SyncError(`provider_http_${response.status}`);
  const text = (await response.text()).replace(/^\uFEFF/, "");
  if (!text.trim()) throw new SyncError("empty_provider_response");

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    try {
      payload = xmlParser.parse(text);
    } catch {
      throw new SyncError("invalid_provider_response");
    }
  }

  const resultCode = findValue(payload, ["resultCode", "resultcode", "errCode"]);
  if (resultCode && !["00", "0000", "0"].includes(resultCode)) {
    throw new SyncError(`provider_${resultCode.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "error"}`);
  }
  return payload;
}

function dataGovUrl(
  base: string,
  operation: string,
  key: string,
  params: Record<string, string>,
  keyName = "serviceKey",
): URL {
  const url = new URL(operation ? `${base.replace(/\/$/, "")}/${operation}` : base);
  url.searchParams.set(keyName, key);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url;
}

async function fetchDataGovPages(
  base: string,
  operation: string,
  key: string,
  params: (page: number) => Record<string, string>,
  maxPages = 20,
  keyName = "serviceKey",
): Promise<JsonRecord[]> {
  const all: JsonRecord[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const pageParams = params(page);
    const payload = await fetchPayload(dataGovUrl(base, operation, key, pageParams, keyName));
    const items = findItems(payload);
    if (!items) {
      const total = findValue(payload, ["totalCount", "totalcount"]);
      if (total === "0") break;
      throw new SyncError("provider_items_missing");
    }
    all.push(...items);
    if (items.length < Number(pageParams.numOfRows ?? 100)) break;
  }
  return all;
}

function baseRow(
  sourceId: SourceId,
  recordType: CatalogType,
  raw: JsonRecord,
  providerId: string | null,
  title: string,
  summary: string,
  category: string | null,
  fields: CatalogUpsert["fields"],
  expiresAt: string | null,
  sourceUrl: string | null,
  region: string | null = null,
): CatalogUpsert {
  const now = new Date().toISOString();
  return {
    source_id: sourceId,
    record_type: recordType,
    external_id: stableExternalId(sourceId, providerId, raw),
    title: title.slice(0, 500),
    summary: summary.slice(0, 5000),
    category: category?.slice(0, 200) ?? null,
    region: region?.slice(0, 200) ?? null,
    source_url: safeHttpsUrl(sourceUrl),
    fields,
    data_status: statusFromExpiry(expiresAt),
    last_verified_at: now,
    updated_at: now,
    expires_at: expiresAt,
  };
}

async function syncNaraJobs(source: SourceInfo, key: string): Promise<CatalogUpsert[]> {
  const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" });
  const today = dateFormatter.format(new Date());
  const start = new Date(`${today}T00:00:00+09:00`);
  start.setUTCDate(start.getUTCDate() - 90);
  const begin = dateFormatter.format(start);
  const items: JsonRecord[] = [];
  for (const postingType of ["e01", "e02", "e03", "e04", "e06"]) {
    for (const institutionType of ["g01", "g02", "g03", "g04"]) {
      items.push(...await fetchDataGovPages(source.api_url, "getList", key, (page) => ({
        pageNo: String(page),
        numOfRows: "100",
        Pblanc_ty: postingType,
        Instt_se: institutionType,
        Begin_de: begin,
        End_de: today,
        Sort_order: "1",
      }), 3));
    }
  }
  return items.flatMap((item) => {
    const title = getField(item, ["pblancNm", "pblanc_nm", "noticeNm", "title"]);
    if (!title) return [];
    const organization = getField(item, ["insttNm", "instt_nm", "orgnNm", "organization"]);
    const posted = getField(item, ["pblancDe", "pblanc_de", "registDe", "registerDate"]);
    const close = getField(item, ["endDe", "end_de", "rceptEndDe", "applicationEnd"]);
    const regionCode = getField(item, ["areacode", "areaCode", "area_code"]);
    const regionName = getField(item, ["areaNm", "areaName", "regionNm", "regionName"]);
    const providerId = getField(item, ["pblancNo", "pblanc_no", "noticeNo", "idx"]);
    const link = safeHttpsUrl(getField(item, ["detailUrl", "detail_url", "url", "link"]));
    const category = getField(item, ["pblancTyNm", "pblanc_ty_nm", "pblancTy", "jobTypeNm"]);
    const summary = organization ? `공고 기관: ${organization}` : "나라일터 공공 채용공고";
    return [baseRow(source.id, "job", item, providerId, title, summary, category, {
      organization: organization ?? "",
      posted_at: posted ?? "",
      application_end: close ?? "",
      region_code: regionCode ?? "",
    }, parseDate(close), link, regionName)];
  });
}

async function syncNcs(source: SourceInfo, key: string): Promise<CatalogUpsert[]> {
  const items = await fetchDataGovPages(source.api_url, "", key, (page) => ({
    pageNo: String(page),
    numOfRows: "100",
    type: "json",
  }), 20, "ServiceKey");
  return items.flatMap((item) => {
    const title = getField(item, ["compeUnitName", "compeUnitNm", "competencyUnitName", "unitName"]);
    if (!title) return [];
    const providerId = getField(item, ["ncsClCd", "ncsCompeUnitCd", "compeUnitCd", "competencyUnitCode", "ncsCd"]);
    const definition = getField(item, ["compeUnitDef", "competencyUnitDefinition", "definition", "contents"]) ?? "";
    const category = getField(item, ["ncsLclasCdnm", "ncsLclasNm", "largeCategoryName"]);
    return [baseRow(source.id, "skill", item, providerId, title, definition, category, {
      competency_code: providerId ?? "",
      competency_level: getField(item, ["compeUnitLevel", "competencyUnitLevel", "level"]) ?? "",
      major_category: category ?? "",
      middle_category: getField(item, ["ncsMclasCdnm", "ncsMclasNm", "middleCategoryName"]) ?? "",
      minor_category: getField(item, ["ncsSclasCdnm", "ncsSclasNm", "smallCategoryName"]) ?? "",
      detailed_category: getField(item, ["ncsSubdCdnm", "ncsSubdNm", "detailedCategoryName"]) ?? "",
    }, null, null)];
  });
}

async function syncQnetSchedules(source: SourceInfo, key: string): Promise<CatalogUpsert[]> {
  const currentYear = new Date().getFullYear();
  const all: CatalogUpsert[] = [];
  for (const year of [currentYear, currentYear + 1]) {
    const items = await fetchDataGovPages(source.api_url, "getQualExamSchdList", key, (page) => ({
      pageNo: String(page),
      numOfRows: "100",
      dataFormat: "json",
      implYy: String(year),
    }), 10);
    for (const item of items) {
      const name = getField(item, ["description", "qualgbNm", "qualNm", "examName"]);
      if (!name) continue;
      const examYear = getField(item, ["implYy", "implYear"]) ?? String(year);
      const round = getField(item, ["implSeq", "round", "examRound"]) ?? "";
      const docStart = getField(item, ["docRegStartDt", "docRegStartDate"]);
      const docEnd = getField(item, ["docRegEndDt", "docRegEndDate"]);
      const pracStart = getField(item, ["pracRegStartDt", "pracRegStartDate"]);
      const pracEnd = getField(item, ["pracRegEndDt", "pracRegEndDate"]);
      const docPass = getField(item, ["docPassDt"]);
      const pracPass = getField(item, ["pracPassDt"]);
      const laterDate = [docEnd, pracEnd, docPass, pracPass].map(parseDate).filter((value): value is string => value !== null).sort().pop() ?? null;
      const providerId = [examYear, round, getField(item, ["qualgbCd", "qualTypeCode"]) ?? "", name].join(":");
      all.push(baseRow(source.id, "certification", item, providerId, `${name} · ${examYear}년 시험일정`, "", getField(item, ["qualgbNm", "qualTypeName"]), {
        exam_year: examYear,
        exam_period: round,
        application_start: docStart ?? "",
        application_end: docEnd ?? "",
        practical_application_start: pracStart ?? "",
        practical_application_end: pracEnd ?? "",
        written_exam_start: getField(item, ["doExamStartDt", "docExamStartDt"]) ?? "",
        written_exam_end: getField(item, ["docExamEndDt"]) ?? "",
        written_result_date: docPass ?? "",
        practical_exam_start: getField(item, ["pracExamStartDt"]) ?? "",
        practical_exam_end: getField(item, ["pracExamEndDt"]) ?? "",
        practical_result_date: pracPass ?? "",
      }, laterDate, null));
    }
  }
  return all;
}

async function syncEsaeilCourses(source: SourceInfo, key: string): Promise<CatalogUpsert[]> {
  const items = await fetchDataGovPages(source.api_url, "getWorkTrainningEducationCourseList", key, (page) => ({
    pageNo: String(page),
    numOfRows: "100",
    type: "json",
  }), 20);
  return items.flatMap((item) => {
    const title = getField(item, ["eduCousNm", "eduCourseNm", "courseName", "courseNm"]);
    if (!title) return [];
    const year = getField(item, ["eduYr", "eduYear", "courseYear"]) ?? "";
    const goal = getField(item, ["eduGoal", "eduCousGoal", "courseGoal", "goal"]) ?? "";
    const end = getField(item, ["eduEndYmd", "eduEndDe", "courseEndDate", "endDate"]);
    const category = getField(item, ["eduSeNm", "eduTypeNm", "courseTypeName"]);
    const providerId = getField(item, ["eduCousNo", "eduCourseId", "courseId", "eduSeq"]);
    return [baseRow(source.id, "training", item, providerId, title, goal, category, {
      course_year: year,
      training_hours: getField(item, ["eduTime", "eduHour", "trainingHours"]) ?? "",
      course_end: end ?? "",
      reference_date: getField(item, ["dataCrtrYmd", "referenceDate"]) ?? "",
      target: getField(item, ["eduTarget", "target"]) ?? "",
    }, parseDate(end), null)];
  });
}

function work24Rows(source: SourceInfo, records: Work24SyncRecord[]): CatalogUpsert[] {
  return records.map((record) => ({
    ...baseRow(
      source.id,
      "job",
      { wantedAuthNo: record.externalId },
      record.externalId,
      record.title,
      [record.company, record.region].filter(Boolean).join(" · "),
      getString(record.fields.industry),
      record.fields,
      record.closeAt,
      record.sourceUrl,
      record.region || null,
    ),
    external_id: record.externalId,
  }));
}

async function getSource(config: { url: string; key: string }, sourceId: SourceId): Promise<SourceInfo> {
  const url = new URL(`${config.url}/rest/v1/data_sources`);
  url.searchParams.set("select", "id,api_url,dataset_url,usage_status");
  url.searchParams.set("id", `eq.${sourceId}`);
  const response = await fetch(url, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new SyncError("source_lookup_failed");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || !isRecord(rows[0])) throw new SyncError("source_not_found");
  const source = rows[0];
  if (source.usage_status !== "allowed") throw new SyncError("source_license_not_approved");
  if (source.api_url !== allowedApiUrls[sourceId]) throw new SyncError("source_api_unavailable");
  return { id: sourceId, api_url: source.api_url, dataset_url: String(source.dataset_url ?? ""), usage_status: String(source.usage_status) };
}

async function startSyncLog(config: { url: string; key: string }, sourceId: SourceId): Promise<number> {
  const stale = new URL(`${config.url}/rest/v1/data_sync_logs`);
  stale.searchParams.set("source_id", `eq.${sourceId}`);
  stale.searchParams.set("status", "eq.running");
  stale.searchParams.set("started_at", "lt." + new Date(Date.now() - 30 * 60_000).toISOString());
  const staleResponse = await fetch(stale, {
    method: "PATCH",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ status: "failed", completed_at: new Date().toISOString(), error_code: "stale_sync_recovered" }),
    cache: "no-store",
  });
  if (!staleResponse.ok) throw new SyncError("sync_log_recovery_failed");

  const response = await fetch(`${config.url}/rest/v1/data_sync_logs`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ source_id: sourceId, status: "running" }),
    cache: "no-store",
  });
  if (response.status === 409) throw new SyncError("sync_already_running");
  if (!response.ok) throw new SyncError("sync_log_create_failed");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows) || !isRecord(rows[0]) || typeof rows[0].id !== "number") {
    throw new SyncError("sync_log_create_failed");
  }
  return rows[0].id;
}

async function finishSyncLog(
  config: { url: string; key: string },
  logId: number,
  status: "completed" | "failed",
  seen: number,
  inserted: number,
  updated: number,
  duplicates: number,
  failedRecords: number,
  errorCode?: string,
): Promise<void> {
  const url = new URL(`${config.url}/rest/v1/data_sync_logs`);
  url.searchParams.set("id", `eq.${logId}`);
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status,
      completed_at: new Date().toISOString(),
      records_seen: seen,
      records_inserted: inserted,
      records_updated: updated,
      records_duplicate: duplicates,
      records_failed: failedRecords,
      error_code: errorCode ?? null,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new SyncError("sync_log_update_failed");
}

async function upsertRows(
  config: { url: string; key: string },
  sourceId: SourceId,
  records: CatalogUpsert[],
): Promise<{ seen: number; inserted: number; updated: number; duplicates: number }> {
  const rows = [...new Map(records.map((row) => [row.external_id, row])).values()];
  if (!rows.length) return { seen: records.length, inserted: 0, updated: 0, duplicates: 0 };

  const existing = new Set<string>();
  const externalIds = [...new Set(rows.map((row) => row.external_id))];
  for (let offset = 0; offset < externalIds.length; offset += 100) {
    const batch = externalIds.slice(offset, offset + 100);
    const url = new URL(`${config.url}/rest/v1/catalog_records`);
    url.searchParams.set("select", "external_id");
    url.searchParams.set("source_id", `eq.${sourceId}`);
    url.searchParams.set("external_id", `in.(${batch.join(",")})`);
    const response = await fetch(url, {
      headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new SyncError("existing_records_lookup_failed");
    const found: unknown = await response.json();
    if (!Array.isArray(found)) throw new SyncError("existing_records_lookup_failed");
    for (const row of found) if (isRecord(row) && typeof row.external_id === "string") existing.add(row.external_id);
  }

  const upsertUrl = new URL(`${config.url}/rest/v1/catalog_records`);
  upsertUrl.searchParams.set("on_conflict", "source_id,external_id");
  for (let offset = 0; offset < rows.length; offset += 100) {
    const response = await fetch(upsertUrl, {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows.slice(offset, offset + 100)),
      cache: "no-store",
    });
    if (!response.ok) throw new SyncError("catalog_upsert_failed");
  }
  const updated = rows.filter((row) => existing.has(row.external_id)).length;
  return {
    seen: records.length,
    inserted: rows.length - updated,
    updated,
    duplicates: records.length - rows.length,
  };
}

async function expireClosedRecords(config: { url: string; key: string }, sourceId: SourceId): Promise<void> {
  const url = new URL(`${config.url}/rest/v1/catalog_records`);
  url.searchParams.set("source_id", `eq.${sourceId}`);
  url.searchParams.set("data_status", "eq.active");
  url.searchParams.set("expires_at", `lt.${new Date().toISOString()}`);
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ data_status: "expired", updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) throw new SyncError("expired_records_update_failed");
}

async function syncOne(
  config: { url: string; key: string },
  sourceId: SourceId,
  work24Key?: string,
): Promise<SyncResult> {
  let logId: number | null = null;
  let seen = 0;
  let invalidRecords = 0;
  try {
    const source = await getSource(config, sourceId);
    logId = await startSyncLog(config, sourceId);
    const key = sourceId === WORK24_SOURCE_ID ? work24Key : process.env.DATA_GO_KR_API_KEY?.trim();
    if (!key) {
      throw new SyncError(sourceId === WORK24_SOURCE_ID
        ? "work24_api_key_not_configured"
        : "data_go_kr_api_key_not_configured");
    }
    let rows: CatalogUpsert[];
    switch (sourceId) {
      case "narailter-public-jobs":
        rows = await syncNaraJobs(source, key);
        break;
      case "qnet-national-qualification-schedules":
        rows = await syncQnetSchedules(source, key);
        break;
      case "qnet-ncs-competency-units":
        rows = await syncNcs(source, key);
        break;
      case "esaeil-training-courses":
        rows = await syncEsaeilCourses(source, key);
        break;
      case WORK24_SOURCE_ID: {
        const allRecords: Work24SyncRecord[] = [];
        let total = 0;
        const maxPages = 10;
        for (let page = 1; page <= maxPages; page += 1) {
          const result = await fetchWork24Jobs(key, page);
          total = result.total;
          seen += result.rawCount;
          invalidRecords += result.rawCount - result.records.length;
          allRecords.push(...result.records);
          if (result.records.length < 100 || page * 100 >= total) break;
          if (page < maxPages) await new Promise((resolve) => setTimeout(resolve, 150));
        }
        rows = work24Rows(source, allRecords);
        break;
      }
    }
    const counts = await upsertRows(config, sourceId, rows);
    await expireClosedRecords(config, sourceId);
    seen = Math.max(seen, counts.seen);
    await finishSyncLog(config, logId, "completed", seen, counts.inserted, counts.updated, counts.duplicates, invalidRecords);
    return { source_id: sourceId, status: "completed", ...counts, seen, failed_records: invalidRecords };
  } catch (error) {
    const code = error instanceof SyncError
      ? error.code
      : error instanceof Error && /^work24_[a-z0-9_]+$/.test(error.message)
        ? error.message
        : "sync_failed";
    if (logId !== null) {
      try {
        await finishSyncLog(config, logId, "failed", seen, 0, 0, 0, invalidRecords, code);
      } catch {
        return { source_id: sourceId, status: "failed", error: "sync_log_update_failed" };
      }
    }
    return { source_id: sourceId, status: "failed", error: code };
  }
}

function hasValidSecret(request: Request, expected: string): boolean {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export async function POST(request: Request) {
  const secret = process.env.DATA_SYNC_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "data_sync_not_configured" }, { status: 503 });
  if (!hasValidSecret(request, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const config = getSupabaseAdminConfig();
  if (!config) return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 4096) return NextResponse.json({ error: "request_too_large" }, { status: 413 });

  let requested: unknown;
  try {
    requested = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const body = isRecord(requested) ? requested : {};
  const requestedSources = body.sources === undefined ? sourceIds : body.sources;
  if (!Array.isArray(requestedSources) || requestedSources.length === 0 || requestedSources.length > sourceIds.length) {
    return NextResponse.json({ error: "invalid_sources" }, { status: 400 });
  }
  if (!requestedSources.every((source): source is SourceId => typeof source === "string" && sourceIds.includes(source as SourceId))) {
    return NextResponse.json({ error: "unsupported_or_unapproved_source" }, { status: 400 });
  }

  const work24Key = request.headers.get("x-work24-api-key")?.trim() || process.env.WORK24_API_KEY?.trim();
  if (work24Key && (work24Key.length > 512 || /[\r\n]/.test(work24Key))) {
    return NextResponse.json({ error: "invalid_work24_api_key_configuration" }, { status: 400 });
  }
  const results: SyncResult[] = [];
  for (const sourceId of [...new Set(requestedSources)]) {
    results.push(await syncOne(config, sourceId, work24Key));
  }
  const failed = results.some((result) => result.status === "failed");
  return NextResponse.json({ status: failed ? "partial" : "completed", results }, { status: failed ? 502 : 200 });
}
