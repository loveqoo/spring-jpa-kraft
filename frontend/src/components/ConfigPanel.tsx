import { Typography, Switch, Select, Button, Divider, Empty, Tag, Segmented, Tooltip, Alert } from 'antd';
import {
  DeleteOutlined,
  CheckOutlined,
  ArrowRightOutlined,
  CrownOutlined,
  InfoCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ID_STRATEGIES, ENGINES, CHARSETS } from '../types/aggregateConfig';
import type { IdStrategy, RelationType } from '../types/aggregateConfig';
import type { TableDef } from '../types/tableSchema';
import type { Edge } from '@xyflow/react';
import { extractSide, SIDES } from '../utils/handlePicker';
import type { DesignerState } from '../hooks/useAggregateState';
import { AGGREGATE_COLORS, getRootColorIndex } from '../hooks/useAggregateState';
import { useResponsive } from '../hooks/useResponsive';

const { Text, Title } = Typography;

const ID_STRATEGY_WITH_INHERIT: (IdStrategy | 'inherit')[] = ['inherit', ...ID_STRATEGIES];

type Cardinality = 'One' | 'Many';

function relToCardinalities(rel: RelationType): { source: Cardinality; target: Cardinality } {
  switch (rel) {
    case 'ManyToOne':
      return { source: 'Many', target: 'One' };
    case 'OneToMany':
      return { source: 'One', target: 'Many' };
    case 'OneToOne':
      return { source: 'One', target: 'One' };
  }
}

function cardinalitiesToRel(source: Cardinality, target: Cardinality): RelationType | null {
  if (source === 'Many' && target === 'One') return 'ManyToOne';
  if (source === 'One' && target === 'Many') return 'OneToMany';
  if (source === 'One' && target === 'One') return 'OneToOne';
  return null; // Many-Many not supported
}

function inverseRel(rel: RelationType): RelationType {
  if (rel === 'ManyToOne') return 'OneToMany';
  if (rel === 'OneToMany') return 'ManyToOne';
  return 'OneToOne';
}

interface Props {
  state: DesignerState;
  onToggleRoot: (tableName: string) => void;
  onAssignAggregate: (tableName: string, rootName: string | null) => void;
  onSetNodeIdStrategy: (tableName: string, strategy: IdStrategy | null) => void;
  onSetEdgeSourceRelation: (edgeId: string, relationType: RelationType) => void;
  onSetEdgeJoinColumn: (edgeId: string, joinColumn: string) => void;
  onConfirmEdge: (edgeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onSetEdgeHandles: (edgeId: string, sourceHandle: string, targetHandle: string) => void;
  onEditTable: (tableName: string) => void;
  onSetTableOption: (tableName: string, key: 'engine' | 'charset' | 'comment', value: string | null) => void;
  globalEngine: string;
  globalCharset: string;
}

export default function ConfigPanel({
  state,
  onToggleRoot,
  onAssignAggregate,
  onSetNodeIdStrategy,
  onSetEdgeSourceRelation,
  onSetEdgeJoinColumn,
  onConfirmEdge,
  onDeleteEdge,
  onSetEdgeHandles,
  onEditTable,
  onSetTableOption,
  globalEngine,
  globalCharset,
}: Props) {
  const { t } = useTranslation();
  const { isDesktop } = useResponsive();
  const selectedTable = state.selectedNodeId
    ? state.schema.tables.find((tbl) => tbl.name === state.selectedNodeId)
    : null;
  const selectedEdge = state.selectedEdgeId ? state.edges.find((ed) => ed.id === state.selectedEdgeId) : null;

  return (
    <div
      style={{
        ...(isDesktop
          ? { width: 300, borderLeft: '1px solid #e8e8e8', boxShadow: '-1px 0 4px rgba(0,0,0,0.03)' }
          : { width: '100%' }),
        background: '#fff',
        padding: 20,
        overflowY: 'auto',
      }}
    >
      {selectedTable && (
        <NodeConfig
          table={selectedTable}
          state={state}
          onToggleRoot={onToggleRoot}
          onAssignAggregate={onAssignAggregate}
          onSetIdStrategy={onSetNodeIdStrategy}
          onEditTable={onEditTable}
          onSetTableOption={onSetTableOption}
          globalEngine={globalEngine}
          globalCharset={globalCharset}
        />
      )}
      {selectedEdge && (
        <EdgeConfig
          edge={selectedEdge}
          state={state}
          onSetSourceRelation={onSetEdgeSourceRelation}
          onSetJoinColumn={onSetEdgeJoinColumn}
          onConfirm={onConfirmEdge}
          onDelete={onDeleteEdge}
          onSetHandles={onSetEdgeHandles}
        />
      )}
      {!selectedTable && !selectedEdge && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60 }}>
          <Empty
            description={
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t('configPanel.selectHint')}
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <div
            style={{
              marginTop: 24,
              padding: '12px 16px',
              background: '#f6f8fa',
              borderRadius: 8,
              fontSize: 12,
              color: 'rgba(0,0,0,0.45)',
              lineHeight: 1.8,
            }}
          >
            <div><b>{t('configPanel.tip')}</b> {t('configPanel.tipNode')}</div>
            <div style={{ marginTop: 4 }}>{t('configPanel.tipEdge')}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
      <Text strong style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
        {children}
      </Text>
      {tooltip && (
        <Tooltip title={tooltip} placement="right">
          <InfoCircleOutlined style={{ fontSize: 11, color: '#bfbfbf', cursor: 'help' }} />
        </Tooltip>
      )}
    </div>
  );
}

