import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ToolbarHelper } from './helpers/toolbar.helper';
import { ModalHelper } from './helpers/modal.helper';

test.describe('G. Export', () => {
  let schemaInput: SchemaInputHelper;
  let designer: DesignerHelper;
  let toolbar: ToolbarHelper;
  let modal: ModalHelper;

  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    toolbar = new ToolbarHelper(page);
    modal = new ModalHelper(page);
    await schemaInput.goto();
  });

  test('G1: JSON Export produces valid JSON with required fields', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    // Confirm all edges to remove warnings that might disable export
    // First delete all unconfirmed edges to avoid validation errors
    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Confirm' }).click();
    }

    await toolbar.clickExportJson();
    const jsonText = await modal.getJsonPreviewContent();
    const parsed = JSON.parse(jsonText);
    expect(parsed).toHaveProperty('basePackage');
    expect(parsed).toHaveProperty('aggregates');
    expect(parsed).toHaveProperty('idStrategy');
  });

  test('G2: Copy to clipboard shows success toast', async ({ context, page }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    // Confirm edges to enable export
    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Confirm' }).click();
    }

    await toolbar.clickExportJson();
    await modal.clickCopy();
    // Ant Design message.success shows "Copied to clipboard"
    await expect(page.getByText('Copied to clipboard')).toBeVisible();
  });

  test('G3: DDL Export contains CREATE TABLE', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    // Confirm edges first
    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Confirm' }).click();
    }

    await toolbar.clickExportDDL();
    const ddlText = await modal.getDdlPreviewContent();
    expect(ddlText).toContain('CREATE TABLE');
  });

  test('G4: Export buttons disabled when validation errors exist', async () => {
    await schemaInput.loadFixture('table-schema-no-pk.json');
    await schemaInput.expectDesignerVisible();
    await toolbar.expectExportDisabled();
  });
});
