import "server-only";

import OpenAI from "openai";

export function createOpenAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  return new OpenAI({
    apiKey,
    maxRetries: 1,
    timeout: 45_000,
  });
}
