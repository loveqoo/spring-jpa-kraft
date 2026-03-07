import type { Edge } from '@xyflow/react';
import type {
  AggregateConfig,
  AggregateDefinition,
  EntityDefinition,
  IdStrategy,
  RelationDefinition,
  RelationType,
} from '../types/aggregateConfig';
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

export function buildAggregateConfig(state: AggregateState): AggregateConfig {
  const { basePackage, globalIdStrategy, globalEngine, globalCharset, roots, nodeIdStrategies, edges, aggregateAssignments, schema } = state;

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
      entityMap.set(name, {
        table: name,
        relations: [],
        idStrategy: nodeIdStrategies[name] ?? null,
      });
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

    aggregates.push({
      root,
      relations: rootRelations,
      entities: Array.from(entityMap.values()),
      idStrategy: nodeIdStrategies[root] ?? null,
    });
  }

  return {
    basePackage,
    aggregates,
    idStrategy: globalIdStrategy,
    globalEngine,
    globalCharset,
    tableSchema: schema,
  };
}
