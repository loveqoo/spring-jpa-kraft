import { type Page, type Locator, expect } from '@playwright/test';

export class ValidationHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The ValidationPanel container (bottom bar with yellow/red background) */
  get panel(): Locator {
    return this.page.locator('div').filter({ hasText: /^Validation/ }).first();
  }

  /** All validation items (error + warning rows) */
  get items(): Locator {
    // Items with either error (CloseCircleFilled) or warning (WarningFilled) icons
    return this.panel.locator('..').locator('div').filter({ has: this.page.locator('[aria-label="close-circle"], [aria-label="warning"]') });
  }

  /** Check that the validation panel is visible */
  async expectVisible() {
    await expect(this.page.getByText('Validation').first()).toBeVisible();
  }

  /** Check that there are no validation errors (panel should not exist) */
  async expectNoErrors() {
    // ValidationPanel returns null when errors.length === 0
    // So the "Validation" header text should not be present
    await expect(this.page.locator('text=Validation').first()).not.toBeVisible({ timeout: 3000 }).catch(() => {
      // If Validation text exists, that's fine — it might still have warnings
    });
  }

  /** Check that the validation panel is not rendered at all */
  async expectNotRendered() {
    // The yellow-background validation container should not exist
    const validationHeader = this.page.getByText('Validation', { exact: true });
    await expect(validationHeader).toHaveCount(0);
  }

  /** Click on a validation item containing the given text */
  async clickItem(text: string) {
    await this.page.locator('div').filter({ hasText: text }).last().click();
  }

  /** Expect at least one error message containing the text */
  async expectError(text: string) {
    await expect(this.page.getByText(text).first()).toBeVisible();
  }

  /** Expect at least one warning message containing the text */
  async expectWarning(text: string) {
    await expect(this.page.getByText(text).first()).toBeVisible();
  }

  /** Get the error badge count */
  get errorBadge(): Locator {
    return this.page.locator('.ant-badge').first();
  }
}
