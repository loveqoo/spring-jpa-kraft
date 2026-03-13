import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ToolbarHelper } from './helpers/toolbar.helper';
import { AIMockHelper } from './helpers/ai-mock.helper';

let schemaInput: SchemaInputHelper;
let designer: DesignerHelper;
let toolbar: ToolbarHelper;
let aiMock: AIMockHelper;

test.describe('N. AI Flow', () => {
  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    designer = new DesignerHelper(page);
    toolbar = new ToolbarHelper(page);
    aiMock = new AIMockHelper(page);
  });

  test('N1: AI settings save enables AI features', async ({ page }) => {
    await schemaInput.goto();

    // AI features should not be visible initially
    await expect(page.getByText('or generate with AI')).not.toBeVisible();

    // Open settings modal via gear icon
    await page.locator('button[title="AI Assistant Settings"]').click();
    const modal = page.locator('.ant-modal').filter({ hasText: 'AI Assistant Settings' });
    await expect(modal).toBeVisible();

    // Fill settings using placeholder-based selectors
    const baseUrlInput = modal.getByPlaceholder('https://api.openai.com/v1');
    await baseUrlInput.clear();
    await baseUrlInput.fill('https://mock-ai.test/v1');
    await modal.locator('input[type="password"]').fill('sk-test-key');
    const modelInput = modal.getByPlaceholder('gpt-4o');
    await modelInput.clear();
    await modelInput.fill('test-model');

    // Save
    await modal.getByRole('button', { name: 'Save' }).click();
    await expect(modal).not.toBeVisible();

    // Reload to pick up settings
    await page.reload();
    await expect(page.getByText('Aggregate Designer').first()).toBeVisible();

    // AI section should now be visible
    await expect(page.getByText('or generate with AI')).toBeVisible();
  });

  test('N2: AI schema generation creates tables from prompt', async ({ page }) => {
    // Enable AI before navigation
    await page.goto('/');
    await aiMock.enableAI();
    await page.reload();
    await expect(page.getByText('Aggregate Designer').first()).toBeVisible();
    await expect(page.getByText('or generate with AI')).toBeVisible();

    // Mock streaming response
    const mockResponse = JSON.stringify({
      tables: [
        { name: 'users', columns: ['username VARCHAR(100)', 'email VARCHAR(255) NOT NULL'] },
        { name: 'posts', columns: ['title VARCHAR(200)', 'content TEXT'] },
      ],
      relationships: [{ parent: 'users', child: 'posts' }],
    });
    await aiMock.mockStreamingResponse(mockResponse);

    // Type prompt and submit
    await aiMock.textarea.fill('Create a blog with users and posts');
    await page.getByRole('button', { name: 'send' }).click();

    // Should enter designer with the generated tables
    await schemaInput.expectDesignerVisible();
    await designer.expectNodeCount(2);
    await expect(designer.node('users')).toBeVisible();
    await expect(designer.node('posts')).toBeVisible();
  });

  // N3-N8: Designer-level AI tests share a common setup
  test.describe('with designer', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await aiMock.enableAI();
      await page.reload();
      await expect(page.getByText('Aggregate Designer').first()).toBeVisible();
      await schemaInput.loadFixture('table-schema-orders.json');
      await schemaInput.expectDesignerVisible();
    });

    test('N3: AI designer modification — apply diff', async ({ page }) => {
      await designer.expectNodeCount(3);

      const deltaResponse = JSON.stringify({
        add_columns: [{ table: 'orders', columns: ['email VARCHAR(255) NOT NULL'] }],
      });
      await aiMock.mockStreamingResponse(deltaResponse);

      // Open AI panel
      await page.locator('.ant-float-btn').click();
      await expect(page.getByText('AI Assistant')).toBeVisible();

      // Submit
      await aiMock.textarea.fill('Add email column to orders');
      await page.getByRole('button', { name: 'send' }).click();

      // Diff preview
      const diffModal = page.locator('.ant-modal').filter({ hasText: 'AI Changes Preview' });
      await expect(diffModal).toBeVisible({ timeout: 10_000 });
      await expect(diffModal.getByText('Modify table')).toBeVisible();
      await expect(diffModal.getByText('orders')).toBeVisible();
      await expect(diffModal.getByText('+ email VARCHAR(255) NOT NULL')).toBeVisible();

      // Apply
      await diffModal.getByRole('button', { name: /Apply/ }).click();
      await expect(diffModal).not.toBeVisible();

      // Verify column added on the node
      await expect(designer.node('orders').getByText('email')).toBeVisible();
    });

    test('N4: AI designer modification — reject diff', async ({ page }) => {
      const deltaResponse = JSON.stringify({
        add_columns: [{ table: 'orders', columns: ['email VARCHAR(255)'] }],
      });
      await aiMock.mockStreamingResponse(deltaResponse);

      await page.locator('.ant-float-btn').click();
      await aiMock.textarea.fill('Add email');
      await page.getByRole('button', { name: 'send' }).click();

      const diffModal = page.locator('.ant-modal').filter({ hasText: 'AI Changes Preview' });
      await expect(diffModal).toBeVisible({ timeout: 10_000 });

      // Reject
      await diffModal.getByRole('button', { name: /Reject|Cancel/ }).click();
      await expect(diffModal).not.toBeVisible();

      // Verify nothing changed
      await expect(designer.node('orders').getByText('email')).not.toBeVisible();
    });

    test('N5: AI undo reverts applied changes', async ({ page }) => {
      await designer.expectNodeCount(3);

      const deltaResponse = JSON.stringify({
        add_tables: [{ name: 'reviews', columns: ['rating INT', 'comment TEXT'] }],
      });
      await aiMock.mockStreamingResponse(deltaResponse);

      await page.locator('.ant-float-btn').click();
      await aiMock.textarea.fill('Add reviews table');
      await page.getByRole('button', { name: 'send' }).click();

      const diffModal = page.locator('.ant-modal').filter({ hasText: 'AI Changes Preview' });
      await expect(diffModal).toBeVisible({ timeout: 10_000 });
      await diffModal.getByRole('button', { name: /Apply/ }).click();
      await expect(diffModal).not.toBeVisible();

      // Verify new table
      await designer.expectNodeCount(4);
      await expect(designer.node('reviews')).toBeVisible();

      // Undo
      const undoButton = page.locator('button[title="Undo AI change"]').first();
      await expect(undoButton).toBeVisible();
      await undoButton.click();

      // Verify reverted
      await designer.expectNodeCount(3);
      await expect(designer.node('reviews')).not.toBeVisible();
    });

    test('N6: AI abort stops generation', async ({ page }) => {
      await aiMock.mockHangingRequest();

      await page.locator('.ant-float-btn').click();
      await aiMock.textarea.fill('Some modification');
      await page.getByRole('button', { name: 'send' }).click();

      // Stop button should appear
      const stopButton = page.getByRole('button', { name: 'stop' });
      await expect(stopButton).toBeVisible({ timeout: 5_000 });
      await stopButton.click();

      // Send button should reappear
      await expect(page.getByRole('button', { name: 'send' })).toBeVisible({ timeout: 5_000 });

      // No diff modal
      await expect(page.locator('.ant-modal').filter({ hasText: 'AI Changes Preview' })).not.toBeVisible();
    });

    test('N7: AI error response shows error message', async ({ page }) => {
      await aiMock.mockError(429, 'Rate limit exceeded');

      await page.locator('.ant-float-btn').click();
      await aiMock.textarea.fill('Some modification');
      await page.getByRole('button', { name: 'send' }).click();

      await expect(page.locator('.ant-alert-error')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('.ant-alert-error')).toContainText('Rate limit');
    });

    test('N8: AI diff preview — deselect items before applying', async ({ page }) => {
      const deltaResponse = JSON.stringify({
        add_columns: [{ table: 'orders', columns: ['email VARCHAR(255)'] }],
        add_tables: [{ name: 'reviews', columns: ['rating INT'] }],
      });
      await aiMock.mockStreamingResponse(deltaResponse);

      await page.locator('.ant-float-btn').click();
      await aiMock.textarea.fill('Add email and reviews');
      await page.getByRole('button', { name: 'send' }).click();

      const diffModal = page.locator('.ant-modal').filter({ hasText: 'AI Changes Preview' });
      await expect(diffModal).toBeVisible({ timeout: 10_000 });

      // Verify both items shown
      await expect(diffModal.getByText('Modify table')).toBeVisible();
      await expect(diffModal.getByText('Add table')).toBeVisible();

      // Verify initial state: all selected (Apply shows count 2)
      await expect(diffModal.getByRole('button', { name: /Apply \(2\)/ })).toBeEnabled();

      // Deselect all
      await diffModal.getByText('Select all').click();
      await expect(diffModal.getByRole('button', { name: /Apply \(0\)/ })).toBeDisabled();

      // Re-select all
      await diffModal.getByText('Select all').click();
      await expect(diffModal.getByRole('button', { name: /Apply \(2\)/ })).toBeEnabled();

      await diffModal.getByRole('button', { name: /Apply/ }).click();
      await expect(diffModal).not.toBeVisible();
    });

    test('N9: AI apply and undo preserve hidden/default column settings', async ({ page }) => {
      // 1. Set hidden columns audit preset
      await toolbar.addAuditHiddenColumns();
      await expect(page.getByText('created_at').first()).toBeVisible();
      // Close popover
      await page.locator('body').click({ position: { x: 0, y: 0 } });

      // 2. Set default columns audit preset
      await toolbar.addAuditDefaultColumns();
      await expect(page.locator('input[value="created_at"]').first()).toBeVisible();
      // Close popover
      await page.locator('body').click({ position: { x: 0, y: 0 } });

      // 3. AI apply — add a new table
      const deltaResponse = JSON.stringify({
        add_tables: [{ name: 'reviews', columns: ['rating INT'] }],
      });
      await aiMock.mockStreamingResponse(deltaResponse);

      await page.locator('.ant-float-btn').click();
      await aiMock.textarea.fill('Add reviews table');
      await page.getByRole('button', { name: 'send' }).click();

      const diffModal = page.locator('.ant-modal').filter({ hasText: 'AI Changes Preview' });
      await expect(diffModal).toBeVisible({ timeout: 10_000 });
      await diffModal.getByRole('button', { name: /Apply/ }).click();
      await expect(diffModal).not.toBeVisible();

      // 4. Verify hidden columns setting preserved after apply
      await toolbar.hiddenColumnsButton.click();
      await expect(page.getByText('created_at').first()).toBeVisible();
      await page.locator('body').click({ position: { x: 0, y: 0 } });

      // 5. Verify default columns setting preserved after apply
      await toolbar.defaultColumnsButton.click();
      await expect(page.locator('input[value="created_at"]').first()).toBeVisible();
      await page.locator('body').click({ position: { x: 0, y: 0 } });

      // 6. Undo
      const undoButton = page.locator('button[title="Undo AI change"]').first();
      await undoButton.click();

      // 7. Verify hidden columns setting preserved after undo
      await toolbar.hiddenColumnsButton.click();
      await expect(page.getByText('created_at').first()).toBeVisible();
      await page.locator('body').click({ position: { x: 0, y: 0 } });

      // 8. Verify default columns setting preserved after undo
      await toolbar.defaultColumnsButton.click();
      await expect(page.locator('input[value="created_at"]').first()).toBeVisible();
    });
  });
});
