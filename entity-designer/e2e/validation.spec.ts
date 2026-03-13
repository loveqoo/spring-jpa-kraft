import { test } from '@playwright/test';
import { SchemaInputHelper } from './helpers/schema-input.helper';
import { ConfigPanelHelper } from './helpers/config-panel.helper';
import { ValidationHelper } from './helpers/validation.helper';

test.describe('H. Validation', () => {
  let schemaInput: SchemaInputHelper;
  let configPanel: ConfigPanelHelper;
  let validation: ValidationHelper;

  test.beforeEach(async ({ page }) => {
    schemaInput = new SchemaInputHelper(page);
    configPanel = new ConfigPanelHelper(page);
    validation = new ValidationHelper(page);
    await schemaInput.goto();
  });

  test('H1: Table without PK shows error', async () => {
    await schemaInput.loadFixture('table-schema-no-pk.json');
    await schemaInput.expectDesignerVisible();
    await validation.expectVisible();
    await validation.expectError('no primary key');
  });

  test('H2: Clicking validation error selects the node', async () => {
    await schemaInput.loadFixture('table-schema-no-pk.json');
    await schemaInput.expectDesignerVisible();
    await validation.clickItem('audit_logs');
    await configPanel.expectTableName('audit_logs');
  });

  test('H3: No errors means ValidationPanel is not rendered', async () => {
    // Single table with PK and no edges → no validation issues
    await schemaInput.loadFixture('table-schema-single.json');
    await schemaInput.expectDesignerVisible();
    await validation.expectNotRendered();
  });

  test('H4: Unconfirmed edge shows warning', async () => {
    await schemaInput.loadFixture('table-schema-orders.json');
    await schemaInput.expectDesignerVisible();
    // orders schema has FK edges that are auto-detected (unconfirmed)
    await validation.expectWarning('unconfirmed');
  });
});
