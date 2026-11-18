const retryableStatuses = new Set([429, 500, 502, 503, 504]);
const maxRetries = 2;

function getRetryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    const delay = Number.isFinite(seconds) ? seconds * 1000 : dateDelay;
    if (Number.isFinite(delay) && delay >= 0) return Math.min(delay, 3000);
  }
  return 250 * 2 ** attempt;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function fetchWithRetry(
  url: URL,
  init: RequestInit,
  timeoutMs = 20_000,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await wait(250 * 2 ** attempt);
      continue;
    }

    if (!retryableStatuses.has(response.status) || attempt === maxRetries) return response;
    await response.body?.cancel().catch(() => undefined);
    await wait(getRetryDelay(response, attempt));
  }

  throw new Error("provider_request_failed");
}
