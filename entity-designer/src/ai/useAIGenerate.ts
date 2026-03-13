import { useState, useRef, useCallback, useEffect } from 'react';
import type { ZodType } from 'zod';
import { chatCompletion, chatCompletionStream, extractJSON } from './aiClient';
import type { ChatMessage } from './aiClient';

export function useAIGenerate<T = unknown>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const generate = useCallback(async (
    messages: ChatMessage[],
    options?: { schema?: ZodType<T>; stream?: boolean },
  ): Promise<T | null> => {
    setLoading(true);
    setError(null);
    setStreamText(null);
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    try {
      let raw: string;
      if (options?.stream) {
        raw = await chatCompletionStream(messages, {
          signal,
          onDelta: (text) => setStreamText(text),
        });
        setStreamText(null);
      } else {
        raw = await chatCompletion(messages, { signal });
      }

      return validateAndRetry(raw, messages, signal, options?.schema);
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setError(null);
        return null;
      }
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
      setStreamText(null);
      abortRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { generate, loading, error, streamText, abort };
}

/**
 * Parse JSON, validate with Zod schema, and retry once if validation fails.
 */
async function validateAndRetry<T>(
  raw: string,
  messages: ChatMessage[],
  signal: AbortSignal,
  schema?: ZodType<T>,
): Promise<T> {
  const parsed = extractJSON(raw);

  if (!schema) return parsed as T;

  const result = schema.safeParse(parsed);
  if (result.success) return result.data;

  // Retry: feed error back to the model
  console.warn('[AI] Validation failed, retrying:', result.error.message);
  const retryMessages: ChatMessage[] = [
    ...messages,
    { role: 'assistant', content: raw },
    { role: 'user', content: `Your response had invalid format. Fix these errors and return corrected JSON only:\n${result.error.message}` },
  ];

  const retryRaw = await chatCompletion(retryMessages, { signal });
  const retryParsed = extractJSON(retryRaw);
  const retryResult = schema.safeParse(retryParsed);
  if (retryResult.success) return retryResult.data;

  // Both attempts failed — throw instead of returning invalid data
  console.error('[AI] Retry validation also failed, rejecting response');
  throw new Error('AI response did not match expected format after retry');
}
