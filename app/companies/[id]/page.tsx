import { notFound } from "next/navigation";
import { CatalogDetail, CatalogDetailUnavailable } from "@/components/common/catalog-detail";
import { getCatalogRecord } from "@/lib/catalog/server";

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCatalogRecord("company", id);
  if (result.status !== "ready") return <CatalogDetailUnavailable type="company" status={result.status} />;
  if (!result.record) notFound();
  return <CatalogDetail record={result.record} />;
}
