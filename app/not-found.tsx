import Link from "next/link";
import { EmptyState } from "@/components/common/ui";

export default function NotFound() {
  return <div className="content-width"><div className="mx-auto max-w-xl"><EmptyState title="페이지를 찾을 수 없습니다" description="주소를 확인하거나 CAREERON 홈에서 다시 시작해보세요." /><div className="mt-5 text-center"><Link href="/" className="inline-flex h-10 items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">홈으로 이동</Link></div></div></div>;
}
