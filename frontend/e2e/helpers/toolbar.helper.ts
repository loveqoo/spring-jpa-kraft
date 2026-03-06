import { type Page, type Locator, expect } from '@playwright/test';

export class ToolbarHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  get backButton(): Locator {
    return this.page.getByRole('button', { name: 'arrow-left' });
  }

  get addTableButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Table' });
  }

  get exportDDLButton(): Locator {
    return this.page.getByRole('button', { name: 'Export DDL' });
  }

  get exportJsonButton(): Locator {
    return this.page.getByRole('button', { name: 'Export JSON' });
  }

  get basePackageInput(): Locator {
    return this.page.locator('input').filter({ hasText: '' }).locator('..').filter({ hasText: 'Package' }).locator('input');
  }

  /** Get the base package input directly */
  get packageInput(): Locator {
    // The input next to "Package" label
    return this.page.locator('input[placeholder="com.example.domain"]');
  }

  get globalIdStrategySelect(): Locator {
    // The select next to "ID Strategy" label in toolbar
    return this.page.locator('.ant-select').first();
  }

  get hiddenColumnsButton(): Locator {
    return this.page.getByRole('button', { name: /eye-invisible/i }).or(
      this.page.locator('button').filter({ has: this.page.locator('[aria-label="eye-invisible"]') })
    );
  }

  get defaultColumnsButton(): Locator {
    return this.page.getByRole('button', { name: /Default Columns/ });
  }

  async setBasePackage(value: string) {
    const input = this.packageInput;
    await input.clear();
    await input.fill(value);
  }

  async setGlobalIdStrategy(strategy: string) {
    await this.globalIdStrategySelect.click();
    await this.page.locator('.ant-select-dropdown').getByText(strategy, { exact: true }).click();
  }

  async clickAddTable() {
    await this.addTableButton.click();
  }

  async clickExportDDL() {
    await this.exportDDLButton.click();
  }

  async clickExportJson() {
    await this.exportJsonButton.click();
  }

  async clickBack() {
    await this.backButton.click();
  }

  async expectExportDisabled() {
    await expect(this.exportJsonButton).toBeDisabled();
    await expect(this.exportDDLButton).toBeDisabled();
  }

  async expectExportEnabled() {
    await expect(this.exportJsonButton).toBeEnabled();
    await expect(this.exportDDLButton).toBeEnabled();
  }

  /** Open Hidden Columns popover and add audit preset */
  async addAuditHiddenColumns() {
    await this.hiddenColumnsButton.click();
    await this.page.getByText('+ Add audit columns').click();
  }

  /** Open Default Columns popover and add audit preset */
  async addAuditDefaultColumns() {
    await this.defaultColumnsButton.click();
    await this.page.getByText('+ Audit columns').click();
  }
}
