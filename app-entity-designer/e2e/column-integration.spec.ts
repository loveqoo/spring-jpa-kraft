import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';
import { ToolbarHelper } from './helpers/toolbar.helper';
import { ModalHelper } from './helpers/modal.helper';

test.describe('L. Column Integration', () => {
  let schemaInput: SchemaInputHelper;
  let designer: DesignerHelper;
  let configPanel: ConfigPanelHelper;
  let toolbar: ToolbarHelper;
  let modal: ModalHelper;

  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    configPanel = new ConfigPanelHelper(page);
    toolbar = new ToolbarHelper(page);
    modal = new ModalHelper(page);
    await schemaInput.goto();
  });

  test('L1: Hidden columns are not displayed on table nodes', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    // Verify "customer_name" is visible on the orders node initially
    const ordersNode = designer.node('orders');
    await expect(ordersNode.getByText('customer_name')).toBeVisible();

    // Hide "customer_name" via the hidden columns popover
    await toolbar.hiddenColumnsButton.click();
    // Type the column name into the tags mode Select combobox
    const combobox = page.locator('.ant-popover:visible').getByRole('combobox');
    await combobox.fill('customer_name');
    await combobox.press('Enter');

    // Close the popover by clicking elsewhere
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // "customer_name" should no longer be visible on the node
    await expect(ordersNode.getByText('customer_name')).not.toBeVisible();
  });

  test('L2: Hidden audit columns preset hides columns from nodes', async ({ page }) => {
    // Use a custom fixture that includes audit columns
    const schemaWithAudit = {
      tables: [{
        name: 'products',
        schema: null,
        columns: [
          { name: 'id', typeName: 'BIGINT', typeValue: null, primaryKey: true, notNull: true, unique: false, autoIncrement: true, defaultValue: null, note: null },
          { name: 'name', typeName: 'VARCHAR', typeValue: 255, primaryKey: false, notNull: true, unique: false, autoIncrement: false, defaultValue: null, note: null },
          { name: 'created_at', typeName: 'DATETIME', typeValue: null, primaryKey: false, notNull: true, unique: false, autoIncrement: false, defaultValue: null, note: null },
          { name: 'updated_at', typeName: 'DATETIME', typeValue: null, primaryKey: false, notNull: true, unique: false, autoIncrement: false, defaultValue: null, note: null },
        ],
        indexes: [],
      }],
    };

    await schemaInput.loadJson(JSON.stringify(schemaWithAudit));
    await schemaInput.expectDesignerVisible();

    const node = designer.node('products');
    // Audit columns visible initially
    await expect(node.getByText('created_at')).toBeVisible();
    await expect(node.getByText('updated_at')).toBeVisible();

    // Apply audit columns hidden preset
    await toolbar.addAuditHiddenColumns();
    // Close popover
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // Audit columns should be hidden from node
    await expect(node.getByText('created_at')).not.toBeVisible();
    await expect(node.getByText('updated_at')).not.toBeVisible();
    // Non-audit column still visible
    await expect(node.getByText('name')).toBeVisible();
  });

  test('L3: Default columns are applied to new tables', async ({ page }) => {
    await schemaInput.startEmptyCanvas();
    await schemaInput.expectDesignerVisible();

    // Set default columns: audit preset
    await toolbar.addAuditDefaultColumns();
    // Close popover
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // Add a new table
    await toolbar.clickAddTable();
    await modal.addTable('products');

    // Click the new node and open Edit Table to see columns
    await designer.clickNode('products');
    await configPanel.clickEditTable();

    // Should have id + 4 audit columns = 5 columns total
    // Check that audit columns appear in the editor (colInputs count verified via visibility)
    // id column doesn't have placeholder="column_name", so count only the named columns
    // Actually, let's check that audit columns appear in the editor
    await expect(modal.editTableModal.locator('input[value="created_at"]').first()).toBeVisible();
    await expect(modal.editTableModal.locator('input[value="updated_at"]').first()).toBeVisible();
    await expect(modal.editTableModal.locator('input[value="created_by"]').first()).toBeVisible();
    await expect(modal.editTableModal.locator('input[value="updated_by"]').first()).toBeVisible();
  });

  test('L4: Default columns show on new table node', async ({ page }) => {
    await schemaInput.startEmptyCanvas();
    await schemaInput.expectDesignerVisible();

    // Set audit default columns
    await toolbar.addAuditDefaultColumns();
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // Add a new table
    await toolbar.clickAddTable();
    await modal.addTable('events');

    // The node should show the audit columns
    const node = designer.node('events');
    await expect(node.getByText('created_at')).toBeVisible();
    await expect(node.getByText('updated_at')).toBeVisible();
  });

  test('L5: Hidden columns still count in ConfigPanel column count', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    // orders has 4 columns (id, customer_name, total_amount, status)
    await designer.clickNode('orders');
    await expect(page.getByText('4 columns')).toBeVisible();

    // Hide customer_name
    await toolbar.hiddenColumnsButton.click();
    const combobox2 = page.locator('.ant-popover:visible').getByRole('combobox');
    await combobox2.fill('customer_name');
    await combobox2.press('Enter');
    await page.locator('body').click({ position: { x: 0, y: 0 } });

    // Click orders again to refresh ConfigPanel
    await designer.clickCanvas();
    await designer.clickNode('orders');
    // Column count should still show 4 (hidden doesn't remove from schema)
    await expect(page.getByText('4 columns')).toBeVisible();
  });
});
