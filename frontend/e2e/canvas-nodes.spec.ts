import { test } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';
import { ToolbarHelper } from './helpers/toolbar.helper';
import { ModalHelper } from './helpers/modal.helper';

test.describe('B. Canvas & Nodes', () => {
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

  test('B1: All 3 nodes are visible after schema load', async () => {
    await designer.expectNodeVisible('orders');
    await designer.expectNodeVisible('order_items');
    await designer.expectNodeVisible('payments');
  });

  test('B2: Clicking a node shows it in ConfigPanel', async () => {
    await designer.clickNode('orders');
    await configPanel.expectTableName('orders');
  });

  test('B3: Clicking empty canvas deselects and shows empty state', async () => {
    await designer.clickNode('orders');
    await configPanel.expectTableName('orders');
    await designer.clickCanvas();
    await configPanel.expectEmptyState();
  });

  test('B4: Add Table creates a new node', async () => {
    await toolbar.clickAddTable();
    await modal.addTable('customers');
    await designer.expectNodeCount(4);
    await designer.expectNodeVisible('customers');
  });

  test('B5: Duplicate table name shows error', async () => {
    await toolbar.clickAddTable();
    await modal.addTable('orders');
    await modal.expectModalError('already exists');
  });

  test('B6: Invalid table name (starts with number) shows error', async () => {
    await toolbar.clickAddTable();
    await modal.addTable('1invalid');
    await modal.expectModalError('must start with a letter');
  });
});
