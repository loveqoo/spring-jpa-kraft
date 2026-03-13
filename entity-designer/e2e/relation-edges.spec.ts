import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';

test.describe('C. Relation & Edges', () => {
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

  test('C1: FK auto-detection creates at least 1 edge', async () => {
    const edgeCount = await designer.allEdges.count();
    expect(edgeCount).toBeGreaterThanOrEqual(1);
  });

  test('C2: Clicking an edge shows Suggested tag in ConfigPanel', async () => {
    await designer.clickEdge(0);
    await configPanel.expectEdgeTag('Suggested');
  });

  test('C3: Confirming an edge changes tag to Confirmed', async () => {
    await designer.clickEdge(0);
    await configPanel.confirmEdge();
    await configPanel.expectEdgeTag('Confirmed');
  });

  test('C4: Deleting an edge reduces edge count', async () => {
    const initialCount = await designer.allEdges.count();
    await designer.clickEdge(0);
    await configPanel.deleteEdge();
    await designer.expectEdgeCount(initialCount - 1);
  });

  test('C5: Changing cardinality updates summary text', async () => {
    await designer.clickEdge(0);
    // Toggle source cardinality
    await configPanel.setCardinality('source', 'One');
    await configPanel.setCardinality('target', 'One');
    // Summary should change to OneToOne text
    await expect(configPanel.relationSummary).toContainText('associated with');
  });
});
