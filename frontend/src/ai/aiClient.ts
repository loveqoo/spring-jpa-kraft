export interface AISettings {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'ai_settings';

export function getAISettings(): AISettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.apiKey && parsed.baseUrl && parsed.model) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function clearAISettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isAIConfigured(): boolean {
  return getAISettings() !== null;
}

const TIMEOUT_MS = 90_000;

/**
 * Strip <think>...</think> blocks from text.
 * Handles both complete and in-progress (unclosed) think blocks.
 */
function stripThinkBlocks(text: string): string {
  if (!text.includes('<think>')) return text;
  let result = text.replace(/<think>[\s\S]*?<\/think>/g, '');
  // Remove in-progress (unclosed) <think> block at the end
  const openIdx = result.lastIndexOf('<think>');
  if (openIdx >= 0 && result.indexOf('</think>', openIdx) < 0) {
    result = result.slice(0, openIdx);
  }
  return result.trim();
}

/** Shared fetch setup for both streaming and non-streaming calls. */
async function fetchChatCompletion(
  messages: ChatMessage[],
  stream: boolean,
  signal?: AbortSignal,
): Promise<Response> {
  const settings = getAISettings();
  if (!settings) throw new Error('AI is not configured');

  const baseUrl = settings.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signals = signal ? [signal, timeout] : [timeout];
  const combinedSignal = AbortSignal.any(signals);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model: settings.model,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
        presence_penalty: 0.3,
        frequency_penalty: 0.3,
        ...(stream && { stream: true }),
      }),
      signal: combinedSignal,
    });
  } catch (e) {
    if ((e as Error).name === 'TimeoutError') {
      throw new Error('Request timed out (90s). Try a simpler prompt or check your model server.');
    }
    if ((e as Error).name === 'AbortError') throw e;
    throw new Error(`Network error: ${(e as Error).message}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid API key or insufficient permissions');
    }
    if (res.status === 429) {
      throw new Error('Rate limit exceeded. Please wait and try again.');
    }
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }

  return res;
}

/**
 * Call an OpenAI-compatible chat completions endpoint.
 * Returns the assistant message content string.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: { signal?: AbortSignal },
): Promise<string> {
  const res = await fetchChatCompletion(messages, false, options?.signal);

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Unexpected API response format');
  }
  return content;
}

/**
 * Call an OpenAI-compatible chat completions endpoint with streaming.
 * Calls onDelta with accumulated text as tokens arrive.
 * Returns the full response string when complete.
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  options: { signal?: AbortSignal; onDelta: (accumulated: string) => void },
): Promise<string> {
  const res = await fetchChatCompletion(messages, true, options.signal);

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body for streaming');

  const decoder = new TextDecoder();
  let accumulated = '';
  let buffer = '';
  let abortedByRepetition = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === 'string') {
            accumulated += delta;
            options.onDelta(stripThinkBlocks(accumulated));
          }
        } catch { /* skip malformed SSE lines */ }
      }

      // Detect repetition: abort early if the model is looping
      if (accumulated.length > 500 && detectRepetition(accumulated)) {
        console.warn('[AI] Repetition detected, aborting stream at length:', accumulated.length);
        abortedByRepetition = true;
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (abortedByRepetition) {
    console.log('[AI] stream aborted (repetition), salvaging JSON from:', accumulated.length, 'chars');
  }
  return accumulated;
}

/**
 * Detect repetition in streaming output.
 * Checks if a substring of sufficient length repeats consecutively.
 */
function detectRepetition(text: string): boolean {
  const tail = text.slice(-800);
  for (let len = 50; len <= Math.min(300, Math.floor(tail.length / 3)); len++) {
    const pattern = tail.slice(-len);
    const preceding = tail.slice(-len * 2, -len);
    if (pattern === preceding) return true;
  }
  return false;
}

/**
 * Extract JSON from a response that may contain extra text,
 * markdown fences, or <think> blocks.
 */
export function extractJSON(raw: string): unknown {
  const cleaned = stripThinkBlocks(raw);

  // Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch { /* continue */ }

  // Try extracting from markdown code block
  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1]);
    } catch { /* continue */ }
  }

  // Try finding first { ... } or [ ... ] block
  const braceStart = cleaned.indexOf('{');
  const bracketStart = cleaned.indexOf('[');
  const start = braceStart >= 0 && (bracketStart < 0 || braceStart < bracketStart) ? braceStart : bracketStart;
  if (start >= 0) {
    const sub = cleaned.slice(start);
    try {
      return JSON.parse(sub);
    } catch { /* continue */ }
    // Try removing trailing garbage after last } or ]
    const closingChar = sub[0] === '{' ? '}' : ']';
    const lastClose = sub.lastIndexOf(closingChar);
    if (lastClose > 0) {
      try {
        return JSON.parse(sub.slice(0, lastClose + 1));
      } catch { /* continue */ }
    }
  }

  console.error('[AI] Failed to extract JSON from:', raw.slice(0, 1000));
  throw new Error('Failed to parse JSON from AI response');
}
