import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';
import { ToolbarHelper } from './helpers/toolbar.helper';
import { ModalHelper } from './helpers/modal.helper';

test.describe('M. Multi-Aggregate', () => {
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
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();
  });

  test('M1: Two tables can both be aggregate roots', async () => {
    // Set orders as root
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await configPanel.expectRootEnabled();

    // Set payments as root
    await designer.clickNode('payments');
    await configPanel.toggleRoot();
    await configPanel.expectRootEnabled();

    // Both should show Root tag on their nodes
    await expect(designer.node('orders').getByText('Root')).toBeVisible();
    await expect(designer.node('payments').getByText('Root')).toBeVisible();
  });

  test('M2: Non-root entity can choose between multiple aggregates', async ({ page }) => {
    // Set orders and payments as roots
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await designer.clickNode('payments');
    await configPanel.toggleRoot();

    // Select order_items (non-root) — should be able to pick from orders or payments
    await designer.clickNode('order_items');

    // Open aggregate dropdown (scoped to ConfigPanel area)
    const configArea = page.locator('div[style*="width: 300"]').or(page.locator('.ant-drawer-body'));
    const combobox = configArea.locator('.ant-select').first().getByRole('combobox');
    await combobox.click();

    // Both roots should appear as options
    await expect(page.getByRole('option', { name: 'orders' })).toBeAttached();
    await expect(page.getByRole('option', { name: 'payments' })).toBeAttached();

    // Close dropdown
    await combobox.press('Escape');
  });

  test('M3: Entity assigned to aggregate A can be reassigned to aggregate B', async ({ page }) => {
    // Set orders and payments as roots
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await designer.clickNode('payments');
    await configPanel.toggleRoot();

    // Assign order_items to orders
    await designer.clickNode('order_items');
    await configPanel.assignAggregate('orders');
    await expect(page.getByText('orders aggregate')).toBeVisible();

    // Deselect and re-select node to get fresh ConfigPanel
    await designer.clickCanvas();
    await designer.clickNode('order_items');
    await expect(page.getByText('orders aggregate')).toBeVisible();

    // Reassign to payments
    await configPanel.assignAggregate('payments');
    await expect(page.getByText('payments aggregate')).toBeVisible();
  });

  test('M4: Removing a root unassigns entities from that aggregate', async ({ page }) => {
    // Set orders as root
    await designer.clickNode('orders');
    await configPanel.toggleRoot();

    // Assign order_items to orders
    await designer.clickNode('order_items');
    await configPanel.assignAggregate('orders');
    await expect(page.getByText('orders aggregate')).toBeVisible();

    // Remove orders as root
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await configPanel.expectRootDisabled();

    // order_items should no longer be assigned
    await designer.clickNode('order_items');
    await expect(page.getByText('Not a root entity')).toBeVisible();
    // "Belongs to Aggregate" section should not appear (no roots)
    await expect(page.getByText('Belongs to Aggregate')).not.toBeVisible();
  });

  test('M5: Export JSON with multiple aggregates', async ({ page }) => {
    // Set orders as root and payments as root
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await designer.clickNode('payments');
    await configPanel.toggleRoot();

    // Confirm all edges
    const edgeCount = await designer.allEdges.count();
    for (let i = 0; i < edgeCount; i++) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Confirm' }).click().catch(() => {
        // Edge might already be confirmed or Confirm button not visible
      });
    }

    await toolbar.clickExportJson();
    const jsonText = await modal.getJsonPreviewContent();
    const config = JSON.parse(jsonText);

    // Should have 2 aggregates
    expect(config.aggregates.length).toBe(2);
    const rootNames = config.aggregates.map((a: { root: string }) => a.root).sort();
    expect(rootNames).toEqual(['orders', 'payments']);
  });

  test('M6: Different aggregate roots get different border colors', async () => {
    // Set orders and payments as roots
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await designer.clickNode('payments');
    await configPanel.toggleRoot();

    // Both nodes should have distinct colored borders (not default gray)
    const ordersBorder = await designer.node('orders').locator('div').first().evaluate(
      (el) => getComputedStyle(el).borderColor,
    );
    const paymentsBorder = await designer.node('payments').locator('div').first().evaluate(
      (el) => getComputedStyle(el).borderColor,
    );

    // Both should have colored borders (not default #d9d9d9)
    expect(ordersBorder).not.toBe('rgb(217, 217, 217)');
    expect(paymentsBorder).not.toBe('rgb(217, 217, 217)');
    // Different colors
    expect(ordersBorder).not.toBe(paymentsBorder);
  });

  test('M7: Add fourth table and assign to existing aggregate', async ({ page }) => {
    // Set orders as root
    await designer.clickNode('orders');
    await configPanel.toggleRoot();

    // Add new table
    await toolbar.clickAddTable();
    await modal.addTable('shipping');
    await designer.expectNodeCount(4);

    // Assign shipping to orders aggregate
    await designer.clickNode('shipping');
    await configPanel.assignAggregate('orders');

    await expect(page.getByText('orders aggregate')).toBeVisible();
  });
});
