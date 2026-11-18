import { notFound } from "next/navigation";
import { CatalogDetail, CatalogDetailUnavailable } from "@/components/common/catalog-detail";
import { getCatalogRecord } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCatalogRecord("training", id);
  if (result.status !== "ready") return <CatalogDetailUnavailable type="training" status={result.status} />;
  if (!result.record) notFound();
  return <CatalogDetail record={result.record} />;
}
