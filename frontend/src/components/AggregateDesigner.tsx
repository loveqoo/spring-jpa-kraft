import { useState, useMemo, useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, ConnectionMode } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { Drawer } from 'antd';
import '@xyflow/react/dist/style.css';
import type { TableSchema, TableColumn, TableIndex } from '../types/tableSchema';
import type { InitialOverrides } from '../utils/configImporter';
import { useAggregateState, AGGREGATE_COLORS } from '../hooks/useAggregateState';
import { useResponsive } from '../hooks/useResponsive';
import { buildAggregateConfig } from '../utils/configExporter';
import { exportDDL } from '../utils/ddlExporter';
import { hitTestAggregate } from '../utils/boundaryHitTest';
import { enforceSpacing } from '../utils/nodeSpacing';
import { validateSchema } from '../utils/schemaValidator';
import TableNode from './TableNode';
import RelationEdge from './RelationEdge';
import AggregateBoundary from './AggregateBoundary';
import DesignerToolbar from './DesignerToolbar';
import ConfigPanel from './ConfigPanel';
import JsonPreview from './JsonPreview';
import AddTableModal from './AddTableModal';
import TableEditorModal from './TableEditorModal';
import DdlPreview from './DdlPreview';
import ConnectionModal from './ConnectionModal';
import type { ConfirmedConnectionResult } from './ConnectionModal';
import ValidationPanel from './ValidationPanel';

interface Props {
  schema: TableSchema;
  overrides?: InitialOverrides;
  onBack: () => void;
}

