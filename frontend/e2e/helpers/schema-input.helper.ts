import { type Page, type Locator, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class SchemaInputHelper {
  readonly page: Page;
  readonly textarea: Locator;
  readonly loadButton: Locator;
  readonly emptyCanvasButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.textarea = page.locator('textarea');
    this.loadButton = page.getByRole('button', { name: 'Load JSON' });
    this.emptyCanvasButton = page.getByRole('button', { name: 'Start with Empty Canvas' });
    this.errorAlert = page.locator('.ant-alert-error');
  }

  async goto() {
    await this.page.goto('/');
    await expect(this.page.getByText('Aggregate Designer').first()).toBeVisible();
  }

  async loadJson(json: string) {
    await this.textarea.fill(json);
    await this.loadButton.click();
  }

  async loadFixture(name: string) {
    const fixturePath = join(__dirname, '..', 'fixtures', name);
    const content = readFileSync(fixturePath, 'utf-8');
    await this.loadJson(content);
  }

  async startEmptyCanvas() {
    await this.emptyCanvasButton.click();
  }

  async expectDesignerVisible() {
    await expect(this.page.locator('.react-flow')).toBeVisible();
  }

  async expectError(text?: string) {
    await expect(this.errorAlert).toBeVisible();
    if (text) {
      await expect(this.errorAlert).toContainText(text);
    }
  }
}
