import { useReducer, useCallback } from 'react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import type { Edge, Node, NodeChange, EdgeChange, OnNodesChange, OnEdgesChange, Connection } from '@xyflow/react';
import { INVERSE_RELATION } from '../types/aggregateConfig';
import type { IdStrategy, RelationType } from '../types/aggregateConfig';
import type { TableSchema, TableColumn, TableIndex, TableDef } from '../types/tableSchema';
import { AUDIT_COLUMNS, AUDIT_COLUMN_NAMES, makeIdColumn, makeFkColumn, makeFkIndex } from '../types/tableSchema';
import type { PendingConnection } from '../components/ConnectionModal';
import type { InitialOverrides } from '../utils/configImporter';
import { layoutNodes } from '../utils/layoutEngine';
import { detectFkCandidates, candidatesToEdges } from '../utils/fkDetector';
import { pickHandles, recalculateEdgeHandles } from '../utils/handlePicker';

// Aggregate color palette
export const AGGREGATE_COLORS = [
  { border: '#1677ff', bg: '#e6f4ff', headerBg: '#bae0ff', label: 'Blue' },
  { border: '#52c41a', bg: '#f6ffed', headerBg: '#d9f7be', label: 'Green' },
  { border: '#fa8c16', bg: '#fff7e6', headerBg: '#ffd591', label: 'Orange' },
  { border: '#722ed1', bg: '#f9f0ff', headerBg: '#d3adf7', label: 'Purple' },
  { border: '#eb2f96', bg: '#fff0f6', headerBg: '#ffadd2', label: 'Pink' },
  { border: '#13c2c2', bg: '#e6fffb', headerBg: '#87e8de', label: 'Cyan' },
];

export interface DesignerState {
  schema: TableSchema;
  nodes: Node[];
  edges: Edge[];
  basePackage: string;
  globalIdStrategy: IdStrategy;
  globalEngine: string;
  globalCharset: string;
  roots: Set<string>;
  /** entity table name → aggregate root name */
  aggregateAssignments: Record<string, string>;
  nodeIdStrategies: Record<string, IdStrategy | null>;
  /** Column names hidden from all table nodes */
  hiddenColumns: string[];
  /** Default columns appended to every new table (after id) */
  defaultColumns: TableColumn[];
  /** Default indexes appended to every new table */
  defaultIndexes: TableIndex[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  pendingConnection: PendingConnection | null;
}

type Action =
  | { type: 'APPLY_NODE_CHANGES'; changes: NodeChange[] }
  | { type: 'APPLY_EDGE_CHANGES'; changes: EdgeChange[] }
  | { type: 'SET_NODES_WITH_EDGE_RECALC'; nodes: Node[] }
  | { type: 'SET_BASE_PACKAGE'; value: string }
  | { type: 'SET_GLOBAL_ID_STRATEGY'; value: IdStrategy }
  | { type: 'SET_GLOBAL_ENGINE'; value: string }
  | { type: 'SET_GLOBAL_CHARSET'; value: string }
  | { type: 'SET_TABLE_OPTION'; tableName: string; key: 'engine' | 'charset' | 'comment'; value: string | null }
  | { type: 'TOGGLE_ROOT'; tableName: string }
  | { type: 'ASSIGN_AGGREGATE'; tableName: string; rootName: string | null }
  | { type: 'SET_NODE_ID_STRATEGY'; tableName: string; strategy: IdStrategy | null }
  | { type: 'SET_EDGE_SOURCE_RELATION'; edgeId: string; relationType: RelationType }
  | { type: 'SET_EDGE_TARGET_RELATION'; edgeId: string; relationType: RelationType }
  | { type: 'SET_EDGE_JOIN_COLUMN'; edgeId: string; joinColumn: string }
  | { type: 'SET_EDGE_WAYPOINT'; edgeId: string; x: number | null; y: number | null }
  | { type: 'SET_EDGE_HANDLES'; edgeId: string; sourceHandle: string; targetHandle: string }
  | { type: 'CONFIRM_EDGE'; edgeId: string }
  | { type: 'DELETE_EDGE'; edgeId: string }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'SELECT_EDGE'; edgeId: string | null }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_HIDDEN_COLUMNS'; columns: string[] }
  | { type: 'SET_DEFAULT_COLUMNS'; columns: TableColumn[] }
  | { type: 'SET_DEFAULT_INDEXES'; indexes: TableIndex[] }
  | { type: 'ADD_TABLE'; tableName: string }
  | { type: 'RENAME_TABLE'; oldName: string; newName: string }
  | { type: 'DELETE_TABLE'; tableName: string }
  | { type: 'UPDATE_COLUMNS'; tableName: string; columns: TableColumn[]; indexes: TableIndex[] }
  | { type: 'SET_PENDING_CONNECTION'; connection: PendingConnection }
  | { type: 'CLEAR_PENDING_CONNECTION' }
  | { type: 'RESET_STATE'; schema: TableSchema; overrides?: InitialOverrides }
  | {
      type: 'CREATE_CONFIRMED_EDGE';
      connection: PendingConnection;
      relationType: RelationType;
      joinColumn: string;
      fkTableName: string;
    };