function NodeConfig({
  table,
  state,
  onToggleRoot,
  onAssignAggregate,
  onSetIdStrategy,
  onEditTable,
  onSetTableOption,
  globalEngine,
  globalCharset,
}: {
  table: TableDef;
  state: DesignerState;
  onToggleRoot: (name: string) => void;
  onAssignAggregate: (tableName: string, rootName: string | null) => void;
  onSetIdStrategy: (name: string, strategy: IdStrategy | null) => void;
  onEditTable: (tableName: string) => void;
  onSetTableOption: (tableName: string, key: 'engine' | 'charset' | 'comment', value: string | null) => void;
  globalEngine: string;
  globalCharset: string;
}) {
  const { t } = useTranslation();
  const isRoot = state.roots.has(table.name);
  const strategy = state.nodeIdStrategies[table.name];
  const assignedRoot = state.aggregateAssignments[table.name] ?? null;
  const rootsArray = Array.from(state.roots).sort();

  const colorIdx = isRoot
    ? getRootColorIndex(state.roots, table.name)
    : assignedRoot
      ? getRootColorIndex(state.roots, assignedRoot)
      : -1;
  const aggregateColor = colorIdx >= 0 ? AGGREGATE_COLORS[colorIdx] : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {isRoot && <CrownOutlined style={{ color: aggregateColor?.border ?? '#1677ff', fontSize: 16 }} />}
        <Title level={5} style={{ margin: 0 }}>
          {table.name}
        </Title>
        {aggregateColor && (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: aggregateColor.border,
              flexShrink: 0,
            }}
          />
        )}
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {t('configPanel.columns', { count: table.columns.length })}
        {isRoot && ` \u00B7 ${t('configPanel.aggregateRootSuffix')}`}
        {!isRoot && assignedRoot && ` \u00B7 ${t('configPanel.aggregateSuffix', { root: assignedRoot })}`}
      </Text>

      <Divider style={{ margin: '14px 0' }} />

      {/* Aggregate Root toggle */}
      <div style={{ marginBottom: 16 }}>
        <SectionLabel tooltip={t('configPanel.aggregateRootTooltip')}>
          {t('configPanel.aggregateRoot')}
        </SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Switch size="small" checked={isRoot} onChange={() => onToggleRoot(table.name)} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {isRoot ? t('configPanel.isRoot') : t('configPanel.notRoot')}
          </Text>
        </div>
      </div>

      {/* Belongs to Aggregate */}
      {!isRoot && rootsArray.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <SectionLabel tooltip={t('configPanel.belongsToAggregateTooltip')}>
            {t('configPanel.belongsToAggregate')}
          </SectionLabel>
          <Select
            value={assignedRoot ?? 'none'}
            onChange={(v) => onAssignAggregate(table.name, v === 'none' ? null : v)}
            style={{ width: '100%' }}
            size="small"
            options={[
              { label: t('configPanel.noneIndependent'), value: 'none' },
              ...rootsArray.map((r) => ({
                label: r,
                value: r,
              })),
            ]}
            optionRender={(option) => {
              if (option.value === 'none') {
                return <span style={{ color: '#999' }}>{t('configPanel.noneIndependent')}</span>;
              }
              const ci = getRootColorIndex(state.roots, option.value as string);
              const c = AGGREGATE_COLORS[ci];
              return (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: c.border,
                      display: 'inline-block',
                    }}
                  />
                  {option.label}
                </span>
              );
            }}
          />
        </div>
      )}

      {/* ID Strategy */}
      <div style={{ marginBottom: 16 }}>
        <SectionLabel tooltip={t('configPanel.idStrategyTooltip')}>
          {t('configPanel.idStrategy')}
        </SectionLabel>
        <Select
          value={strategy ?? 'inherit'}
          onChange={(v) => onSetIdStrategy(table.name, v === 'inherit' ? null : (v as IdStrategy))}
          options={ID_STRATEGY_WITH_INHERIT.map((s) => ({
            label: s === 'inherit' ? t('configPanel.inheritGlobal') : s,
            value: s,
          }))}
          style={{ width: '100%' }}
          size="small"
        />
      </div>

      {/* ENGINE */}
      <div style={{ marginBottom: 16 }}>
        <SectionLabel>{t('configPanel.engine')}</SectionLabel>
        <Select
          value={table.engine ?? 'inherit'}
          onChange={(v) => onSetTableOption(table.name, 'engine', v === 'inherit' ? null : v)}
          options={[
            { label: `${t('configPanel.inheritGlobal')} (${globalEngine})`, value: 'inherit' },
            ...ENGINES.map((e) => ({ label: e, value: e })),
          ]}
          style={{ width: '100%' }}
          size="small"
        />
      </div>

      {/* CHARSET */}
      <div style={{ marginBottom: 16 }}>
        <SectionLabel>{t('configPanel.charset')}</SectionLabel>
        <Select
          value={table.charset ?? 'inherit'}
          onChange={(v) => onSetTableOption(table.name, 'charset', v === 'inherit' ? null : v)}
          options={[
            { label: `${t('configPanel.inheritGlobal')} (${globalCharset})`, value: 'inherit' },
            ...CHARSETS.map((c) => ({ label: c, value: c })),
          ]}
          style={{ width: '100%' }}
          size="small"
        />
      </div>

      <Divider style={{ margin: '14px 0' }} />

      {/* Edit Table */}
      <Button
        icon={<EditOutlined />}
        size="small"
        onClick={() => onEditTable(table.name)}
        style={{ width: '100%', marginBottom: 14 }}
      >
        {t('configPanel.editTable')}
      </Button>

      {/* Column list */}
      <SectionLabel>{t('configPanel.columnsSectionLabel')}</SectionLabel>
      <div
        style={{
          background: '#fafafa',
          borderRadius: 6,
          padding: '6px 0',
          border: '1px solid #f0f0f0',
        }}
      >
        {table.columns.map((col) => (
          <div
            key={col.name}
            style={{
              fontSize: 12,
              padding: '3px 10px',
              color: col.primaryKey ? '#1f1f1f' : '#595959',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {col.primaryKey && (
              <Tag color="gold" style={{ fontSize: 10, lineHeight: '14px', padding: '0 4px', margin: 0 }}>
                PK
              </Tag>
            )}
            <span style={{ fontWeight: col.primaryKey ? 500 : 400 }}>{col.name}</span>
            <span style={{ marginLeft: 'auto', color: '#8c8c8c', fontSize: 11 }}>
              {col.typeValue ? `${col.typeName}(${col.typeValue})` : col.typeName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EdgeConfig({
  edge,
  state,
  onSetSourceRelation,
  onSetJoinColumn,
  onConfirm,
  onDelete,
  onSetHandles,
}: {
  edge: Edge;
  state: DesignerState;
  onSetSourceRelation: (edgeId: string, type: RelationType) => void;
  onSetJoinColumn: (edgeId: string, col: string) => void;
  onConfirm: (edgeId: string) => void;
  onDelete: (edgeId: string) => void;
  onSetHandles: (edgeId: string, sourceHandle: string, targetHandle: string) => void;
}) {
  const { t } = useTranslation();
  const sourceTableDef = state.schema.tables.find((tbl) => tbl.name === edge.source);
  const targetTableDef = state.schema.tables.find((tbl) => tbl.name === edge.target);
  const confirmed = edge.data?.confirmed === true;

  const sourceRel = (edge.data?.sourceRelationType as RelationType) ?? 'ManyToOne';
  const cards = relToCardinalities(sourceRel);

  const fkSide = cards.source === 'Many' ? 'source' : cards.target === 'Many' ? 'target' : 'source';
  const fkTable = fkSide === 'source' ? sourceTableDef : targetTableDef;
  const refTable = fkSide === 'source' ? targetTableDef : sourceTableDef;

  const fkColumnOptions = fkTable
    ? fkTable.columns
        .filter((c) => c.name.endsWith('_id') || c.primaryKey)
        .map((c) => ({ label: c.name, value: c.name }))
    : [];

  const refPk = refTable?.columns.find((c) => c.primaryKey);
  const summary = buildSummary(t, edge.source, edge.target, cards);

  const isManyToMany = cards.source === 'Many' && cards.target === 'Many';

  const handleSourceCardChange = (card: Cardinality) => {
    const rel = cardinalitiesToRel(card, cards.target);
    if (rel) onSetSourceRelation(edge.id, rel);
  };

  const handleTargetCardChange = (card: Cardinality) => {
    const rel = cardinalitiesToRel(cards.source, card);
    if (rel) onSetSourceRelation(edge.id, rel);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Title level={5} style={{ margin: 0 }}>
          {t('configPanel.relation')}
        </Title>
        {confirmed ? (
          <Tag color="blue" style={{ borderRadius: 10, fontSize: 11 }}>
            {t('configPanel.confirmed')}
          </Tag>
        ) : (
          <Tag color="orange" style={{ borderRadius: 10, fontSize: 11 }}>
            {t('configPanel.suggested')}
          </Tag>
        )}
      </div>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {edge.source} &harr; {edge.target}
      </Text>

      <Divider style={{ margin: '14px 0' }} />

      {/* Cardinality */}
      <div
        style={{
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <SectionLabel tooltip={t('configPanel.cardinalityTooltip')}>
          {t('configPanel.cardinality')}
        </SectionLabel>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text strong style={{ fontSize: 13, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {edge.source}
          </Text>
          <Segmented
            size="small"
            options={['One', 'Many']}
            value={cards.source}
            onChange={(v) => handleSourceCardChange(v as Cardinality)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 13, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {edge.target}
          </Text>
          <Segmented
            size="small"
            options={['One', 'Many']}
            value={cards.target}
            onChange={(v) => handleTargetCardChange(v as Cardinality)}
          />
        </div>
      </div>

      {isManyToMany && (
        <Alert
          type="warning"
          message={t('connectionModal.manyToManyWarning')}
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Summary */}
      <div
        style={{
          background: '#f6ffed',
          border: '1px solid #d9f7be',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 12,
          fontSize: 12,
          color: '#389e0d',
          lineHeight: 1.6,
        }}
      >
        {summary}
      </div>

      {/* Foreign Key */}
      <div
        style={{
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <SectionLabel tooltip={t('configPanel.foreignKeyTooltip')}>
          {t('configPanel.foreignKey')}
        </SectionLabel>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text code style={{ fontSize: 12 }}>
            {fkTable?.name}
          </Text>
          <span style={{ color: '#bfbfbf' }}>.</span>
          <Select
            value={(edge.data?.joinColumn as string) || undefined}
            onChange={(v) => onSetJoinColumn(edge.id, v)}
            options={fkColumnOptions}
            placeholder={t('configPanel.selectColumn')}
            size="small"
            style={{ flex: 1, minWidth: 100 }}
          />
        </div>

        {refPk && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <ArrowRightOutlined style={{ color: '#bfbfbf', fontSize: 11 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('configPanel.references')}{' '}
              <Text code style={{ fontSize: 12 }}>
                {refTable?.name}.{refPk.name}
              </Text>
            </Text>
          </div>
        )}
      </div>

      {/* JPA Annotation Preview */}
      <div
        style={{
          background: '#f9f9f9',
          borderRadius: 8,
          padding: '8px 12px',
          marginBottom: 16,
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: 11,
          color: '#595959',
          lineHeight: 1.7,
          border: '1px solid #f0f0f0',
        }}
      >
        <div style={{ fontSize: 10, color: '#8c8c8c', marginBottom: 4, fontFamily: 'inherit' }}>
          {t('configPanel.jpaAnnotations')}
        </div>
        <div>
          {edge.source}: <Tag style={{ fontSize: 10, borderRadius: 4 }}>@{sourceRel}</Tag>
        </div>
        <div>
          {edge.target}: <Tag style={{ fontSize: 10, borderRadius: 4 }}>@{inverseRel(sourceRel)}</Tag>
        </div>
      </div>

      {/* Edge Routing */}
      <div
        style={{
          background: '#fafafa',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}
      >
        <SectionLabel tooltip={t('configPanel.edgeRoutingTooltip')}>
          {t('configPanel.edgeRouting')}
        </SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {edge.source}
            </Text>
            <Segmented
              size="small"
              options={SIDES.map((s) => ({ label: t(`configPanel.side${s.charAt(0).toUpperCase() + s.slice(1)}`), value: s }))}
              value={extractSide(edge.sourceHandle)}
              onChange={(v) => onSetHandles(edge.id, `${edge.source}-${v}-1`, edge.targetHandle ?? `${edge.target}-left-1`)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {edge.target}
            </Text>
            <Segmented
              size="small"
              options={SIDES.map((s) => ({ label: t(`configPanel.side${s.charAt(0).toUpperCase() + s.slice(1)}`), value: s }))}
              value={extractSide(edge.targetHandle)}
              onChange={(v) => onSetHandles(edge.id, edge.sourceHandle ?? `${edge.source}-right-1`, `${edge.target}-${v}-1`)}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {!confirmed && (
          <Button type="primary" icon={<CheckOutlined />} size="small" onClick={() => onConfirm(edge.id)}>
            {t('configPanel.confirm')}
          </Button>
        )}
        <Button danger icon={<DeleteOutlined />} size="small" onClick={() => onDelete(edge.id)}>
          {t('configPanel.delete')}
        </Button>
      </div>
    </div>
  );
}

function buildSummary(t: TFunction, source: string, target: string, cards: { source: Cardinality; target: Cardinality }): string {
  if (cards.source === 'Many' && cards.target === 'One') {
    return t('configPanel.summaryManyToOne', { source, target });
  }
  if (cards.source === 'One' && cards.target === 'Many') {
    return t('configPanel.summaryOneToMany', { source, target });
  }
  return t('configPanel.summaryOneToOne', { source, target });
}
