export const AI_MODE_IDS = [
  "auto",
  "career",
  "resume",
  "interview",
  "job-analysis",
  "certification",
  "roadmap",
] as const;

export type AiMode = (typeof AI_MODE_IDS)[number];
export type AiExpertMode = Exclude<AiMode, "auto"> | "general";

export type AiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: AiExpertMode;
  status?: "streaming" | "completed" | "failed";
};

export type AiConversation = {
  id: string;
  title: string;
  mode: AiMode;
  messages: AiMessage[];
  updatedAt: number;
};