function updateEdgeData(edges: Edge[], edgeId: string, patch: Record<string, unknown>): Edge[] {
  return edges.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e));
}

/** Auto-assign entities connected to a root via edges */
function autoAssign(
  roots: Set<string>,
  edges: Edge[],
  currentAssignments: Record<string, string>,
): Record<string, string> {
  const assignments = { ...currentAssignments };

  // Remove assignments for roots that no longer exist
  for (const [entity, root] of Object.entries(assignments)) {
    if (!roots.has(root)) {
      delete assignments[entity];
    }
  }

  // Auto-assign connected entities
  for (const root of roots) {
    for (const edge of edges) {
      const other = edge.source === root ? edge.target : edge.target === root ? edge.source : null;
      if (other && !roots.has(other) && !assignments[other]) {
        assignments[other] = root;
      }
    }
  }

  return assignments;
}

function findOpenPosition(nodes: Node[]): { x: number; y: number } {
  if (nodes.length === 0) return { x: 0, y: 0 };
  let maxX = 0;
  for (const n of nodes) {
    const right = n.position.x + (n.measured?.width ?? 260);
    if (right > maxX) maxX = right;
  }
  return { x: maxX + 80, y: 0 };
}

/**
 * Ensure FK column and index exist in the target table.
 * Returns updated tables and nodes arrays.
 */
function ensureFkColumnAndIndex(
  tables: TableDef[],
  nodes: Node[],
  fkTableName: string,
  joinColumn: string,
  defaultColumnNames: Set<string>,
): { tables: TableDef[]; nodes: Node[] } {
  if (!joinColumn || !fkTableName) return { tables, nodes };

  let modified = false;
  const updatedTables = tables.map((t) => {
    if (t.name !== fkTableName) return t;

    let columns = t.columns;
    let indexes = t.indexes;

    // Add column if missing — insert before default (audit) columns
    if (!columns.some((c) => c.name === joinColumn)) {
      const fkCol = makeFkColumn(joinColumn);
      const firstReservedIdx = columns.findIndex((c) => defaultColumnNames.has(c.name) || AUDIT_COLUMN_NAMES.has(c.name));
      if (firstReservedIdx >= 0) {
        columns = [...columns.slice(0, firstReservedIdx), fkCol, ...columns.slice(firstReservedIdx)];
      } else {
        columns = [...columns, fkCol];
      }
      modified = true;
    }

    // Add index if missing
    if (!indexes.some((idx) => idx.columns.includes(joinColumn))) {
      indexes = [...indexes, makeFkIndex(joinColumn)];
      modified = true;
    }

    if (!modified) return t;
    return { ...t, columns, indexes };
  });

  if (!modified) return { tables, nodes };

  // Sync node data
  const updatedTable = updatedTables.find((t) => t.name === fkTableName);
  const updatedNodes = nodes.map((n) => {
    if (n.id !== fkTableName || !updatedTable) return n;
    const data = n.data as Record<string, unknown>;
    const table = data.table as Record<string, unknown>;
    return {
      ...n,
      data: { ...data, table: { ...table, columns: updatedTable.columns, indexes: updatedTable.indexes } },
    };
  });

  return { tables: updatedTables, nodes: updatedNodes };
}

