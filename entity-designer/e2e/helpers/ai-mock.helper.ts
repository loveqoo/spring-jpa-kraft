import type { Locator, Page } from '@playwright/test';

const MOCK_BASE_URL = 'https://mock-ai.test/v1';
const MOCK_API_KEY = 'sk-test-key';
const MOCK_MODEL = 'test-model';

const AI_SETTINGS = {
  baseUrl: MOCK_BASE_URL,
  apiKey: MOCK_API_KEY,
  model: MOCK_MODEL,
};

/** Build an OpenAI-compatible chat completion JSON response */
function buildChatResponse(content: string) {
  return {
    id: 'mock-1',
    object: 'chat.completion',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
  };
}

/** Build SSE streaming lines from a content string */
function buildSSEStream(content: string): string {
  const chunkSize = Math.ceil(content.length / 3);
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    const piece = content.slice(i, i + chunkSize);
    const data = JSON.stringify({
      id: 'mock-1',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: { content: piece }, finish_reason: null }],
    });
    chunks.push(`data: ${data}\n\n`);
  }
  chunks.push('data: [DONE]\n\n');
  return chunks.join('');
}

export class AIMockHelper {
  constructor(private readonly page: Page) {}

  /** Inject AI settings into localStorage so AI features appear */
  async enableAI() {
    await this.page.evaluate((settings) => {
      localStorage.setItem('ai_settings', JSON.stringify(settings));
    }, AI_SETTINGS);
  }

  /** Locate the visible AI prompt textarea (scoped to avoid hidden Ant Design textareas) */
  get textarea(): Locator {
    return this.page.locator('textarea:visible').last();
  }

  /** Mock the chat completions endpoint with a non-streaming JSON response */
  async mockResponse(content: string) {
    await this.page.route(`${MOCK_BASE_URL}/chat/completions`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildChatResponse(content)),
      });
    });
  }

  /** Mock the chat completions endpoint with an SSE streaming response */
  async mockStreamingResponse(content: string) {
    await this.page.route(`${MOCK_BASE_URL}/chat/completions`, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: buildSSEStream(content),
      });
    });
  }

  /** Mock with an error response */
  async mockError(status: number, message: string) {
    await this.page.route(`${MOCK_BASE_URL}/chat/completions`, async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message } }),
      });
    });
  }

  /** Mock a hanging request (never resolves) */
  async mockHangingRequest() {
    await this.page.route(`${MOCK_BASE_URL}/chat/completions`, async () => {
      // Intentionally never fulfill — simulates a long-running request
      await new Promise(() => {});
    });
  }

  /** Mock the /models endpoint for connection test */
  async mockModelsEndpoint(ok = true) {
    await this.page.route(`${MOCK_BASE_URL}/models`, async (route) => {
      if (ok) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: [{ id: MOCK_MODEL }] }),
        });
      } else {
        await route.fulfill({ status: 401, body: 'Unauthorized' });
      }
    });
  }
}
