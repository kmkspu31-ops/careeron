import { notFound } from "next/navigation";
import { CatalogDetail, CatalogDetailUnavailable } from "@/components/common/catalog-detail";
import { enrichWork24Job, WORK24_SOURCE_ID } from "@/lib/catalog/work24";
import { getCatalogRecord } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCatalogRecord("job", id);
  if (result.status !== "ready") return <CatalogDetailUnavailable type="job" status={result.status} />;
  if (!result.record) notFound();
  const isWork24 = result.record.source_id === WORK24_SOURCE_ID;
  const detail = isWork24 ? await enrichWork24Job(result.record) : null;
  const record = detail?.status === "ready" ? detail.record : result.record;

  return (
    <>
      {isWork24 && detail?.status !== "ready" && (
        <div className="content-width pt-4" role="status">
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
            {detail?.status === "not_configured"
              ? "고용24 상세정보 API 설정이 필요합니다. 현재 확인된 목록 정보와 공식 원문 링크를 표시합니다."
              : "고용24 상세정보를 불러오지 못했습니다. 현재 확인된 목록 정보와 공식 원문 링크를 표시합니다."}
          </p>
        </div>
      )}
      <CatalogDetail record={record} />
    </>
  );
}
