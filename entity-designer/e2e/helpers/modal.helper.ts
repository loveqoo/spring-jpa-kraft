import { type Page, type Locator, expect } from '@playwright/test';

export class ModalHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Any visible Ant Design modal */
  get modal(): Locator {
    return this.page.locator('.ant-modal').filter({ has: this.page.locator('.ant-modal-content') });
  }

  /** Add Table modal */
  get addTableModal(): Locator {
    return this.page.locator('.ant-modal').filter({ hasText: 'Add Table' });
  }

  /** Edit Table modal */
  get editTableModal(): Locator {
    return this.page.locator('.ant-modal').filter({ hasText: 'Edit Table' });
  }

  /** JSON Preview modal */
  get jsonPreviewModal(): Locator {
    return this.page.locator('.ant-modal').filter({ hasText: 'AggregateConfig JSON' });
  }

  /** DDL Preview modal */
  get ddlPreviewModal(): Locator {
    return this.page.locator('.ant-modal').filter({ hasText: 'DDL Export' });
  }

  /** Add a new table via the Add Table modal */
  async addTable(name: string) {
    await expect(this.addTableModal).toBeVisible();
    await this.addTableModal.locator('input').fill(name);
    await this.addTableModal.getByRole('button', { name: 'Create' }).click();
  }

  /** Get the error alert inside the currently visible modal */
  get modalError(): Locator {
    return this.page.locator('.ant-modal .ant-alert-error');
  }

  async expectModalError(text?: string) {
    await expect(this.modalError).toBeVisible();
    if (text) {
      await expect(this.modalError).toContainText(text);
    }
  }

  /** Rename table in Edit Table modal */
  async renameTable(newName: string) {
    const nameInput = this.editTableModal.locator('input').first();
    await nameInput.clear();
    await nameInput.fill(newName);
  }

  /** Click Save in Edit Table modal */
  async saveTableEdit() {
    await this.editTableModal.getByRole('button', { name: 'Save' }).click();
  }

  /** Delete table via Edit Table modal (with Popconfirm) */
  async deleteTable() {
    await this.editTableModal.getByRole('button', { name: 'Delete Table' }).click();
    // Popconfirm appears — click Delete to confirm
    await this.page.getByRole('button', { name: 'Delete' }).nth(-1).click();
  }

  /** Add a column in Edit Table modal */
  async addColumn() {
    await this.editTableModal.getByRole('button', { name: 'Add Column' }).click();
  }

  /** Add an index in Edit Table modal */
  async addIndex() {
    await this.editTableModal.getByRole('button', { name: 'Add Index' }).click();
  }

  /** Get the JSON content from the preview modal */
  async getJsonPreviewContent(): Promise<string> {
    return await this.jsonPreviewModal.locator('pre').innerText();
  }

  /** Get the DDL content from the preview modal */
  async getDdlPreviewContent(): Promise<string> {
    return await this.ddlPreviewModal.locator('pre').innerText();
  }

  /** Click Copy in a preview modal */
  async clickCopy() {
    await this.page.locator('.ant-modal').getByRole('button', { name: 'Copy' }).click();
  }

  /** Close modal via Cancel or X button */
  async closeModal() {
    await this.page.locator('.ant-modal .ant-modal-close').click();
  }
}
