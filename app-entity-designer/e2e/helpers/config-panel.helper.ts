import { type Page, type Locator, expect } from '@playwright/test';

export class ConfigPanelHelper {
  readonly page: Page;
  /** The right sidebar panel — 300px wide, right side of the designer */
  readonly panel: Locator;

  constructor(page: Page) {
    this.page = page;
    // ConfigPanel is the 300px sidebar on the right (border-left: 1px solid)
    this.panel = page.locator('div[style*="width: 300px"]').or(
      page.locator('div[style*="width:300px"]'),
    );
  }

  /** The "Aggregate Root" toggle switch */
  get rootSwitch(): Locator {
    return this.page.locator('.ant-switch').first();
  }

  async toggleRoot() {
    await this.rootSwitch.click();
  }

  async expectRootEnabled() {
    await expect(this.rootSwitch).toHaveAttribute('aria-checked', 'true');
  }

  async expectRootDisabled() {
    await expect(this.rootSwitch).toHaveAttribute('aria-checked', 'false');
  }

  /** The "Confirmed" or "Suggested" tag in edge config */
  async expectEdgeTag(tag: 'Confirmed' | 'Suggested') {
    await expect(this.page.locator('.ant-tag').filter({ hasText: tag })).toBeVisible();
  }

  /** The Confirm button (edge config) */
  get confirmEdgeButton(): Locator {
    return this.page.getByRole('button', { name: 'Confirm' });
  }

  /** The Delete button (edge config) */
  get deleteEdgeButton(): Locator {
    return this.page.getByRole('button', { name: 'Delete' });
  }

  /** Click Confirm on a selected edge */
  async confirmEdge() {
    await this.confirmEdgeButton.click();
  }

  /** Click Delete on a selected edge */
  async deleteEdge() {
    await this.deleteEdgeButton.click();
  }

  /** Empty state text (nothing selected) */
  async expectEmptyState() {
    await expect(this.page.getByText('Select a node or edge to configure')).toBeVisible();
  }

  /** Expect the selected table name displayed in ConfigPanel header */
  async expectTableName(name: string) {
    await expect(this.page.locator('h5').filter({ hasText: name })).toBeVisible();
  }

  /** "Belongs to Aggregate" dropdown — scoped to ConfigPanel area */
  get aggregateSelect(): Locator {
    return this.configArea.locator('.ant-select').first();
  }

  /** The config panel area (right sidebar or drawer) */
  private get configArea(): Locator {
    return this.page.locator('div[style*="width: 300"]').or(this.page.locator('.ant-drawer-body'));
  }

  /** Find the aggregate combobox by looking for the select near the "Belongs to Aggregate" label */
  private getAggregateCombobox(): Locator {
    // The aggregate select is the first select in the config panel area
    // It appears after the "Belongs to Aggregate" label
    return this.configArea.locator('.ant-select').first().getByRole('combobox');
  }

  /** Select an aggregate from the "Belongs to Aggregate" dropdown */
  async assignAggregate(rootName: string) {
    const combobox = this.getAggregateCombobox();
    await combobox.click();
    await this.page.waitForTimeout(100);
    // Navigate options with keyboard until we find the target
    const options = this.page.locator('.ant-select-item-option');
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const text = await options.nth(i).textContent();
      if (text?.includes(rootName)) {
        await options.nth(i).scrollIntoViewIfNeeded();
        await options.nth(i).dispatchEvent('click');
        break;
      }
    }
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(100);
  }

  /** Remove aggregate assignment by selecting "(None — independent)" */
  async removeAggregate() {
    const combobox = this.getAggregateCombobox();
    await combobox.click();
    await this.page.waitForTimeout(100);
    const option = this.page.locator('.ant-select-item-option').filter({ hasText: 'None' }).first();
    await option.waitFor({ state: 'visible' });
    await option.dispatchEvent('click');
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(100);
  }

  /** Change cardinality using Segmented control (scoped to ConfigPanel) */
  async setCardinality(side: 'source' | 'target', value: 'One' | 'Many') {
    const panelArea = this.page.locator('div[style*="width: 300"]');
    const segmented = panelArea.locator('.ant-segmented').nth(side === 'source' ? 0 : 1);
    await segmented.getByText(value, { exact: true }).click();
  }

  /** Read the relation summary text (green box) */
  get relationSummary(): Locator {
    return this.page.locator('div').filter({ hasText: /^(Many|One) .+ (belong|has|associated)/ });
  }

  /** Per-node ID Strategy select (in ConfigPanel, contains "Inherit (global)") */
  get nodeIdStrategySelect(): Locator {
    const panelArea = this.page.locator('div[style*="width: 300"]');
    return panelArea.locator('.ant-select').filter({ hasText: /Inherit|IDENTITY|SEQUENCE|UUID|AUTO|NONE/i }).first();
  }

  /** Click "Edit Table" button in ConfigPanel */
  async clickEditTable() {
    await this.page.getByRole('button', { name: 'Edit Table' }).click();
  }
}
