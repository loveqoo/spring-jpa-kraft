import { useState, useMemo } from 'react';
import { Modal, Tag, Typography, Empty, Checkbox } from 'antd';
import { PlusOutlined, MinusOutlined, EditOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { DeltaResponse } from '../ai/responseConverter';

const { Text } = Typography;

/** A selectable item in the diff */
interface DiffItem {
  key: string;
  type: 'add_table' | 'remove_table' | 'modify_table' | 'add_rel' | 'remove_rel';
  label: string;
  addedColumns?: string[];
  removedColumns?: string[];
}

interface Props {
  open: boolean;
  delta: DeltaResponse;
  onApply: (filtered: DeltaResponse) => void;
  onReject: () => void;
}

function buildDiffItems(delta: DeltaResponse): DiffItem[] {
  const items: DiffItem[] = [];

  // New tables
  for (const t of delta.add_tables ?? []) {
    if (!t.name || t.columns.length === 0) continue;
    items.push({ key: `add_table::${t.name}`, type: 'add_table', label: t.name, addedColumns: t.columns });
  }

  // Removed tables
  for (const name of delta.remove_tables ?? []) {
    if (!name) continue;
    items.push({ key: `remove_table::${name}`, type: 'remove_table', label: name });
  }

  // Merge add_columns + remove_columns per table into "modify_table"
  const modifiedTables = new Map<string, { added: string[]; removed: string[] }>();
  for (const entry of delta.add_columns ?? []) {
    if (!entry.table || entry.columns.length === 0) continue;
    if (!modifiedTables.has(entry.table)) modifiedTables.set(entry.table, { added: [], removed: [] });
    modifiedTables.get(entry.table)!.added.push(...entry.columns);
  }
  for (const entry of delta.remove_columns ?? []) {
    if (!entry.table || entry.columns.length === 0) continue;
    if (!modifiedTables.has(entry.table)) modifiedTables.set(entry.table, { added: [], removed: [] });
    modifiedTables.get(entry.table)!.removed.push(...entry.columns);
  }
  for (const [table, { added, removed }] of modifiedTables) {
    items.push({
      key: `modify_table::${table}`,
      type: 'modify_table',
      label: table,
      addedColumns: added.length > 0 ? added : undefined,
      removedColumns: removed.length > 0 ? removed : undefined,
    });
  }

  // Relationships
  for (const r of delta.add_relationships ?? []) {
    if (!r.parent || !r.child) continue;
    items.push({ key: `add_rel::${r.parent}::${r.child}`, type: 'add_rel', label: `${r.parent} → ${r.child}` });
  }
  for (const r of delta.remove_relationships ?? []) {
    if (!r.parent || !r.child) continue;
    items.push({ key: `remove_rel::${r.parent}::${r.child}`, type: 'remove_rel', label: `${r.parent} → ${r.child}` });
  }

  return items;
}

/** Reconstruct a filtered DeltaResponse from selected keys */
function filterDelta(delta: DeltaResponse, selectedKeys: Set<string>): DeltaResponse {
  const result: DeltaResponse = {};

  const addTables = (delta.add_tables ?? []).filter((t) => selectedKeys.has(`add_table::${t.name}`));
  if (addTables.length > 0) result.add_tables = addTables;

  const removeTables = (delta.remove_tables ?? []).filter((name) => selectedKeys.has(`remove_table::${name}`));
  if (removeTables.length > 0) result.remove_tables = removeTables;

  // modify_table key maps back to both add_columns and remove_columns
  const selectedModTables = new Set(
    [...selectedKeys].filter((k) => k.startsWith('modify_table::')).map((k) => k.slice('modify_table::'.length)),
  );
  const addCols = (delta.add_columns ?? []).filter((e) => selectedModTables.has(e.table));
  if (addCols.length > 0) result.add_columns = addCols;
  const removeCols = (delta.remove_columns ?? []).filter((e) => selectedModTables.has(e.table));
  if (removeCols.length > 0) result.remove_columns = removeCols;

  const addRels = (delta.add_relationships ?? []).filter((r) => selectedKeys.has(`add_rel::${r.parent}::${r.child}`));
  if (addRels.length > 0) result.add_relationships = addRels;

  const removeRels = (delta.remove_relationships ?? []).filter((r) => selectedKeys.has(`remove_rel::${r.parent}::${r.child}`));
  if (removeRels.length > 0) result.remove_relationships = removeRels;

  return result;
}

const TAG_CONFIG = {
  add_table:    { color: 'green',  icon: <PlusOutlined />,  i18nKey: 'ai.diffAddTable' },
  remove_table: { color: 'red',    icon: <MinusOutlined />, i18nKey: 'ai.diffRemoveTable' },
  modify_table: { color: 'blue',   icon: <EditOutlined />,  i18nKey: 'ai.diffModifyTable' },
  add_rel:      { color: 'green',  icon: <PlusOutlined />,  i18nKey: 'ai.diffAddRel' },
  remove_rel:   { color: 'red',    icon: <MinusOutlined />, i18nKey: 'ai.diffRemoveRel' },
} as const;

export default function AIDiffPreview({ open, delta, onApply, onReject }: Props) {
  const { t } = useTranslation();

  const items = useMemo(() => buildDiffItems(delta), [delta]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(items.map((i) => i.key)));

  // Reset selection when delta changes
  const [prevDelta, setPrevDelta] = useState(delta);
  if (delta !== prevDelta) {
    setPrevDelta(delta);
    setSelected(new Set(items.map((i) => i.key)));
  }

  const allChecked = selected.size === items.length;
  const noneChecked = selected.size === 0;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.key)));
  };

  const handleApply = () => {
    const filtered = filterDelta(delta, selected);
    onApply(filtered);
  };

  if (items.length === 0) {
    return (
      <Modal title={t('ai.diffTitle')} open={open} onCancel={onReject} footer={null} width={520}>
        <Empty description={t('ai.noChanges')} />
      </Modal>
    );
  }

  return (
    <Modal
      title={t('ai.diffTitle')}
      open={open}
      onOk={handleApply}
      onCancel={onReject}
      okText={t('ai.applySelected', { count: selected.size })}
      cancelText={t('ai.reject')}
      okButtonProps={{ disabled: noneChecked }}
      width={520}
    >
      <div style={{ marginBottom: 8 }}>
        <Checkbox
          checked={allChecked}
          indeterminate={!allChecked && !noneChecked}
          onChange={toggleAll}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>{t('ai.selectAll')}</Text>
        </Checkbox>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflow: 'auto' }}>
        {items.map((item) => {
          const cfg = TAG_CONFIG[item.type];
          return (
            <div key={item.key} style={{ padding: '4px 0' }}>
              <Checkbox
                checked={selected.has(item.key)}
                onChange={() => toggle(item.key)}
              >
                <Tag color={cfg.color} icon={cfg.icon} style={{ marginRight: 6 }}>
                  {t(cfg.i18nKey)}
                </Tag>
                <Text strong={item.type !== 'modify_table'}>
                  {item.label}
                </Text>
              </Checkbox>
              {(item.addedColumns || item.removedColumns) && (
                <div style={{ paddingLeft: 32, marginTop: 2 }}>
                  {item.addedColumns?.map((d) => (
                    <div key={`+${d}`} style={{ fontSize: 12, color: '#52c41a', fontFamily: 'monospace' }}>
                      + {d}
                    </div>
                  ))}
                  {item.removedColumns?.map((d) => (
                    <div key={`-${d}`} style={{ fontSize: 12, color: '#ff4d4f', fontFamily: 'monospace', textDecoration: 'line-through' }}>
                      - {d}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