function reducer(state: DesignerState, action: Action): DesignerState {
  switch (action.type) {
    case 'APPLY_NODE_CHANGES':
      return { ...state, nodes: applyNodeChanges(action.changes, state.nodes) };
    case 'APPLY_EDGE_CHANGES':
      return { ...state, edges: applyEdgeChanges(action.changes, state.edges) };
    case 'SET_NODES_WITH_EDGE_RECALC': {
      const updatedEdges = recalculateEdgeHandles(state.edges, action.nodes);
      return { ...state, nodes: action.nodes, edges: updatedEdges };
    }
    case 'SET_BASE_PACKAGE':
      return { ...state, basePackage: action.value };
    case 'SET_GLOBAL_ID_STRATEGY':
      return { ...state, globalIdStrategy: action.value };
    case 'SET_GLOBAL_ENGINE':
      return { ...state, globalEngine: action.value };
    case 'SET_GLOBAL_CHARSET':
      return { ...state, globalCharset: action.value };
    case 'SET_TABLE_OPTION': {
      const tables = state.schema.tables.map((t) =>
        t.name === action.tableName ? { ...t, [action.key]: action.value } : t,
      );
      const nodes = state.nodes.map((n) => {
        if (n.id !== action.tableName) return n;
        const data = n.data as Record<string, unknown>;
        const table = data.table as Record<string, unknown>;
        return { ...n, data: { ...data, table: { ...table, [action.key]: action.value } } };
      });
      return { ...state, schema: { tables }, nodes };
    }
    case 'TOGGLE_ROOT': {
      const roots = new Set(state.roots);
      if (roots.has(action.tableName)) {
        roots.delete(action.tableName);
      } else {
        roots.add(action.tableName);
      }
      const aggregateAssignments = autoAssign(roots, state.edges, state.aggregateAssignments);
      return { ...state, roots, aggregateAssignments };
    }
    case 'ASSIGN_AGGREGATE': {
      const aggregateAssignments = { ...state.aggregateAssignments };
      if (action.rootName === null) {
        delete aggregateAssignments[action.tableName];
      } else {
        aggregateAssignments[action.tableName] = action.rootName;
      }
      return { ...state, aggregateAssignments };
    }
    case 'SET_NODE_ID_STRATEGY':
      return {
        ...state,
        nodeIdStrategies: { ...state.nodeIdStrategies, [action.tableName]: action.strategy },
      };
    case 'SET_EDGE_SOURCE_RELATION':
      return {
        ...state,
        edges: updateEdgeData(state.edges, action.edgeId, {
          sourceRelationType: action.relationType,
          targetRelationType: INVERSE_RELATION[action.relationType],
        }),
      };
    case 'SET_EDGE_TARGET_RELATION':
      return {
        ...state,
        edges: updateEdgeData(state.edges, action.edgeId, {
          targetRelationType: action.relationType,
          sourceRelationType: INVERSE_RELATION[action.relationType],
        }),
      };
    case 'SET_EDGE_JOIN_COLUMN':
      return {
        ...state,
        edges: updateEdgeData(state.edges, action.edgeId, { joinColumn: action.joinColumn }),
      };
    case 'SET_EDGE_WAYPOINT':
      return {
        ...state,
        edges: updateEdgeData(state.edges, action.edgeId, { midX: action.x, midY: action.y }),
      };
    case 'SET_EDGE_HANDLES':
      return {
        ...state,
        edges: state.edges.map((e) =>
          e.id === action.edgeId
            ? { ...e, sourceHandle: action.sourceHandle, targetHandle: action.targetHandle, data: { ...e.data, manualHandles: true } }
            : e,
        ),
      };
    case 'CONFIRM_EDGE': {
      const edge = state.edges.find((e) => e.id === action.edgeId);
      if (!edge) return state;

      const edgeData = edge.data as Record<string, unknown>;
      const jc = edgeData.joinColumn as string;
      const srcRel = edgeData.sourceRelationType as string;
      const fkSide = srcRel === 'ManyToOne' || srcRel === 'OneToOne' ? edge.source : edge.target;

      const defaultColNames = new Set(state.defaultColumns.map((c) => c.name));
      const { tables: updatedTables, nodes: updatedNodes } = ensureFkColumnAndIndex(
        state.schema.tables,
        state.nodes,
        fkSide,
        jc,
        defaultColNames,
      );

      return {
        ...state,
        schema: { tables: updatedTables },
        nodes: updatedNodes,
        edges: state.edges.map((e) =>
          e.id === action.edgeId
            ? { ...e, animated: false, data: { ...e.data, confirmed: true } }
            : e,
        ),
      };
    }
    case 'DELETE_EDGE':
      return {
        ...state,
        edges: state.edges.filter((e) => e.id !== action.edgeId),
        selectedEdgeId: state.selectedEdgeId === action.edgeId ? null : state.selectedEdgeId,
      };
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId, selectedEdgeId: null };
    case 'SELECT_EDGE':
      return { ...state, selectedEdgeId: action.edgeId, selectedNodeId: null };
    case 'CLEAR_SELECTION':
      return { ...state, selectedNodeId: null, selectedEdgeId: null };
    case 'SET_HIDDEN_COLUMNS':
      return { ...state, hiddenColumns: action.columns };
    case 'SET_DEFAULT_COLUMNS':
      return { ...state, defaultColumns: action.columns };
    case 'SET_DEFAULT_INDEXES':
      return { ...state, defaultIndexes: action.indexes };
    case 'ADD_TABLE': {
      const newTable = {
        name: action.tableName,
        schema: null,
        columns: [makeIdColumn(), ...state.defaultColumns.filter((c) => c.name.trim() && !AUDIT_COLUMN_NAMES.has(c.name)).map((c) => ({ ...c })), ...AUDIT_COLUMNS.map((c) => ({ ...c }))],
        indexes: state.defaultIndexes.filter((idx) => idx.columns.length > 0).map((idx) => ({ ...idx, columns: [...idx.columns] })),
        engine: null,
        charset: null,
        comment: null,
      };
      const newSchema = { tables: [...state.schema.tables, newTable] };
      const pos = findOpenPosition(state.nodes);
      const newNode: Node = {
        id: action.tableName,
        type: 'tableNode',
        position: pos,
        data: { table: newTable },
      };
      const newNodes = [...state.nodes, newNode];
      // Re-detect FK candidates with updated tables
      const fkCandidates = detectFkCandidates(newSchema.tables);
      const existingPairs = new Set(state.edges.map((e) => `${e.source}::${e.target}`));
      const allFkEdges = candidatesToEdges(fkCandidates, newNodes);
      const newEdges = [
        ...state.edges,
        ...allFkEdges.filter((e) => !existingPairs.has(`${e.source}::${e.target}`) && !existingPairs.has(`${e.target}::${e.source}`)),
      ];
      const distributedEdges = recalculateEdgeHandles(newEdges, newNodes);
      return { ...state, schema: newSchema, nodes: newNodes, edges: distributedEdges };
    }
    case 'RENAME_TABLE': {
      const { oldName, newName } = action;
      const tables = state.schema.tables.map((t) =>
        t.name === oldName ? { ...t, name: newName } : t,
      );
      const nodes = state.nodes.map((n) => {
        if (n.id !== oldName) return n;
        const data = n.data as Record<string, unknown>;
        const table = data.table as Record<string, unknown>;
        return { ...n, id: newName, data: { ...data, table: { ...table, name: newName } } };
      });
      const renameHandle = (h: string | null | undefined) =>
        h?.startsWith(`${oldName}-`) ? `${newName}-${h.slice(oldName.length + 1)}` : h;
      const edges = state.edges.map((e) => ({
        ...e,
        source: e.source === oldName ? newName : e.source,
        target: e.target === oldName ? newName : e.target,
        sourceHandle: renameHandle(e.sourceHandle) ?? e.sourceHandle,
        targetHandle: renameHandle(e.targetHandle) ?? e.targetHandle,
      }));
      const roots = new Set(Array.from(state.roots).map((r) => (r === oldName ? newName : r)));
      const aggregateAssignments: Record<string, string> = {};
      for (const [entity, root] of Object.entries(state.aggregateAssignments)) {
        const key = entity === oldName ? newName : entity;
        aggregateAssignments[key] = root === oldName ? newName : root;
      }
      const nodeIdStrategies: Record<string, IdStrategy | null> = {};
      for (const [name, strategy] of Object.entries(state.nodeIdStrategies)) {
        nodeIdStrategies[name === oldName ? newName : name] = strategy;
      }
      const selectedNodeId = state.selectedNodeId === oldName ? newName : state.selectedNodeId;
      return {
        ...state,
        schema: { tables },
        nodes,
        edges,
        roots,
        aggregateAssignments,
        nodeIdStrategies,
        selectedNodeId,
      };
    }
    case 'DELETE_TABLE': {
      const tables = state.schema.tables.filter((t) => t.name !== action.tableName);
      const nodes = state.nodes.filter((n) => n.id !== action.tableName);
      const edges = state.edges.filter(
        (e) => e.source !== action.tableName && e.target !== action.tableName,
      );
      const roots = new Set(state.roots);
      roots.delete(action.tableName);
      const aggregateAssignments = { ...state.aggregateAssignments };
      delete aggregateAssignments[action.tableName];
      // Also remove entities assigned to this table as root
      for (const [entity, root] of Object.entries(aggregateAssignments)) {
        if (root === action.tableName) delete aggregateAssignments[entity];
      }
      const nodeIdStrategies = { ...state.nodeIdStrategies };
      delete nodeIdStrategies[action.tableName];
      const selectedNodeId =
        state.selectedNodeId === action.tableName ? null : state.selectedNodeId;
      // Clear selectedEdgeId if the edge was removed with the deleted table
      const selectedEdgeId =
        state.selectedEdgeId && !edges.some((e) => e.id === state.selectedEdgeId)
          ? null
          : state.selectedEdgeId;
      return {
        ...state,
        schema: { tables },
        nodes,
        edges,
        roots,
        aggregateAssignments,
        nodeIdStrategies,
        selectedNodeId,
        selectedEdgeId,
      };
    }
    case 'UPDATE_COLUMNS': {
      const tables = state.schema.tables.map((t) =>
        t.name === action.tableName
          ? { ...t, columns: action.columns, indexes: action.indexes }
          : t,
      );
      const nodes = state.nodes.map((n) => {
        if (n.id !== action.tableName) return n;
        const data = n.data as Record<string, unknown>;
        const table = data.table as Record<string, unknown>;
        return {
          ...n,
          data: {
            ...data,
            table: { ...table, columns: action.columns, indexes: action.indexes },
          },
        };
      });
      return { ...state, schema: { tables }, nodes };
    }
    case 'SET_PENDING_CONNECTION':
      return { ...state, pendingConnection: action.connection };
    case 'CLEAR_PENDING_CONNECTION':
      return { ...state, pendingConnection: null };
    case 'RESET_STATE':
      return createInitialState(action.schema, action.overrides);
    case 'CREATE_CONFIRMED_EDGE': {
      const { connection, relationType, joinColumn, fkTableName } = action;
      const sourceNode = state.nodes.find((n) => n.id === connection.source);
      const targetNode = state.nodes.find((n) => n.id === connection.target);
      const handles =
        sourceNode && targetNode
          ? pickHandles(sourceNode, targetNode)
          : { sourceHandle: connection.sourceHandle, targetHandle: connection.targetHandle };

      const sourceRel = relationType;
      const targetRel = INVERSE_RELATION[relationType];

      const newEdge: Edge = {
        id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'relationEdge',
        animated: false,
        data: {
          joinColumn,
          sourceRelationType: sourceRel,
          targetRelationType: targetRel,
          confirmed: true,
        },
      };

      // Ensure FK column + index
      const defaultColNames = new Set(state.defaultColumns.map((c) => c.name));
      const { tables, nodes } = ensureFkColumnAndIndex(
        state.schema.tables,
        state.nodes,
        fkTableName,
        joinColumn,
        defaultColNames,
      );

      const allEdges = [...state.edges, newEdge];
      const distributedEdges = recalculateEdgeHandles(allEdges, nodes);

      return {
        ...state,
        schema: { tables },
        nodes,
        edges: distributedEdges,
        pendingConnection: null,
      };
    }
    default:
      return state;
  }
}

