import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ToolbarHelper } from './helpers/toolbar.helper';
import { ModalHelper } from './helpers/modal.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';

async function dragHandle(page: import('@playwright/test').Page, source: import('@playwright/test').Locator, target: import('@playwright/test').Locator) {
  const sBbox = await source.boundingBox();
  const tBbox = await target.boundingBox();
  if (!sBbox || !tBbox) throw new Error('Handle not visible');
  await page.mouse.move(sBbox.x + sBbox.width / 2, sBbox.y + sBbox.height / 2);
  await page.mouse.down();
  await page.mouse.move(tBbox.x + tBbox.width / 2, tBbox.y + tBbox.height / 2, { steps: 10 });
  await page.mouse.up();
}

test.describe('FK column creation via ConnectionModal', () => {
  let schemaInput: SchemaInputHelper;
  let designer: DesignerHelper;
  let toolbar: ToolbarHelper;
  let modal: ModalHelper;
  let configPanel: ConfigPanelHelper;

  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    toolbar = new ToolbarHelper(page);
    modal = new ModalHelper(page);
    configPanel = new ConfigPanelHelper(page);

    await schemaInput.goto();
    await schemaInput.startEmptyCanvas();
    await schemaInput.expectDesignerVisible();

    // Create orders and products tables
    await toolbar.clickAddTable();
    await modal.addTable('orders');
    await toolbar.clickAddTable();
    await modal.addTable('products');
    await designer.expectNodeCount(2);
    await page.waitForTimeout(500);
  });

  test('drag orders→products: FK column added to orders node', async ({ page }) => {
    const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    const targetHandle = designer.node('products').locator('[data-handleid="products-left-0"]');
    await dragHandle(page, sourceHandle, targetHandle);

    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();

    // Default: source=Many, target=One → FK in orders (Many side)
    // Click Create
    await connectionModal.getByRole('button', { name: 'Create' }).click();
    await expect(connectionModal).not.toBeVisible();
    await designer.expectEdgeCount(1);

    // orders node should show products_id column
    await expect(designer.node('orders').getByText('products_id')).toBeVisible({ timeout: 5000 });

    // Verify via Edit Table
    await designer.clickNode('orders');
    await configPanel.clickEditTable();
    await expect(modal.editTableModal.locator('input[value="products_id"]').first()).toBeVisible();
  });

  test('drag products→orders: FK column added to products node', async ({ page }) => {
    // products is to the right of orders; use left handle of products → right handle of orders
    const sourceHandle = designer.node('products').locator('[data-handleid="products-left-0"]');
    const targetHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    await dragHandle(page, sourceHandle, targetHandle);

    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();

    // Default: source(products)=Many, target(orders)=One → FK in products
    await connectionModal.getByRole('button', { name: 'Create' }).click();
    await expect(connectionModal).not.toBeVisible();
    await designer.expectEdgeCount(1);

    // products node should show orders_id column
    await expect(designer.node('products').getByText('orders_id')).toBeVisible({ timeout: 5000 });
  });

  test('change cardinality to OneToMany: FK column on target side', async ({ page }) => {
    const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    const targetHandle = designer.node('products').locator('[data-handleid="products-left-0"]');
    await dragHandle(page, sourceHandle, targetHandle);

    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();

    // Change source to One, target to Many → FK should go to products (Many side)
    const sourceSegmented = connectionModal.locator('.ant-segmented').first();
    await sourceSegmented.getByText('One', { exact: true }).click();
    const targetSegmented = connectionModal.locator('.ant-segmented').nth(1);
    await targetSegmented.getByText('Many', { exact: true }).click();

    await connectionModal.getByRole('button', { name: 'Create' }).click();
    await expect(connectionModal).not.toBeVisible();
    await designer.expectEdgeCount(1);

    // products node should show orders_id column (FK on Many side = products)
    await expect(designer.node('products').getByText('orders_id')).toBeVisible({ timeout: 5000 });
    // orders should NOT have products_id
    await expect(designer.node('orders').getByText('products_id')).not.toBeVisible();
  });

});

test('FK column inserted before audit default columns', async ({ page }) => {
  const schemaInput = new SchemaInputHelper(page);
  const designer = new DesignerHelper(page);
  const toolbar = new ToolbarHelper(page);
  const modal = new ModalHelper(page);
  const configPanel = new ConfigPanelHelper(page);

  await schemaInput.goto();
  await schemaInput.startEmptyCanvas();
  await schemaInput.expectDesignerVisible();

  // Set audit default columns
  await toolbar.addAuditDefaultColumns();
  await page.locator('body').click({ position: { x: 0, y: 0 } });
  await expect(page.locator('.ant-popover:visible')).not.toBeVisible();

  // Create two tables (they will have id + audit columns)
  await toolbar.clickAddTable();
  await modal.addTable('orders');
  await toolbar.clickAddTable();
  await modal.addTable('products');
  await designer.expectNodeCount(2);
  await page.waitForTimeout(500);

  // Connect orders → products
  const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
  const targetHandle = designer.node('products').locator('[data-handleid="products-left-0"]');
  await dragHandle(page, sourceHandle, targetHandle);

  const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
  await expect(connectionModal).toBeVisible();
  await connectionModal.getByRole('button', { name: 'Create' }).click();
  await expect(connectionModal).not.toBeVisible();

  // Open Edit Table for orders
  await designer.clickNode('orders');
  await configPanel.clickEditTable();
  await expect(modal.editTableModal).toBeVisible({ timeout: 5000 });

  // Get ordered column names from all inputs in the modal
  const tableName = await modal.editTableModal.locator('input').first().inputValue();
  const allColInputs = modal.editTableModal.locator('input');
  const allCount = await allColInputs.count();
  const orderedNames: string[] = [];
  const skipValues = new Set([tableName, 'on', '']);
  for (let i = 0; i < allCount; i++) {
    const val = await allColInputs.nth(i).inputValue();
    if (!skipValues.has(val) && !/^\d+$/.test(val) && !val.startsWith('idx_')) {
      orderedNames.push(val);
    }
  }

  // Expected order: id, products_id, created_at, created_by, updated_at, updated_by
  const fkIdx = orderedNames.indexOf('products_id');
  const auditIdx = orderedNames.indexOf('created_at');
  expect(fkIdx).toBeGreaterThan(0); // after id
  expect(auditIdx).toBeGreaterThan(fkIdx); // audit columns after FK
});
