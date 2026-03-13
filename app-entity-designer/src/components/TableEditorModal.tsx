import { useState, useMemo, useRef, useCallback } from 'react';
import { Modal, Input, Button, Select, InputNumber, Checkbox, Alert, Divider, Typography, Popconfirm, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, ImportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TableColumn, TableIndex } from '../types/tableSchema';
import { AUDIT_COLUMN_NAMES } from '../types/tableSchema';
import { COLUMN_TYPES, TYPES_WITH_SIZE } from '../types/aggregateConfig';
import type { ColumnOverride } from '../types/aggregateConfig';
import { isAIConfigured } from '../ai/aiClient';
import { buildTableModificationMessages } from '../ai/prompts';
import { useAIGenerate } from '../ai/useAIGenerate';
import { tableModResponseSchema } from '../ai/schemas';
import AIPromptInput from './AIPromptInput';

const { Text } = Typography;

interface Props {
  open: boolean;
  tableName: string;
  columns: TableColumn[];
  indexes: TableIndex[];
  existingNames: string[];
  defaultColumns: TableColumn[];
  defaultIndexes: TableIndex[];
  tableComment: string | null;
  enumDefinitions: Record<string, string[]>;
  columnOverrides: Record<string, ColumnOverride>;
  onColumnOverrideChange: (columnName: string, override: ColumnOverride | null) => void;
  onSave: (newName: string, columns: TableColumn[], indexes: TableIndex[], comment: string | null) => void;
  onDelete: () => void;
  onCancel: () => void;
}

function createEmptyColumn(): TableColumn {
  return {
    name: '',
    typeName: 'VARCHAR',
    typeValue: 255,
    primaryKey: false,
    notNull: false,
    unique: false,
    autoIncrement: false,
    defaultValue: null,
    note: null,
  };
}

function createEmptyIndex(): TableIndex {
  return { name: '', columns: [], unique: false, primaryKey: false };
}

