import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';
import { ToolbarHelper } from './helpers/toolbar.helper';
import { ModalHelper } from './helpers/modal.helper';

test.describe('I. Round-trip', () => {
  test('I1: Schema load → configure → export → re-import preserves state', async ({ page }) => {
    const schemaInput = new SchemaInputHelper(page);
    const designer = new DesignerHelper(page);
    const configPanel = new ConfigPanelHelper(page);
    const toolbar = new ToolbarHelper(page);
    const modal = new ModalHelper(page);

    // 1. Load schema
    await schemaInput.goto();
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    // 2. Set orders as Root
    await designer.clickNode('orders');
    await configPanel.toggleRoot();
    await configPanel.expectRootEnabled();

    // 3. Confirm all edges
    const edgeCount = await designer.allEdges.count();
    for (let i = 0; i < edgeCount; i++) {
      await designer.clickEdge(i);
      await configPanel.confirmEdge();
    }

    // 4. Change base package
    const testPackage = 'com.roundtrip.test';
    await toolbar.setBasePackage(testPackage);

    // 5. Export JSON and capture content
    await toolbar.clickExportJson();
    const jsonText = await modal.getJsonPreviewContent();
    await modal.closeModal();

    // Verify JSON structure
    const exported = JSON.parse(jsonText);
    expect(exported.basePackage).toBe(testPackage);
    expect(exported.aggregates.length).toBeGreaterThanOrEqual(1);
    expect(exported.aggregates[0].root).toBe('orders');

    // 6. Go back to schema input
    await toolbar.clickBack();
    await expect(schemaInput.textarea).toBeVisible();

    // 7. Re-import the exported JSON
    await schemaInput.loadJson(jsonText);
    await schemaInput.expectDesignerVisible();

    // 8. Verify state is restored
    // - Base package preserved
    await expect(toolbar.packageInput).toHaveValue(testPackage);

    // - Root node preserved (orders should still be root)
    await designer.clickNode('orders');
    await configPanel.expectRootEnabled();

    // - Edges should be confirmed
    await designer.clickEdge(0);
    await configPanel.expectEdgeTag('Confirmed');

    // - All 3 nodes present
    await designer.expectNodeCount(3);
  });
});
