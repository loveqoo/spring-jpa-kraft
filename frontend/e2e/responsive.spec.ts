import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop-narrow', width: 1100, height: 800 },
  { name: 'desktop', width: 1440, height: 900 },
];

test.describe('Responsive Layout', () => {
  for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`R-${vp.name}-1: SchemaInput page renders without overflow`, async ({ page }) => {
        const helper = new SchemaInputHelper(page);
        await helper.goto();
        await expect(page.getByText('Aggregate Designer')).toBeVisible();
        await expect(page.getByRole('button', { name: /Load JSON/i })).toBeVisible();
        await page.screenshot({ path: `test-results/responsive-${vp.name}-schema-input.png`, fullPage: true });
      });

      test(`R-${vp.name}-2: Designer toolbar fits without overflow`, async ({ page }) => {
        const helper = new SchemaInputHelper(page);
        await helper.goto();
        await helper.loadFixture('table-schema-orders.json');
        await helper.expectDesignerVisible();

        // Toolbar should be exactly 56px tall (no vertical overflow)
        const toolbar = page.locator('div[style*="height: 56"]').first();
        const box = await toolbar.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.height).toBeLessThanOrEqual(60);

        // Last button (Export JSON) must be within viewport (no horizontal clipping)
        const lastButton = toolbar.getByRole('button').last();
        const btnBox = await lastButton.boundingBox();
        expect(btnBox).not.toBeNull();
        expect(btnBox!.x + btnBox!.width).toBeLessThanOrEqual(vp.width);

        await page.screenshot({ path: `test-results/responsive-${vp.name}-designer.png` });
      });

      test(`R-${vp.name}-3: Canvas is visible and usable`, async ({ page }) => {
        const helper = new SchemaInputHelper(page);
        await helper.goto();
        await helper.loadFixture('table-schema-orders.json');
        await helper.expectDesignerVisible();

        // ReactFlow canvas should be visible
        const canvas = page.locator('.react-flow');
        await expect(canvas).toBeVisible();
        const canvasBox = await canvas.boundingBox();
        expect(canvasBox).not.toBeNull();
        // Canvas should have reasonable width (at least 200px)
        expect(canvasBox!.width).toBeGreaterThan(200);
      });

      if (vp.width <= 1024) {
        // Mobile/Tablet specific tests
        test(`R-${vp.name}-4: ConfigPanel opens as Drawer on node click`, async ({ page }) => {
          const helper = new SchemaInputHelper(page);
          await helper.goto();
          await helper.loadFixture('table-schema-orders.json');
          await helper.expectDesignerVisible();

          // Click a node
          await page.locator('.react-flow__node').first().click();
          // Drawer should open
          await expect(page.locator('.ant-drawer')).toBeVisible();
          // ConfigPanel content should be inside the drawer
          await expect(page.locator('.ant-drawer').getByText('Aggregate Root')).toBeVisible();

          await page.screenshot({ path: `test-results/responsive-${vp.name}-drawer-open.png` });
        });

        test(`R-${vp.name}-5: Settings popover opens with Package and ID Strategy`, async ({ page }) => {
          const helper = new SchemaInputHelper(page);
          await helper.goto();
          await helper.loadFixture('table-schema-orders.json');
          await helper.expectDesignerVisible();

          // Click settings gear icon
          await page.locator('.anticon-setting').click();
          // Popover should show Package and ID Strategy fields
          await expect(page.locator('.ant-popover').getByText('Package')).toBeVisible();
          await expect(page.locator('.ant-popover').getByText('ID Strategy')).toBeVisible();

          await page.screenshot({ path: `test-results/responsive-${vp.name}-settings-popover.png` });
        });
      }

      if (vp.width > 1024) {
        // Desktop specific tests
        test(`R-${vp.name}-4: ConfigPanel is inline (not a Drawer)`, async ({ page }) => {
          const helper = new SchemaInputHelper(page);
          await helper.goto();
          await helper.loadFixture('table-schema-orders.json');
          await helper.expectDesignerVisible();

          // ConfigPanel should be visible without clicking anything
          await expect(page.getByText('Select a node or edge to configure')).toBeVisible();
          // No drawer should exist
          await expect(page.locator('.ant-drawer')).toHaveCount(0);
        });

        test(`R-${vp.name}-5: Package input is inline on desktop`, async ({ page }) => {
          const helper = new SchemaInputHelper(page);
          await helper.goto();
          await helper.loadFixture('table-schema-orders.json');
          await helper.expectDesignerVisible();

          // Package input should be inline on any desktop width
          await expect(page.getByPlaceholder('com.example.domain')).toBeVisible();
        });
      }

      if (vp.width >= 1280) {
        test(`R-${vp.name}-6: Toolbar shows full text labels on wide desktop`, async ({ page }) => {
          const helper = new SchemaInputHelper(page);
          await helper.goto();
          await helper.loadFixture('table-schema-orders.json');
          await helper.expectDesignerVisible();

          await expect(page.getByText('Add Table')).toBeVisible();
          await expect(page.getByText('Export DDL')).toBeVisible();
          await expect(page.getByText('Export JSON')).toBeVisible();
        });
      }
    });
  }
});
