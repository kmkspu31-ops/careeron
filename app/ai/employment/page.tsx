import { PageHeading } from "@/components/common/ui";
import { AssistantPanel } from "@/components/ai/assistant-panel";
import { EmploymentTools } from "@/components/ai/employment-tools";

export default function EmploymentAssistantPage() {
  return <div className="content-width space-y-6"><PageHeading eyebrow="AI JOB ASSISTANT" title="취업 준비를 한 곳에서" description="자기소개서, 면접, 채용공고 분석 등 전문 모드로 취업 준비를 도와드려요." /><AssistantPanel mode="employment" /><EmploymentTools /></div>;
}
