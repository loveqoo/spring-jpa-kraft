import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';
import { ToolbarHelper } from './helpers/toolbar.helper';

test.describe('F. Global Settings', () => {
  let schemaInput: SchemaInputHelper;
  let designer: DesignerHelper;
  let configPanel: ConfigPanelHelper;
  let toolbar: ToolbarHelper;

  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    configPanel = new ConfigPanelHelper(page);
    toolbar = new ToolbarHelper(page);
    await schemaInput.goto();
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();
  });

  test('F1: Change base package', async () => {
    await toolbar.setBasePackage('com.myapp.order');
    await expect(toolbar.packageInput).toHaveValue('com.myapp.order');
  });

  test('F2: Change global ID strategy', async () => {
    await toolbar.setGlobalIdStrategy('UUID');
    // Verify the select now shows UUID
    await expect(toolbar.globalIdStrategySelect).toContainText('UUID');
  });

  test('F3: Per-node ID strategy select works', async ({ page }) => {
    await designer.clickNode('orders');
    // The ID Strategy select in ConfigPanel should be visible
    const idSelect = configPanel.nodeIdStrategySelect;
    await expect(idSelect).toBeVisible();
    // Change to SEQUENCE
    await idSelect.click();
    await page.locator('.ant-select-dropdown:visible').getByText('SEQUENCE', { exact: true }).click();
    await expect(idSelect).toContainText('SEQUENCE');
  });

  test('F4: Hidden columns audit preset adds tags', async ({ page }) => {
    await toolbar.addAuditHiddenColumns();
    // Should show audit column tags in the popover
    await expect(page.getByText('created_at').first()).toBeVisible();
    await expect(page.getByText('updated_at').first()).toBeVisible();
  });

  test('F5: Default columns audit preset adds columns', async ({ page }) => {
    await toolbar.addAuditDefaultColumns();
    // Should show audit column inputs in the popover
    await expect(page.locator('input[value="created_at"]').first()).toBeVisible();
  });
});
