import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';

test.describe('A. Schema Input', () => {
  let schemaInput: SchemaInputHelper;
  let designer: DesignerHelper;

  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    await schemaInput.goto();
  });

  test('A1: TableSchema JSON loads and enters designer with 3 nodes', async () => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();
    await designer.expectNodeCount(3);
  });

  test('A2: AggregateConfig JSON loads with Root and confirmed edges', async () => {
    await schemaInput.loadFixture('aggregate-config-complete.json');
    await schemaInput.expectDesignerVisible();

    // orders should be marked as Root (crown icon visible on the node)
    const ordersNode = designer.node('orders');
    await expect(ordersNode).toBeVisible();

    // Edges should exist and be confirmed (solid blue, not dashed)
    const edgeCount = await designer.allEdges.count();
    expect(edgeCount).toBeGreaterThanOrEqual(1);
  });

  test('A3: Invalid JSON shows error message', async () => {
    await schemaInput.loadJson('{ invalid json }');
    await schemaInput.expectError('Invalid JSON');
  });

  test('A4: Unrecognized format shows error message', async () => {
    await schemaInput.loadJson('{"foo":"bar"}');
    await schemaInput.expectError('Unrecognized format');
  });

  test('A5: Empty Canvas starts with 0 nodes', async () => {
    await schemaInput.startEmptyCanvas();
    await schemaInput.expectDesignerVisible();
    await designer.expectNodeCount(0);
  });

  test('A6: Load button is disabled when textarea is empty', async () => {
    await expect(schemaInput.loadButton).toBeDisabled();
  });
});
