import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';

test.describe('D. Aggregate Configuration', () => {
  let schemaInput: SchemaInputHelper;
  let designer: DesignerHelper;
  let configPanel: ConfigPanelHelper;

  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    configPanel = new ConfigPanelHelper(page);
    await schemaInput.goto();
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();
  });

  test('D1: Toggle Root ON shows Root indicator', async ({ page }) => {
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await configPanel.expectRootEnabled();
    // "Aggregate Root" text should appear in the description
    await expect(page.getByText('This entity is an aggregate root')).toBeVisible();
  });

  test('D2: Toggle Root OFF removes Root indicator', async ({ page }) => {
    // First enable root
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await configPanel.expectRootEnabled();
    // Then disable root
    await configPanel.toggleRoot();
    await configPanel.expectRootDisabled();
    await expect(page.getByText('Not a root entity')).toBeVisible();
  });

  test('D3: Assign entity to aggregate via dropdown', async ({ page }) => {
    // Set orders as root first
    await designer.clickNode('orders');
    await configPanel.toggleRoot();

    // Select order_items and assign to orders aggregate
    await designer.clickNode('order_items');
    await configPanel.assignAggregate('orders');

    // Verify assignment text
    await expect(page.getByText('orders aggregate')).toBeVisible();
  });

  test('D4: Remove entity from aggregate via dropdown', async ({ page }) => {
    // Set orders as root
    await designer.clickNode('orders');
    await configPanel.toggleRoot();

    // Assign order_items to orders aggregate
    await designer.clickNode('order_items');
    await configPanel.assignAggregate('orders');
    await expect(page.getByText('orders aggregate')).toBeVisible();

    // Remove from aggregate
    await configPanel.removeAggregate();
    await expect(page.getByText('Not a root entity')).toBeVisible();
  });
});