function createInitialState(schema: TableSchema, overrides?: InitialOverrides): DesignerState {
  const nodes = layoutNodes(schema.tables);

  if (overrides) {
    // Build confirmed edges from override definitions
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const edges = overrides.edgeDefinitions.map((def, i) => {
      const sourceNode = nodeMap.get(def.source);
      const targetNode = nodeMap.get(def.target);
      const handles =
        sourceNode && targetNode
          ? pickHandles(sourceNode, targetNode)
          : { sourceHandle: `${def.source}-right-1`, targetHandle: `${def.target}-left-1` };

      return {
        id: `imported-${def.source}-${def.target}-${i}`,
        source: def.source,
        target: def.target,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'relationEdge' as const,
        animated: false,
        data: {
          joinColumn: def.joinColumn,
          sourceRelationType: def.sourceRelationType,
          targetRelationType: def.targetRelationType,
          confirmed: true,
        },
      };
    });

    const distributedEdges = recalculateEdgeHandles(edges, nodes);

    return {
      schema,
      nodes,
      edges: distributedEdges,
      basePackage: overrides.basePackage,
      globalIdStrategy: overrides.globalIdStrategy,
      globalEngine: overrides.globalEngine,
      globalCharset: overrides.globalCharset,
      roots: new Set(overrides.roots),
      aggregateAssignments: { ...overrides.aggregateAssignments },
      nodeIdStrategies: { ...overrides.nodeIdStrategies },
      hiddenColumns: [],
      defaultColumns: [],
      defaultIndexes: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      pendingConnection: null,
    };
  }

  // Default: auto-detect FK candidates
  const fkCandidates = detectFkCandidates(schema.tables);
  const detectedEdges = candidatesToEdges(fkCandidates, nodes);
  const edges = recalculateEdgeHandles(detectedEdges, nodes);

  return {
    schema,
    nodes,
    edges,
    basePackage: 'com.example',
    globalIdStrategy: 'IDENTITY',
    globalEngine: 'InnoDB',
    globalCharset: 'utf8mb4',
    roots: new Set<string>(),
    aggregateAssignments: {},
    nodeIdStrategies: {},
    hiddenColumns: [],
    defaultColumns: [],
    defaultIndexes: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    pendingConnection: null,
  };
}

/** Get color index for a root (stable ordering) */
export function getRootColorIndex(roots: Set<string>, rootName: string): number {
  const sorted = Array.from(roots).sort();
  return sorted.indexOf(rootName) % AGGREGATE_COLORS.length;
}

export function useAggregateState(schema: TableSchema, overrides?: InitialOverrides) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => createInitialState(schema, overrides),
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      dispatch({ type: 'APPLY_NODE_CHANGES', changes });
    },
    [dispatch],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      dispatch({ type: 'APPLY_EDGE_CHANGES', changes });
    },
    [dispatch],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      dispatch({
        type: 'SET_PENDING_CONNECTION',
        connection: {
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle ?? null,
          targetHandle: connection.targetHandle ?? null,
        },
      });
    },
    [],
  );

  return { state, dispatch, onNodesChange, onEdgesChange, onConnect };
}
