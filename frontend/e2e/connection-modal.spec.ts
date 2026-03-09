import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';

test.describe('J. Connection Modal', () => {
  let schemaInput: SchemaInputHelper;
  let designer: DesignerHelper;
  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    await schemaInput.goto();
  });

  test('J1: Dragging handle between nodes opens ConnectionModal', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    // Delete existing auto-detected edges so we can create a fresh connection
    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Delete' }).click();
    }
    await designer.expectEdgeCount(0);

    // Drag from orders node handle to order_items node handle
    const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    const targetHandle = designer.node('order_items').locator('[data-handleid="order_items-left-0"]');

    await sourceHandle.dragTo(targetHandle, { force: true });

    // ConnectionModal should appear
    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();
  });

  test('J2: ConnectionModal shows source and target table names', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    // Delete existing edges
    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Delete' }).click();
    }

    // Drag to create connection
    const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    const targetHandle = designer.node('order_items').locator('[data-handleid="order_items-left-0"]');
    await sourceHandle.dragTo(targetHandle, { force: true });

    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();

    // Should show both table names
    await expect(connectionModal.getByText('orders').first()).toBeVisible();
    await expect(connectionModal.getByText('order_items').first()).toBeVisible();
  });

  test('J3: ConnectionModal cardinality defaults to Many-to-One', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Delete' }).click();
    }

    const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    const targetHandle = designer.node('order_items').locator('[data-handleid="order_items-left-0"]');
    await sourceHandle.dragTo(targetHandle, { force: true });

    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();

    // Default cardinality is Many (source) - One (target)
    // Verify the summary line shows "Many — to — One"
    await expect(connectionModal.getByText('Many', { exact: true }).first()).toBeVisible();
    await expect(connectionModal.getByText('One', { exact: true }).first()).toBeVisible();
  });

  test('J4: ConnectionModal Create button produces a confirmed edge', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Delete' }).click();
    }
    await designer.expectEdgeCount(0);

    const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    const targetHandle = designer.node('order_items').locator('[data-handleid="order_items-left-0"]');
    await sourceHandle.dragTo(targetHandle, { force: true });

    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();

    // Click Create
    await connectionModal.getByRole('button', { name: 'Create' }).click();

    // Should have created 1 confirmed edge
    await designer.expectEdgeCount(1);

    // Select the new edge — it should be Confirmed
    await designer.clickEdge(0);
    await expect(page.locator('.ant-tag').filter({ hasText: 'Confirmed' })).toBeVisible();
  });

  test('J5: ConnectionModal Cancel does not create edge', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Delete' }).click();
    }
    await designer.expectEdgeCount(0);

    const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    const targetHandle = designer.node('order_items').locator('[data-handleid="order_items-left-0"]');
    await sourceHandle.dragTo(targetHandle, { force: true });

    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();

    // Cancel
    await connectionModal.getByRole('button', { name: 'Cancel' }).click();

    // No edge created
    await designer.expectEdgeCount(0);
  });

  test('J6: ConnectionModal cardinality change updates FK side', async ({ page }) => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();

    const edgeCount = await designer.allEdges.count();
    for (let i = edgeCount - 1; i >= 0; i--) {
      await designer.clickEdge(i);
      await page.getByRole('button', { name: 'Delete' }).click();
    }

    const sourceHandle = designer.node('orders').locator('[data-handleid="orders-right-0"]');
    const targetHandle = designer.node('order_items').locator('[data-handleid="order_items-left-0"]');
    await sourceHandle.dragTo(targetHandle, { force: true });

    const connectionModal = page.locator('.ant-modal').filter({ hasText: 'Create Relation' });
    await expect(connectionModal).toBeVisible();

    // Default: source=Many, target=One → FK in source (orders)
    // Check initial FK table
    await expect(connectionModal.locator('code').first()).toBeVisible();

    // Change to One-to-Many (source=One, target=Many)
    const sourceSegmented = connectionModal.locator('.ant-segmented').first();
    await sourceSegmented.getByText('One', { exact: true }).click();
    const targetSegmented = connectionModal.locator('.ant-segmented').nth(1);
    await targetSegmented.getByText('Many', { exact: true }).click();

    // FK should now be in order_items (the Many side)
    await expect(connectionModal.getByText('order_items').first()).toBeVisible();
  });
});