export default function AggregateDesigner({ schema, overrides, onBack }: Props) {
  const { state, dispatch, onNodesChange, onEdgesChange, onConnect } = useAggregateState(schema, overrides);
  const { isDesktop } = useResponsive();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [ddlPreviewOpen, setDdlPreviewOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<string | null>(null);

  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);
  const edgeTypes = useMemo(() => ({ relationEdge: RelationEdge }), []);

  const hasSelection = !!(state.selectedNodeId || state.selectedEdgeId);

  // Inject isRoot + aggregateColor + remove callback into node data
  const enrichedNodes = useMemo(() => {
    const sortedRoots = Array.from(state.roots).sort();
    return state.nodes.map((node) => {
      const isRoot = state.roots.has(node.id);
      const assignedRoot = isRoot ? node.id : state.aggregateAssignments[node.id];
      const aggregateColor =
        assignedRoot && state.roots.has(assignedRoot)
          ? AGGREGATE_COLORS[sortedRoots.indexOf(assignedRoot) % AGGREGATE_COLORS.length]
          : null;

      const onRemoveFromAggregate =
        !isRoot && assignedRoot
          ? () => dispatch({ type: 'ASSIGN_AGGREGATE', tableName: node.id, rootName: null })
          : undefined;

      return {
        ...node,
        data: { ...node.data, isRoot, aggregateColor, onRemoveFromAggregate, hiddenColumns: state.hiddenColumns },
      };
    });
  }, [state.nodes, state.roots, state.aggregateAssignments, state.hiddenColumns, dispatch]);

  const config = useMemo(
    () =>
      buildAggregateConfig({
        basePackage: state.basePackage,
        globalIdStrategy: state.globalIdStrategy,
        globalEngine: state.globalEngine,
        globalCharset: state.globalCharset,
        roots: state.roots,
        nodeIdStrategies: state.nodeIdStrategies,
        edges: state.edges,
        aggregateAssignments: state.aggregateAssignments,
        schema: state.schema,
      }),
    [state.basePackage, state.globalIdStrategy, state.globalEngine, state.globalCharset, state.roots, state.nodeIdStrategies, state.edges, state.aggregateAssignments, state.schema],
  );

  // Waypoint update callback (stable ref via useCallback)
  const updateWaypoint = useCallback(
    (edgeId: string, x: number | null, y: number | null) => {
      dispatch({ type: 'SET_EDGE_WAYPOINT', edgeId, x, y });
    },
    [dispatch],
  );

  // Inject waypoint callback into edge data for RelationEdge drag support
  const enrichedEdges = useMemo(() => {
    return state.edges.map((edge) => ({
      ...edge,
      data: { ...edge.data, updateWaypoint },
    }));
  }, [state.edges, updateWaypoint]);

  const ddlText = useMemo(() => exportDDL(state.schema, state.globalEngine, state.globalCharset), [state.schema, state.globalEngine, state.globalCharset]);

  const validationErrors = useMemo(
    () => validateSchema({ schema: state.schema, edges: state.edges }),
    [state.schema, state.edges],
  );
  const hasErrors = validationErrors.some((e) => e.severity === 'error');

  const handleConnectionConfirm = useCallback(
    (result: ConfirmedConnectionResult) => {
      if (!state.pendingConnection) return;
      dispatch({
        type: 'CREATE_CONFIRMED_EDGE',
        connection: state.pendingConnection,
        relationType: result.relationType,
        joinColumn: result.joinColumn,
        fkTableName: result.fkTableName,
      });
    },
    [state.pendingConnection, dispatch],
  );

  const handleConnectionCancel = useCallback(() => {
    dispatch({ type: 'CLEAR_PENDING_CONNECTION' });
  }, [dispatch]);

  // On drag stop: enforce minimum spacing + assign aggregate if dropped into boundary
  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Enforce minimum gap between nodes + recalculate edge handles
      const spacedNodes = enforceSpacing(state.nodes, node.id);
      dispatch({ type: 'SET_NODES_WITH_EDGE_RECALC', nodes: spacedNodes });

      // Aggregate assignment (non-root only)
      if (!state.roots.has(node.id)) {
        const spacedNode = spacedNodes.find((n) => n.id === node.id) ?? node;
        const w = spacedNode.measured?.width ?? 240;
        const h = spacedNode.measured?.height ?? 120;

        const hitRoot = hitTestAggregate(
          spacedNode.id,
          spacedNode.position,
          w,
          h,
          state.roots,
          state.aggregateAssignments,
          spacedNodes,
        );

        if (hitRoot && hitRoot !== (state.aggregateAssignments[node.id] ?? null)) {
          dispatch({ type: 'ASSIGN_AGGREGATE', tableName: node.id, rootName: hitRoot });
        }
      }
    },
    [state.roots, state.aggregateAssignments, state.nodes, dispatch],
  );

  const existingTableNames = useMemo(() => state.schema.tables.map((t) => t.name), [state.schema.tables]);

  const editingTableDef = editingTable
    ? state.schema.tables.find((t) => t.name === editingTable)
    : null;

  const handleTableEditorSave = (newName: string, columns: TableColumn[], indexes: TableIndex[], comment: string | null) => {
    if (!editingTable) return;
    if (newName !== editingTable) {
      dispatch({ type: 'RENAME_TABLE', oldName: editingTable, newName });
    }
    dispatch({ type: 'UPDATE_COLUMNS', tableName: newName, columns, indexes });
    dispatch({ type: 'SET_TABLE_OPTION', tableName: newName, key: 'comment', value: comment });
    setEditingTable(null);
  };

  const handleTableEditorDelete = () => {
    if (!editingTable) return;
    dispatch({ type: 'DELETE_TABLE', tableName: editingTable });
    setEditingTable(null);
  };

  const configPanelContent = (
    <ConfigPanel
      state={state}
      onToggleRoot={(name) => dispatch({ type: 'TOGGLE_ROOT', tableName: name })}
      onAssignAggregate={(tableName, rootName) =>
        dispatch({ type: 'ASSIGN_AGGREGATE', tableName, rootName })
      }
      onSetNodeIdStrategy={(name, strategy) =>
        dispatch({ type: 'SET_NODE_ID_STRATEGY', tableName: name, strategy })
      }
      onSetEdgeSourceRelation={(edgeId, relationType) =>
        dispatch({ type: 'SET_EDGE_SOURCE_RELATION', edgeId, relationType })
      }
      onSetEdgeJoinColumn={(edgeId, joinColumn) =>
        dispatch({ type: 'SET_EDGE_JOIN_COLUMN', edgeId, joinColumn })
      }
      onConfirmEdge={(edgeId) => dispatch({ type: 'CONFIRM_EDGE', edgeId })}
      onDeleteEdge={(edgeId) => dispatch({ type: 'DELETE_EDGE', edgeId })}
      onSetEdgeHandles={(edgeId, sourceHandle, targetHandle) =>
        dispatch({ type: 'SET_EDGE_HANDLES', edgeId, sourceHandle, targetHandle })
      }
      onEditTable={(tableName) => setEditingTable(tableName)}
      onSetTableOption={(tableName, key, value) => dispatch({ type: 'SET_TABLE_OPTION', tableName, key, value })}
      globalEngine={state.globalEngine}
      globalCharset={state.globalCharset}
    />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <DesignerToolbar
        basePackage={state.basePackage}
        globalIdStrategy={state.globalIdStrategy}
        hiddenColumns={state.hiddenColumns}
        onBasePackageChange={(v) => dispatch({ type: 'SET_BASE_PACKAGE', value: v })}
        onIdStrategyChange={(v) => dispatch({ type: 'SET_GLOBAL_ID_STRATEGY', value: v })}
        globalEngine={state.globalEngine}
        onEngineChange={(v) => dispatch({ type: 'SET_GLOBAL_ENGINE', value: v })}
        globalCharset={state.globalCharset}
        onCharsetChange={(v) => dispatch({ type: 'SET_GLOBAL_CHARSET', value: v })}
        onHiddenColumnsChange={(cols) => dispatch({ type: 'SET_HIDDEN_COLUMNS', columns: cols })}
        defaultColumns={state.defaultColumns}
        onDefaultColumnsChange={(cols) => dispatch({ type: 'SET_DEFAULT_COLUMNS', columns: cols })}
        defaultIndexes={state.defaultIndexes}
        onDefaultIndexesChange={(idxs) => dispatch({ type: 'SET_DEFAULT_INDEXES', indexes: idxs })}
        onAddTable={() => setAddTableOpen(true)}
        onExportDDL={() => setDdlPreviewOpen(true)}
        onExport={() => setPreviewOpen(true)}
        onBack={onBack}
        exportDisabled={hasErrors}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={enrichedNodes}
            edges={enrichedEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_, node) => dispatch({ type: 'SELECT_NODE', nodeId: node.id })}
            onEdgeClick={(_, edge) => dispatch({ type: 'SELECT_EDGE', edgeId: edge.id })}
            onPaneClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            edgesReconnectable={false}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background />
            <AggregateBoundary
              roots={state.roots}
              aggregateAssignments={state.aggregateAssignments}
              nodes={enrichedNodes}
            />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* Desktop: inline ConfigPanel */}
        {isDesktop && configPanelContent}
      </div>

      {/* Mobile/Tablet: ConfigPanel as Drawer */}
      {!isDesktop && (
        <Drawer
          open={hasSelection}
          onClose={() => dispatch({ type: 'CLEAR_SELECTION' })}
          placement="right"
          width={320}
          styles={{ body: { padding: 0 } }}
          mask={false}
        >
          {configPanelContent}
        </Drawer>
      )}

      <ValidationPanel
        errors={validationErrors}
        onSelectTable={(id) => dispatch({ type: 'SELECT_NODE', nodeId: id })}
        onSelectEdge={(id) => dispatch({ type: 'SELECT_EDGE', edgeId: id })}
      />

      {state.pendingConnection && (
        <ConnectionModal
          pending={state.pendingConnection}
          tables={state.schema.tables}
          onConfirm={handleConnectionConfirm}
          onCancel={handleConnectionCancel}
        />
      )}

      <JsonPreview open={previewOpen} config={config} onClose={() => setPreviewOpen(false)} />

      <AddTableModal
        open={addTableOpen}
        existingNames={existingTableNames}
        onSubmit={(tableName) => {
          dispatch({ type: 'ADD_TABLE', tableName });
          setAddTableOpen(false);
        }}
        onCancel={() => setAddTableOpen(false)}
      />

      {editingTableDef && (
        <TableEditorModal
          open={!!editingTable}
          tableName={editingTableDef.name}
          columns={editingTableDef.columns}
          indexes={editingTableDef.indexes}
          existingNames={existingTableNames.filter((n) => n !== editingTable)}
          defaultColumns={state.defaultColumns}
          defaultIndexes={state.defaultIndexes}
          tableComment={editingTableDef.comment}
          onSave={handleTableEditorSave}
          onDelete={handleTableEditorDelete}
          onCancel={() => setEditingTable(null)}
        />
      )}

      <DdlPreview
        open={ddlPreviewOpen}
        ddl={ddlText}
        tableCount={state.schema.tables.length}
        onClose={() => setDdlPreviewOpen(false)}
      />
    </div>
  );
}
