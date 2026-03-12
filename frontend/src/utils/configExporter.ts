import type { Edge } from '@xyflow/react';
import type {
  AggregateConfig,
  AggregateDefinition,
  ColumnOverride,
  EntityDefinition,
  EntityMode,
  IdStrategy,
  RelationDefinition,
  RelationType,
} from '../types/aggregateConfig';
import { DEFAULT_ENTITY_MODE } from '../types/aggregateConfig';
import type { TableSchema } from '../types/tableSchema';

export interface AggregateState {
  basePackage: string;
  globalIdStrategy: IdStrategy;
  globalEngine: string;
  globalCharset: string;
  roots: Set<string>;
  nodeIdStrategies: Record<string, IdStrategy | null>;
  edges: Edge[];
  aggregateAssignments: Record<string, string>;
  schema: TableSchema;
  enumDefinitions: Record<string, string[]>;
  columnOverrides: Record<string, Record<string, ColumnOverride>>;
  entityModes: Record<string, EntityMode>;
}

function getSourceRel(edge: Edge): RelationType {
  return (edge.data?.sourceRelationType as RelationType) ?? 'ManyToOne';
}

function getTargetRel(edge: Edge): RelationType {
  return (edge.data?.targetRelationType as RelationType) ?? 'OneToMany';
}

function getJoinColumn(edge: Edge): string {
  return (edge.data?.joinColumn as string) ?? '';
}

function isNonDefaultEntityMode(mode: EntityMode | undefined): mode is EntityMode {
  if (!mode) return false;
  return (
    mode.readOnly !== DEFAULT_ENTITY_MODE.readOnly ||
    mode.searchable !== DEFAULT_ENTITY_MODE.searchable ||
    mode.revision !== DEFAULT_ENTITY_MODE.revision
  );
}

export function buildAggregateConfig(state: AggregateState): AggregateConfig {
  const { basePackage, globalIdStrategy, globalEngine, globalCharset, roots, nodeIdStrategies, edges, aggregateAssignments, schema, enumDefinitions, columnOverrides, entityModes } = state;

  const confirmedEdges = edges.filter((e) => e.data?.confirmed !== false);
  const aggregates: AggregateDefinition[] = [];

  for (const root of roots) {
    // Entities assigned to this aggregate
    const entityNames = Object.entries(aggregateAssignments)
      .filter(([, r]) => r === root)
      .map(([e]) => e);

    const rootRelations: RelationDefinition[] = [];
    const entityMap = new Map<string, EntityDefinition>();

    // Pre-create entity definitions
    for (const name of entityNames) {
      const entityDef: EntityDefinition = {
        table: name,
        relations: [],
        idStrategy: nodeIdStrategies[name] ?? null,
      };
      const entityOverrides = columnOverrides[name];
      if (entityOverrides && Object.keys(entityOverrides).length > 0) {
        entityDef.columnOverrides = entityOverrides;
      }
      const entityMode = entityModes[name];
      if (isNonDefaultEntityMode(entityMode)) {
        entityDef.entityMode = entityMode;
      }
      entityMap.set(name, entityDef);
    }

    // Process edges involving the root or its entities
    for (const edge of confirmedEdges) {
      const members = new Set([root, ...entityNames]);

      if (edge.source === root && members.has(edge.target)) {
        rootRelations.push({
          type: getSourceRel(edge),
          target: edge.target,
          joinColumn: getJoinColumn(edge),
        });
        const entity = entityMap.get(edge.target);
        if (entity) {
          entity.relations.push({
            type: getTargetRel(edge),
            target: root,
            joinColumn: getJoinColumn(edge),
          });
        }
      } else if (edge.target === root && members.has(edge.source)) {
        rootRelations.push({
          type: getTargetRel(edge),
          target: edge.source,
          joinColumn: getJoinColumn(edge),
        });
        const entity = entityMap.get(edge.source);
        if (entity) {
          entity.relations.push({
            type: getSourceRel(edge),
            target: root,
            joinColumn: getJoinColumn(edge),
          });
        }
      } else if (members.has(edge.source) && members.has(edge.target) && edge.source !== root && edge.target !== root) {
        // Edge between two child entities
        const sourceEntity = entityMap.get(edge.source);
        const targetEntity = entityMap.get(edge.target);
        if (sourceEntity) {
          sourceEntity.relations.push({
            type: getSourceRel(edge),
            target: edge.target,
            joinColumn: getJoinColumn(edge),
          });
        }
        if (targetEntity) {
          targetEntity.relations.push({
            type: getTargetRel(edge),
            target: edge.source,
            joinColumn: getJoinColumn(edge),
          });
        }
      }
    }

    const aggDef: AggregateDefinition = {
      root,
      relations: rootRelations,
      entities: Array.from(entityMap.values()),
      idStrategy: nodeIdStrategies[root] ?? null,
    };
    const rootOverrides = columnOverrides[root];
    if (rootOverrides && Object.keys(rootOverrides).length > 0) {
      aggDef.columnOverrides = rootOverrides;
    }
    const rootMode = entityModes[root];
    if (isNonDefaultEntityMode(rootMode)) {
      aggDef.entityMode = rootMode;
    }
    aggregates.push(aggDef);
  }

  const result: AggregateConfig = {
    basePackage,
    aggregates,
    idStrategy: globalIdStrategy,
    globalEngine,
    globalCharset,
    tableSchema: schema,
  };
  if (Object.keys(enumDefinitions).length > 0) {
    result.enums = enumDefinitions;
  }
  return result;
}
