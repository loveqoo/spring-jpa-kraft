import { test, expect } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { DesignerHelper } from './helpers/designer.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';

test.describe('K. Edge FK Selection', () => {
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

  test('K1: Edge config shows FK column select', async ({ page }) => {
    await designer.clickEdge(0);
    // "Foreign Key" section should be visible
    await expect(page.getByText('Foreign Key').first()).toBeVisible();
  });

  test('K2: FK column is pre-selected from auto-detection', async ({ page }) => {
    await designer.clickEdge(0);
    // The auto-detected edge should have order_id as joinColumn
    await expect(page.getByText('order_id').first()).toBeVisible();
  });

  test('K3: FK references section shows target PK', async ({ page }) => {
    await designer.clickEdge(0);
    // Should show "references orders.id" or similar
    await expect(page.getByText('references').first()).toBeVisible();
    await expect(page.locator('code').filter({ hasText: 'id' }).first()).toBeVisible();
  });

  test('K4: JPA Annotations preview shows correct annotations', async ({ page }) => {
    await designer.clickEdge(0);
    // JPA Annotations section
    await expect(page.getByText('JPA Annotations').first()).toBeVisible();
    // Should show @ManyToOne and @OneToMany tags (default for FK auto-detection)
    await expect(page.getByText('@ManyToOne').first()).toBeVisible();
    await expect(page.getByText('@OneToMany').first()).toBeVisible();
  });

  test('K5: Changing cardinality updates JPA annotations', async ({ page }) => {
    await designer.clickEdge(0);

    // Change to OneToOne
    await configPanel.setCardinality('source', 'One');
    await configPanel.setCardinality('target', 'One');

    // Annotations should update to @OneToOne
    await expect(page.getByText('@OneToOne').first()).toBeVisible();
  });
});
