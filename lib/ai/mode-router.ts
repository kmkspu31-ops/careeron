import type { AiExpertMode } from "@/lib/ai/types";

const patterns: Array<[AiExpertMode, RegExp]> = [
  ["resume", /자기소개서|자소서|이력서|지원동기|문장\s*(고쳐|수정|첨삭)/i],
  ["interview", /면접|모의\s*면접|예상\s*질문|답변\s*연습/i],
  ["job-analysis", /채용공고|공고\s*(분석|내용)|지원\s*자격|우대\s*조건|근무\s*조건/i],
  ["certification", /자격증|자격\s*시험|응시\s*자격|시험\s*일정/i],
  ["roadmap", /로드맵|취업\s*계획|준비\s*계획|학습\s*계획|목표\s*달성/i],
  ["career", /진로|직업|직무|커리어|적성|강점/i],
];

export function routeAiMode(message: string): AiExpertMode {
  return patterns.find(([, pattern]) => pattern.test(message))?.[0] ?? "general";
}
