export function getAiModel(): string | null {
  const model = process.env.OPENAI_MODEL?.trim();
  return model || null;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim() && getAiModel());
}
