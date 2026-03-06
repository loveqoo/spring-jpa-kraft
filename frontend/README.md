# Aggregate Designer

A visual DDD aggregate boundary designer for database schemas. Users can load table definitions, arrange entities on an interactive canvas, define aggregate roots and relationships, then export the result as JSON configuration or MySQL DDL.

This tool is part of the **spring-jpa-kraft** code generation pipeline — the exported JSON feeds into `module-entity-gen` to generate JPA entities, repositories, services, and controllers.

## Tech Stack

| Category | Library |
|----------|---------|
| UI Framework | React 19, TypeScript |
| Component Library | Ant Design 6 |
| Canvas | XYFlow (React Flow) 12 |
| i18n | react-i18next (EN / KO) |
| Build | Vite 7 |
| E2E Test | Playwright |

## Features

### Schema Input

- Paste or load a `TableSchema` JSON (array of table definitions with columns and indexes)
- Paste or load an `AggregateConfig` JSON to restore a previous design session (round-trip)
- Sample schemas available as quick-start tiles
- Auto-detects FK relationships from `*_id` column naming conventions

### Canvas Interaction

- Drag-and-drop table nodes on an infinite canvas with pan, zoom, minimap
- Click a node to configure it in the right panel (desktop) or bottom drawer (mobile)
- Drag an edge between two nodes to create a relation — a modal prompts for cardinality and FK column
- Drag a non-root node into an aggregate boundary to assign it to that aggregate

### Aggregate Configuration

- Toggle any table as an **Aggregate Root** (colored boundary appears)
- Assign child entities to a root via drag-drop or panel dropdown
- Set ID strategy per entity (IDENTITY, SEQUENCE, UUID, AUTO, NONE) with a global default
- Configure relation type (OneToOne, OneToMany, ManyToOne) and join column per edge

### Table Editing

- Add new tables with a default ID column
- Edit existing tables — rename, add/remove/reorder columns, manage indexes
- Configure **Default Columns** (e.g., `created_at`, `updated_at`) auto-applied to new tables
- Configure **Hidden Columns** to visually collapse common audit fields across all nodes

### Validation

- Real-time validation panel at the bottom of the canvas
- Checks: missing primary key, unconfirmed relations, missing FK columns, missing indexes
- Export is blocked when validation errors exist
- Click an error to select the problematic table or edge on the canvas

### Export

- **JSON** — `AggregateConfig` with full schema embedded for round-trip import. Copy to clipboard or download as file.
- **DDL** — MySQL `CREATE TABLE` statements. Copy to clipboard or download as `.sql` file.

### Responsive & i18n

- Desktop: inline config panel on the right
- Mobile / Tablet: config panel as a slide-in drawer
- Language: English and Korean, auto-detected from browser settings, switchable via toggle

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Testing

```bash
npx playwright install   # first time only
npx playwright test      # 93 tests across 15 suites
```

### Test Suites

| Suite | Coverage |
|-------|----------|
| schema-input | JSON load, error handling, empty canvas |
| canvas-nodes | Node creation, selection, positioning |
| table-editing | Add, rename, delete tables; column editing |
| column-integration | Column CRUD, default columns, hidden columns |
| connection-modal | Relation creation, FK column selection |
| fk-column-creation | Auto-create FK columns on edge confirmation |
| relation-edges | Edge rendering, cardinality labels |
| multi-aggregate | Multiple roots, boundary rendering, assignment |
| aggregate-config | Load pre-configured aggregate JSON |
| global-settings | Package name, ID strategy, hidden/default columns |
| validation | Error detection, export blocking |
| export | JSON/DDL copy and download |
| responsive | Mobile/tablet/desktop layout switching |
| round-trip | Load, export, reload consistency |
| edge-fk-selection | FK column dropdown in edge config |

## Project Structure

```
src/
  components/
    SchemaInput.tsx          # Entry screen — JSON input + sample tiles
    AggregateDesigner.tsx    # Main canvas orchestrator
    DesignerToolbar.tsx      # Top toolbar (package, ID strategy, export)
    ConfigPanel.tsx          # Right sidebar — node & edge configuration
    TableNode.tsx            # Canvas node — table with columns
    RelationEdge.tsx         # Canvas edge — cardinality labels
    AggregateBoundary.tsx    # SVG overlay — colored aggregate borders
    ConnectionModal.tsx      # Relation type + FK column dialog
    AddTableModal.tsx        # New table dialog
    TableEditorModal.tsx     # Column & index editor dialog
    JsonPreview.tsx          # AggregateConfig JSON export modal
    DdlPreview.tsx           # MySQL DDL export modal
    ValidationPanel.tsx      # Bottom error/warning panel
    LanguageSwitcher.tsx     # EN / KO toggle
  hooks/
    useAggregateState.ts     # Main state machine (useReducer)
    useResponsive.ts         # Breakpoint detection
  utils/
    configExporter.ts        # Designer state -> AggregateConfig JSON
    configImporter.ts        # AggregateConfig JSON -> designer state
    ddlExporter.ts           # TableSchema -> MySQL DDL
    schemaParser.ts          # JSON validation & parsing
    schemaValidator.ts       # Real-time schema validation
    fkDetector.ts            # Auto-detect FK columns by naming convention
    handlePicker.ts          # Optimal edge handle positioning
    boundaryHitTest.ts       # Drag-into-boundary detection
    layoutEngine.ts          # Initial node positioning
    nodeSpacing.ts           # Minimum spacing enforcement
  types/
    tableSchema.ts           # TableDef, TableColumn, TableIndex
    aggregateConfig.ts       # AggregateDefinition, RelationDefinition
  i18n/
    index.ts                 # i18next initialization
    locales/
      en.json                # English translations
      ko.json                # Korean translations
  App.tsx                    # Root component
e2e/                         # Playwright E2E tests
  helpers/                   # Test utilities & page objects
```