export default function TableEditorModal({
  open,
  tableName,
  columns,
  indexes,
  existingNames,
  defaultColumns,
  defaultIndexes,
  tableComment,
  enumDefinitions,
  columnOverrides,
  onColumnOverrideChange,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(tableName);
  const [cols, setCols] = useState<TableColumn[]>(columns);
  const [idxs, setIdxs] = useState<TableIndex[]>(indexes);
  const [comment, setComment] = useState<string>(tableComment ?? '');
  const [error, setError] = useState<string | null>(null);
  const focusTargetRef = useRef<{ type: 'col' | 'idx'; index: number } | null>(null);

  const autoFocusRef = useCallback((type: 'col' | 'idx', index: number) => {
    return (el: InputRef | null) => {
      if (el && focusTargetRef.current?.type === type && focusTargetRef.current?.index === index) {
        el.focus();
        focusTargetRef.current = null;
      }
    };
  }, []);

  const aiConfigured = isAIConfigured();
  const { generate: aiGenerate, loading: aiLoading, error: aiError, abort: aiAbort } = useAIGenerate<{ columns: TableColumn[]; indexes: TableIndex[] }>();

  const handleAIModify = useCallback(async (prompt: string) => {
    const currentTable = { name, schema: null as string | null, columns: cols, indexes: idxs, engine: null as string | null, charset: null as string | null, comment: comment || null };
    const messages = buildTableModificationMessages(currentTable, prompt);
    const result = await aiGenerate(messages, { schema: tableModResponseSchema });
    if (result && result.columns) {
      // Preserve audit columns that AI doesn't return
      const auditCols = cols.filter((c) => AUDIT_COLUMN_NAMES.has(c.name));
      const resultWithoutAudit = result.columns.filter((c) => !AUDIT_COLUMN_NAMES.has(c.name));
      setCols([...resultWithoutAudit, ...auditCols]);
      if (result.indexes) setIdxs(result.indexes);
    }
  }, [name, cols, idxs, comment, aiGenerate]);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setName(tableName);
    setCols(columns.map((c) => ({ ...c })));
    setIdxs(indexes.map((idx) => ({ ...idx, columns: [...idx.columns] })));
    setComment(tableComment ?? '');
    setError(null);
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Columns referenced by at least one index — protected from deletion
  const indexedColumns = useMemo(() => {
    const set = new Set<string>();
    for (const idx of idxs) {
      for (const col of idx.columns) set.add(col);
    }
    return set;
  }, [idxs]);

  const updateCol = (index: number, patch: Partial<TableColumn>) => {
    setCols((prev) => {
      const oldName = prev[index].name;
      const newCols = prev.map((c, i) => (i === index ? { ...c, ...patch } : c));
      // Sync column rename into indexes
      if (patch.name !== undefined && patch.name !== oldName) {
        setIdxs((prevIdxs) =>
          prevIdxs.map((idx) => ({
            ...idx,
            columns: idx.columns.map((cn) => (cn === oldName ? patch.name! : cn)),
          })),
        );
      }
      return newCols;
    });
  };

  const removeCol = (index: number) => {
    setCols((prev) => prev.filter((_, i) => i !== index));
  };

  const moveCol = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= cols.length) return;
    setCols((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const applyDefaultColumns = () => {
    setCols((prev) => {
      const safeDefaults = defaultColumns.filter((c) => !AUDIT_COLUMN_NAMES.has(c.name));
      const defaultMap = new Map(safeDefaults.map((c) => [c.name, { ...c }]));
      // Overwrite existing columns that match by name (skip audit columns)
      const updated = prev.map((c) => (defaultMap.has(c.name) ? { ...defaultMap.get(c.name)! } : c));
      const existingNames = new Set(prev.map((c) => c.name));
      // Append new default columns that don't exist yet
      const appended = safeDefaults.filter((c) => !existingNames.has(c.name)).map((c) => ({ ...c }));
      return [...updated, ...appended];
    });
  };

  const applyDefaultIndexes = () => {
    setIdxs((prev) => {
      const existingKeys = new Set(prev.map((idx) => [...idx.columns].sort().join(',')));
      const newIdxs = defaultIndexes
        .filter((idx) => idx.columns.length > 0 && !existingKeys.has([...idx.columns].sort().join(',')))
        .map((idx) => ({ ...idx, columns: [...idx.columns] }));
      return [...prev, ...newIdxs];
    });
  };

  const handleSave = () => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) {
      setError(t('tableEditor.nameRequired'));
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(trimmed)) {
      setError(t('tableEditor.invalidFormat'));
      return;
    }
    if (trimmed !== tableName && existingNames.includes(trimmed)) {
      setError(t('tableEditor.alreadyExists', { name: trimmed }));
      return;
    }
    const emptyNames = cols.filter((c) => !c.name.trim());
    if (emptyNames.length > 0) {
      setError(t('tableEditor.allColumnsMustHaveName'));
      return;
    }
    const aiCount = cols.filter((c) => c.autoIncrement).length;
    if (aiCount > 1) {
      setError(t('tableEditor.onlyOneAutoIncrement'));
      return;
    }
    onSave(trimmed, cols, idxs, comment.trim() || null);
  };

  const updateIdx = (index: number, patch: Partial<TableIndex>) => {
    setIdxs((prev) => prev.map((idx, i) => (i === index ? { ...idx, ...patch } : idx)));
  };

  const removeIdx = (index: number) => {
    setIdxs((prev) => prev.filter((_, i) => i !== index));
  };

  const colOptions = cols
    .filter((c) => c.name.trim())
    .map((c) => ({ label: c.name, value: c.name }));

  return (
    <Modal
      title={t('tableEditor.title')}
      open={open}
      onCancel={onCancel}
      width={900}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Popconfirm
            title={t('tableEditor.deleteConfirmTitle')}
            description={t('tableEditor.deleteConfirmDesc')}
            onConfirm={onDelete}
            okText={t('common.delete')}
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>
              {t('tableEditor.deleteTable')}
            </Button>
          </Popconfirm>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={onCancel}>{t('tableEditor.cancel')}</Button>
            <Button type="primary" onClick={handleSave}>
              {t('tableEditor.save')}
            </Button>
          </div>
        </div>
      }
    >
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}

      {/* AI prompt */}
      {aiConfigured && (
        <div style={{ marginBottom: 12 }}>
          <AIPromptInput
            onSubmit={handleAIModify}
            loading={aiLoading}
            error={aiError}
            onAbort={aiAbort}
            placeholder={t('ai.modifyTable')}
          />
        </div>
      )}

      {/* Table name + comment */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: '0 0 300px' }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('tableEditor.tableName')}
          </Text>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('tableEditor.tableComment')}
          </Text>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('tableEditor.tableCommentPlaceholder')}
          />
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Column list */}
      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        {t('tableEditor.columns')}
      </Text>
      <div
        style={{
          maxHeight: 400,
          overflowY: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: 6,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '130px 100px 55px repeat(3, 28px) 100px 90px 100px 60px',
            gap: 4,
            padding: '6px 8px',
            background: '#fafafa',
            borderBottom: '1px solid #f0f0f0',
            fontSize: 11,
            color: '#8c8c8c',
            fontWeight: 600,
            alignItems: 'center',
          }}
        >
          <span>{t('tableEditor.colName')}</span>
          <span>{t('tableEditor.colType')}</span>
          <span>{t('tableEditor.colSize')}</span>
          <span>{t('tableEditor.colPK')}</span>
          <span>{t('tableEditor.colNN')}</span>
          <span>{t('tableEditor.colAI')}</span>
          <span>{t('tableEditor.colEnum')}</span>
          <span>{t('tableEditor.colDefault')}</span>
          <span>{t('tableEditor.colComment')}</span>
          <span />
        </div>

        {cols.map((col, i) => {
          const isAudit = AUDIT_COLUMN_NAMES.has(col.name);
          return (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '130px 100px 55px repeat(3, 28px) 100px 90px 100px 60px',
              gap: 4,
              padding: '4px 8px',
              borderBottom: '1px solid #f5f5f5',
              alignItems: 'center',
              opacity: isAudit ? 0.5 : 1,
            }}
          >
            <Input
              ref={autoFocusRef('col', i)}
              size="small"
              value={col.name}
              onChange={(e) => updateCol(i, { name: e.target.value })}
              placeholder="column_name"
              disabled={isAudit}
            />
            <Select
              size="small"
              value={col.typeName.toUpperCase()}
              onChange={(v) => {
                const patch: Partial<TableColumn> = { typeName: v };
                if (!TYPES_WITH_SIZE.has(v)) patch.typeValue = null;
                updateCol(i, patch);
                if (!['VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT'].includes(v) && columnOverrides[col.name]?.enumType) {
                  onColumnOverrideChange(col.name, null);
                }
              }}
              options={COLUMN_TYPES.map((t) => ({ label: t, value: t }))}
              style={{ width: '100%' }}
              showSearch
              disabled={isAudit}
            />
            <InputNumber
              size="small"
              value={col.typeValue}
              onChange={(v) => updateCol(i, { typeValue: v })}
              min={0}
              disabled={isAudit || !TYPES_WITH_SIZE.has(col.typeName.toUpperCase())}
              style={{ width: '100%' }}
              placeholder="—"
            />
            <Checkbox
              tabIndex={0}
              checked={col.primaryKey}
              disabled={isAudit || (!col.primaryKey && cols.some((c) => c.primaryKey))}
              onChange={(e) => updateCol(i, { primaryKey: e.target.checked })}
            />
            <Checkbox tabIndex={0} checked={col.notNull} onChange={(e) => updateCol(i, { notNull: e.target.checked })} disabled={isAudit} />
            <Checkbox tabIndex={0} checked={col.autoIncrement} onChange={(e) => updateCol(i, { autoIncrement: e.target.checked })} disabled={isAudit} />
            <Select
              size="small"
              value={columnOverrides[col.name]?.enumType ?? undefined}
              onChange={(v) => onColumnOverrideChange(col.name, v ? { enumType: v } : null)}
              allowClear
              placeholder="—"
              disabled={isAudit || col.primaryKey || !['VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT'].includes(col.typeName.toUpperCase())}
              style={{ width: '100%', fontSize: 11 }}
              options={Object.keys(enumDefinitions).map((n) => ({ label: n, value: n }))}
            />
            <Input
              size="small"
              value={col.defaultValue ?? ''}
              onChange={(e) => updateCol(i, { defaultValue: e.target.value || null })}
              placeholder="—"
              disabled={isAudit}
            />
            <Input
              size="small"
              value={col.note ?? ''}
              onChange={(e) => updateCol(i, { note: e.target.value || null })}
              placeholder="—"
              disabled={isAudit}
            />
            <div style={{ display: 'flex', gap: 2 }}>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined style={{ fontSize: 10 }} />}
                disabled={isAudit || i === 0}
                onClick={() => moveCol(i, -1)}
                style={{ padding: '0 4px', minWidth: 0 }}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined style={{ fontSize: 10 }} />}
                disabled={isAudit || i === cols.length - 1}
                onClick={() => moveCol(i, 1)}
                style={{ padding: '0 4px', minWidth: 0 }}
              />
              <Tooltip title={isAudit ? t('tableEditor.auditColumnLocked') : indexedColumns.has(col.name) ? t('tableEditor.removeIndexFirst') : undefined}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                  onClick={() => removeCol(i)}
                  disabled={isAudit || indexedColumns.has(col.name)}
                  style={{ padding: '0 4px', minWidth: 0 }}
                />
              </Tooltip>
            </div>
          </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setCols((prev) => {
              const firstAuditIdx = prev.findIndex((c) => AUDIT_COLUMN_NAMES.has(c.name));
              const insertIdx = firstAuditIdx === -1 ? prev.length : firstAuditIdx;
              focusTargetRef.current = { type: 'col', index: insertIdx };
              return [...prev.slice(0, insertIdx), createEmptyColumn(), ...prev.slice(insertIdx)];
            })}
          style={{ flex: 1 }}
          size="small"
        >
          {t('tableEditor.addColumn')}
        </Button>
        {defaultColumns.length > 0 && (
          <Button
            icon={<ImportOutlined />}
            onClick={applyDefaultColumns}
            style={{ flex: 1 }}
            size="small"
          >
            {t('tableEditor.applyDefaultColumns')}
          </Button>
        )}
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Index list */}
      <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        {t('tableEditor.indexes')}
      </Text>
      {idxs.length > 0 && (
        <div
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid #f0f0f0',
            borderRadius: 6,
          }}
        >
          {/* Index header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 50px 32px',
              gap: 4,
              padding: '6px 8px',
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              fontSize: 11,
              color: '#8c8c8c',
              fontWeight: 600,
              alignItems: 'center',
            }}
          >
            <span>{t('tableEditor.indexName')}</span>
            <span>{t('tableEditor.indexColumns')}</span>
            <span>{t('tableEditor.indexUnique')}</span>
            <span />
          </div>

          {idxs.map((idx, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr 50px 32px',
                gap: 4,
                padding: '4px 8px',
                borderBottom: '1px solid #f5f5f5',
                alignItems: 'center',
              }}
            >
              <Input
                ref={autoFocusRef('idx', i)}
                size="small"
                value={idx.name ?? ''}
                onChange={(e) => updateIdx(i, { name: e.target.value || null })}
                placeholder="idx_name"
              />
              <Select
                size="small"
                mode="multiple"
                value={idx.columns}
                onChange={(v) => updateIdx(i, { columns: v })}
                options={colOptions}
                style={{ width: '100%' }}
                placeholder={t('tableEditor.selectColumns')}
              />
              <Checkbox
                tabIndex={0}
                checked={idx.unique}
                onChange={(e) => updateIdx(i, { unique: e.target.checked })}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                onClick={() => removeIdx(i)}
                style={{ padding: '0 4px', minWidth: 0 }}
              />
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => {
            focusTargetRef.current = { type: 'idx', index: idxs.length };
            setIdxs((prev) => [...prev, createEmptyIndex()]);
          }}
          style={{ flex: 1 }}
          size="small"
        >
          {t('tableEditor.addIndex')}
        </Button>
        {defaultIndexes.length > 0 && (
          <Button
            icon={<ImportOutlined />}
            onClick={applyDefaultIndexes}
            style={{ flex: 1 }}
            size="small"
          >
            {t('tableEditor.applyDefaultIndexes')}
          </Button>
        )}
      </div>
    </Modal>
  );
}
