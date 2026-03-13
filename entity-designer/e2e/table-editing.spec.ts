import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';
import { ModalHelper } from './helpers/modal.helper';

test.describe('E. Table Editing', () => {
  let schemaInput: SchemaInputHelper;
  let designer: DesignerHelper;
  let configPanel: ConfigPanelHelper;
  let modal: ModalHelper;

  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    configPanel = new ConfigPanelHelper(page);
    modal = new ModalHelper(page);
    await schemaInput.goto();
    await schemaInput.loadFixture('table-schema-single.json');
    await schemaInput.expectDesignerVisible();
  });

  test('E1: Edit Table modal opens', async () => {
    await designer.clickNode('users');
    await configPanel.clickEditTable();
    await expect(modal.editTableModal).toBeVisible();
  });

  test('E2: Rename table updates node name', async () => {
    await designer.clickNode('users');
    await configPanel.clickEditTable();
    await modal.renameTable('members');
    await modal.saveTableEdit();
    await designer.expectNodeVisible('members');
  });

  test('E3: Add column shows in table', async () => {
    await designer.clickNode('users');
    await configPanel.clickEditTable();

    // Count initial columns
    const initialCols = await modal.editTableModal.locator('input[placeholder="column_name"]').count();

    await modal.addColumn();

    // Should have one more column row
    const newCols = await modal.editTableModal.locator('input[placeholder="column_name"]').count();
    expect(newCols).toBe(initialCols + 1);

    await modal.saveTableEdit();
  });

  test('E4: Delete table removes node', async () => {
    await designer.clickNode('users');
    await configPanel.clickEditTable();
    await modal.deleteTable();
    await designer.expectNodeCount(0);
  });

  test('E5: Add index shows index row', async () => {
    await designer.clickNode('users');
    await configPanel.clickEditTable();

    // Count initial index name inputs
    const initialCount = await modal.editTableModal.locator('input[placeholder="idx_name"]').count();

    await modal.addIndex();

    // Should have one more index row
    const newCount = await modal.editTableModal.locator('input[placeholder="idx_name"]').count();
    expect(newCount).toBe(initialCount + 1);
  });
});
