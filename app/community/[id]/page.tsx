import { notFound } from "next/navigation";
import { ArrowLeft, Eye, MessageCircle, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/common/action-button";
import { PageHeading, Surface, Tag } from "@/components/common/ui";

const posts = [
  { id: "career-start", category: "진로 고민", title: "첫 직무를 고를 때 가장 중요하게 본 기준은 무엇인가요?", author: "새싹러너", date: "2026.11.17", views: 128, comments: 18, body: "관심 있는 분야가 몇 가지 있는데, 첫 직무를 고를 때 무엇을 기준으로 삼으면 좋을지 궁금합니다. 실제 경험이나 조언을 나눠주세요." },
  { id: "study-routine", category: "취업 준비", title: "자격증 공부 루틴을 어떻게 유지하고 계신가요?", author: "차근차근", date: "2026.11.16", views: 96, comments: 12, body: "혼자 공부하다 보니 꾸준히 이어가는 게 쉽지 않네요. 각자 활용하는 공부 루틴이나 목표 관리 방법이 있다면 알려주세요." },
  { id: "portfolio-tips", category: "포트폴리오", title: "프로젝트 경험이 적을 때 포트폴리오 구성 팁", author: "design-note", date: "2026.11.15", views: 82, comments: 9, body: "프로젝트 경험이 많지 않은 상태에서 포트폴리오를 어떻게 구성하면 좋을까요? 배운 점과 과정을 잘 보여주는 방법이 궁금합니다." },
  { id: "interview", category: "면접 후기", title: "면접에서 협업 경험 질문에는 어떻게 답하면 좋을까요?", author: "취준일기", date: "2026.11.14", views: 63, comments: 7, body: "협업 중 어려움을 해결한 경험을 묻는 질문에 어떤 구조로 답변하면 효과적일지 고민입니다." },
];

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map(({ id }) => ({ id }));
}

export default async function CommunityPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = posts.find((item) => item.id === id);
  if (!post) notFound();
  return <div className="content-width"><Link href="/community" className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-blue-600"><ArrowLeft size={14} /> 커뮤니티로 돌아가기</Link><PageHeading eyebrow="COMMUNITY POST · EXAMPLE" title={post.title} description="예시 게시글 · 실제 사용자의 글이 아닙니다." /><Surface className="mx-auto max-w-4xl overflow-hidden"><div className="border-b border-[var(--border)] p-5 sm:p-7"><div className="flex items-center gap-2"><Tag tone="blue">{post.category}</Tag><span className="ml-auto text-xs text-muted">{post.date}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-sm font-semibold">{post.author} <span className="font-normal text-muted">· 예시 작성자</span></span><span className="flex gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><Eye size={14} />{post.views}</span><span className="inline-flex items-center gap-1"><MessageCircle size={14} />{post.comments}</span></span></div></div><div className="min-h-52 p-5 text-sm leading-7 text-muted sm:p-7">{post.body}<p className="mt-4">커뮤니티 기능이 연결되면 댓글과 공감으로 경험을 나눌 수 있습니다.</p></div><div className="flex items-center justify-between border-t border-[var(--border)] p-4"><p className="text-xs text-muted">답변 및 댓글 기능은 준비 중입니다.</p><ActionButton message="로그인 후 공감할 수 있습니다." className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:bg-[var(--surface-subtle)]"><ThumbsUp size={14} /> 공감</ActionButton></div></Surface></div>;
}
