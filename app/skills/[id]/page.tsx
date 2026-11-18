import { notFound } from "next/navigation";
import { CatalogDetail, CatalogDetailUnavailable } from "@/components/common/catalog-detail";
import { getCatalogRecord } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCatalogRecord("skill", id);
  if (result.status !== "ready") return <CatalogDetailUnavailable type="skill" status={result.status} />;
  if (!result.record) notFound();
  return <CatalogDetail record={result.record} />;
}
