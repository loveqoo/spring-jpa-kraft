import { useState, useMemo } from 'react';
import { Modal, Input, Button, Select, InputNumber, Checkbox, Alert, Divider, Typography, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, ImportOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TableColumn, TableIndex } from '../types/tableSchema';
import { COLUMN_TYPES, TYPES_WITH_SIZE } from '../types/aggregateConfig';

const { Text } = Typography;

interface Props {
  open: boolean;
  tableName: string;
  columns: TableColumn[];
  indexes: TableIndex[];
  existingNames: string[];
  defaultColumns: TableColumn[];
  onSave: (newName: string, columns: TableColumn[], indexes: TableIndex[]) => void;
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
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(tableName);
  const [cols, setCols] = useState<TableColumn[]>(columns);
  const [idxs, setIdxs] = useState<TableIndex[]>(indexes);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setName(tableName);
    setCols(columns.map((c) => ({ ...c })));
    setIdxs(indexes.map((idx) => ({ ...idx, columns: [...idx.columns] })));
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
      const defaultMap = new Map(defaultColumns.map((c) => [c.name, { ...c }]));
      // Overwrite existing columns that match by name
      const updated = prev.map((c) => (defaultMap.has(c.name) ? { ...defaultMap.get(c.name)! } : c));
      const existingNames = new Set(prev.map((c) => c.name));
      // Append new default columns that don't exist yet
      const appended = defaultColumns.filter((c) => !existingNames.has(c.name)).map((c) => ({ ...c }));
      return [...updated, ...appended];
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
    onSave(trimmed, cols, idxs);
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
      width={780}
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

      {/* Table name */}
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
          {t('tableEditor.tableName')}
        </Text>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          style={{ width: 300 }}
        />
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
            gridTemplateColumns: '140px 120px 70px repeat(3, 32px) 100px 64px',
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
          <span>{t('tableEditor.colDefault')}</span>
          <span />
        </div>

        {cols.map((col, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '140px 120px 70px repeat(3, 32px) 100px 64px',
              gap: 4,
              padding: '4px 8px',
              borderBottom: '1px solid #f5f5f5',
              alignItems: 'center',
            }}
          >
            <Input
              size="small"
              value={col.name}
              onChange={(e) => updateCol(i, { name: e.target.value })}
              placeholder="column_name"
            />
            <Select
              size="small"
              value={col.typeName.toUpperCase()}
              onChange={(v) => {
                const patch: Partial<TableColumn> = { typeName: v };
                if (!TYPES_WITH_SIZE.has(v)) patch.typeValue = null;
                updateCol(i, patch);
              }}
              options={COLUMN_TYPES.map((t) => ({ label: t, value: t }))}
              style={{ width: '100%' }}
              showSearch
            />
            <InputNumber
              size="small"
              value={col.typeValue}
              onChange={(v) => updateCol(i, { typeValue: v })}
              min={0}
              disabled={!TYPES_WITH_SIZE.has(col.typeName.toUpperCase())}
              style={{ width: '100%' }}
              placeholder="—"
            />
            <Checkbox
              checked={col.primaryKey}
              disabled={!col.primaryKey && cols.some((c) => c.primaryKey)}
              onChange={(e) => updateCol(i, { primaryKey: e.target.checked })}
            />
            <Checkbox checked={col.notNull} onChange={(e) => updateCol(i, { notNull: e.target.checked })} />
            <Checkbox checked={col.autoIncrement} onChange={(e) => updateCol(i, { autoIncrement: e.target.checked })} />
            <Input
              size="small"
              value={col.defaultValue ?? ''}
              onChange={(e) => updateCol(i, { defaultValue: e.target.value || null })}
              placeholder="—"
            />
            <div style={{ display: 'flex', gap: 2 }}>
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined style={{ fontSize: 10 }} />}
                disabled={i === 0}
                onClick={() => moveCol(i, -1)}
                style={{ padding: '0 4px', minWidth: 0 }}
              />
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined style={{ fontSize: 10 }} />}
                disabled={i === cols.length - 1}
                onClick={() => moveCol(i, 1)}
                style={{ padding: '0 4px', minWidth: 0 }}
              />
              <Tooltip title={indexedColumns.has(col.name) ? t('tableEditor.removeIndexFirst') : undefined}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                  onClick={() => removeCol(i)}
                  disabled={indexedColumns.has(col.name)}
                  style={{ padding: '0 4px', minWidth: 0 }}
                />
              </Tooltip>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setCols((prev) => [...prev, createEmptyColumn()])}
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
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => setIdxs((prev) => [...prev, createEmptyIndex()])}
        style={{ width: '100%', marginTop: 8 }}
        size="small"
      >
        {t('tableEditor.addIndex')}
      </Button>
    </Modal>
  );
}
