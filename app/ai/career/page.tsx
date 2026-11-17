import { AssistantPanel } from "@/components/ai/assistant-panel";
import { PageHeading } from "@/components/common/ui";

export default function CareerAssistantPage() {
  return <div className="content-width"><PageHeading eyebrow="AI CAREER COACH" title="AI 진로 상담" description="진로·취업 질문을 한 곳에서 상담하고, 필요한 전문 모드를 선택할 수 있어요." /><AssistantPanel mode="career" /></div>;
}
