import { useState } from 'react';
import { Input, Select, Button, Tooltip, Divider, Popover, Tag, InputNumber, Checkbox, Typography } from 'antd';
import {
  ExportOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  InfoCircleOutlined,
  EyeInvisibleOutlined,
  PlusOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import { useResponsive } from '../hooks/useResponsive';
import { ID_STRATEGIES, COLUMN_TYPES, TYPES_WITH_SIZE, ENGINES, CHARSETS } from '../types/aggregateConfig';
import type { IdStrategy } from '../types/aggregateConfig';
import type { TableColumn, TableIndex } from '../types/tableSchema';
import { AUDIT_COLUMNS, AUDIT_COLUMN_NAMES } from '../types/tableSchema';

const ID_STRATEGY_OPTIONS = ID_STRATEGIES.map((s) => ({ label: s, value: s }));
const COLUMN_TYPE_OPTIONS = COLUMN_TYPES.map((ct) => ({ label: ct, value: ct }));
const ENGINE_OPTIONS = ENGINES.map((e) => ({ label: e, value: e }));
const CHARSET_OPTIONS = CHARSETS.map((c) => ({ label: c, value: c }));

interface Props {
  basePackage: string;
  globalIdStrategy: IdStrategy;
  globalEngine: string;
  onEngineChange: (value: string) => void;
  globalCharset: string;
  onCharsetChange: (value: string) => void;
  hiddenColumns: string[];
  onBasePackageChange: (value: string) => void;
  onIdStrategyChange: (value: IdStrategy) => void;
  onHiddenColumnsChange: (columns: string[]) => void;
  defaultColumns: TableColumn[];
  onDefaultColumnsChange: (columns: TableColumn[]) => void;
  defaultIndexes: TableIndex[];
  onDefaultIndexesChange: (indexes: TableIndex[]) => void;
  enumDefinitions: Record<string, string[]>;
  onEnumAdd: (name: string, values: string[]) => void;
  onEnumUpdate: (name: string, values: string[]) => void;
  onEnumRemove: (name: string) => void;
  onAddTable: () => void;
  onExportDDL: () => void;
  onExport: () => void;
  onBack: () => void;
  exportDisabled?: boolean;
}

export default function DesignerToolbar({
  basePackage,
  globalIdStrategy,
  globalEngine,
  onEngineChange,
  globalCharset,
  onCharsetChange,
  hiddenColumns,
  onBasePackageChange,
  onIdStrategyChange,
  onHiddenColumnsChange,
  defaultColumns,
  onDefaultColumnsChange,
  defaultIndexes,
  onDefaultIndexesChange,
  enumDefinitions,
  onEnumAdd,
  onEnumUpdate,
  onEnumRemove,
  onAddTable,
  onExportDDL,
  onExport,
  onBack,
  exportDisabled = false,
}: Props) {
  const { t } = useTranslation();
  const { isMobile, isDesktop, isWideDesktop, isExtraWide } = useResponsive();
  const hiddenCount = hiddenColumns.length;
  const defaultColumnNames = defaultColumns.filter((c) => c.name.trim()).map((c) => c.name);

  const addToHidden = (names: Iterable<string>) => {
    onHiddenColumnsChange(Array.from(new Set([...hiddenColumns, ...names])));
  };

  const hiddenColumnsContent = (
    <div style={{ width: 280 }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
        {t('toolbar.hiddenColumnsDesc')}
      </div>

      <Select
        mode="tags"
        size="small"
        style={{ width: '100%', marginBottom: 8 }}
        placeholder={t('toolbar.hiddenColumnsPlaceholder')}
        value={hiddenColumns}
        onChange={onHiddenColumnsChange}
        tokenSeparators={[',']}
        notFoundContent={null}
      />

      <Divider style={{ margin: '8px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button size="small" type="link" onClick={() => addToHidden(AUDIT_COLUMN_NAMES)} style={{ padding: 0, fontSize: 12 }}>
            {t('toolbar.hideAuditColumns')}
          </Button>
          {defaultColumnNames.length > 0 && (
            <Button size="small" type="link" onClick={() => addToHidden(defaultColumnNames)} style={{ padding: 0, fontSize: 12 }}>
              {t('toolbar.addDefaultColumns')}
            </Button>
          )}
        </div>
        {hiddenCount > 0 && (
          <Button size="small" type="link" danger onClick={() => onHiddenColumnsChange([])} style={{ padding: 0, fontSize: 12, alignSelf: 'flex-end' }}>
            {t('toolbar.clearAll')}
          </Button>
        )}
      </div>
    </div>
  );

  // Settings popover content for compact mode (mobile/tablet)
  const settingsContent = (
    <div style={{ width: 300 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t('toolbar.package')}</div>
        <Input
          value={basePackage}
          onChange={(e) => onBasePackageChange(e.target.value)}
          size="small"
          placeholder={t('toolbar.packagePlaceholder')}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t('toolbar.idStrategy')}</div>
        <Select
          value={globalIdStrategy}
          onChange={onIdStrategyChange}
          options={ID_STRATEGY_OPTIONS}
          size="small"
          style={{ width: '100%' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t('toolbar.engine')}</div>
          <Select value={globalEngine} onChange={onEngineChange} options={ENGINE_OPTIONS} size="small" style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t('toolbar.charset')}</div>
          <Select value={globalCharset} onChange={onCharsetChange} options={CHARSET_OPTIONS} size="small" style={{ width: '100%' }} />
        </div>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t('toolbar.defaultColumns')}</div>
        <DefaultColumnsEditor columns={defaultColumns} onChange={onDefaultColumnsChange} defaultIndexes={defaultIndexes} compact />
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t('toolbar.defaultIndexes')}</div>
        <DefaultIndexesEditor indexes={defaultIndexes} onChange={onDefaultIndexesChange} columnNames={defaultColumnNames} compact />
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t('toolbar.enums')}</div>
        <EnumDefinitionsEditor enums={enumDefinitions} onAdd={onEnumAdd} onUpdate={onEnumUpdate} onRemove={onEnumRemove} />
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LanguageSwitcher />
      </div>
    </div>
  );

  return (
    <div
      style={{
        padding: isMobile ? '0 8px' : '0 20px',
        height: 56,
        borderBottom: '1px solid #e8e8e8',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 4 : 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Back */}
      <Tooltip title={t('toolbar.backToSchema')}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} />
      </Tooltip>

      <Divider type="vertical" style={{ height: 28, margin: 0 }} />

      {/* Branding — hide text on mobile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AppstoreOutlined style={{ fontSize: 20, color: '#1677ff' }} />
        {isWideDesktop && (
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1f1f1f', letterSpacing: -0.3, whiteSpace: 'nowrap' }}>
            {t('toolbar.title')}
          </span>
        )}
      </div>

      {isWideDesktop && <Divider type="vertical" style={{ height: 28, margin: 0 }} />}

      {/* Base Package — desktop only inline */}
      {isDesktop && (
        <Tooltip title={t('toolbar.packageTooltip')} placement="bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: '1 1 180px', maxWidth: 300 }}>
            <span style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap' }}>{t('toolbar.package')}</span>
            <Input
              value={basePackage}
              onChange={(e) => onBasePackageChange(e.target.value)}
              style={{ flex: 1, minWidth: 80 }}
              size="small"
              placeholder={t('toolbar.packagePlaceholder')}
            />
          </div>
        </Tooltip>
      )}

      {/* ID Strategy — desktop only inline */}
      {isDesktop && (
        <Tooltip title={t('toolbar.idStrategyTooltip')} placement="bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap' }}>
              {t('toolbar.idStrategy')}
            </span>
            <Select
              value={globalIdStrategy}
              onChange={onIdStrategyChange}
              options={ID_STRATEGY_OPTIONS}
              size="small"
              style={{ width: 120 }}
            />
          </div>
        </Tooltip>
      )}

      {/* ENGINE — extra wide desktop only inline */}
      {isExtraWide && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap' }}>{t('toolbar.engine')}</span>
          <Select value={globalEngine} onChange={onEngineChange} options={ENGINE_OPTIONS} size="small" style={{ width: 100 }} />
        </div>
      )}

      {/* CHARSET — extra wide desktop only inline */}
      {isExtraWide && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#8c8c8c', whiteSpace: 'nowrap' }}>{t('toolbar.charset')}</span>
          <Select value={globalCharset} onChange={onCharsetChange} options={CHARSET_OPTIONS} size="small" style={{ width: 110 }} />
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: '1 1 0', minWidth: 0 }} />

      {/* Right actions — never shrink */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 4 : 8, flexShrink: 0 }}>
        {/* Settings popover — mobile/tablet only */}
        {!isDesktop && (
          <Popover content={settingsContent} title={t('toolbar.title')} trigger="click" placement="bottomRight">
            <Button type="text" icon={<SettingOutlined />} style={{ color: '#8c8c8c' }} />
          </Popover>
        )}

        {/* Default Columns */}
        {isDesktop && (
          <Popover
            content={
              <div>
                <DefaultColumnsEditor
                  columns={defaultColumns}
                  onChange={onDefaultColumnsChange}
                  defaultIndexes={defaultIndexes}
                />
                <Divider style={{ margin: '12px 0' }} />
                <DefaultIndexesEditor
                  indexes={defaultIndexes}
                  onChange={onDefaultIndexesChange}
                  columnNames={defaultColumnNames}
                />
              </div>
            }
            title={t('toolbar.defaultSettingsTitle')}
            trigger="click"
            placement="bottomRight"
          >
            <Button
              type="text"
              style={{ color: defaultColumns.length > 0 || defaultIndexes.length > 0 ? '#1677ff' : '#8c8c8c', fontSize: 12, whiteSpace: 'nowrap' }}
            >
              {isWideDesktop ? t('toolbar.defaultSettings') : t('toolbar.defaultSettingsShort')}{defaultColumns.length + defaultIndexes.length > 0 ? ` (${defaultColumns.length + defaultIndexes.length})` : ''}
            </Button>
          </Popover>
        )}

        {/* Enums */}
        {isDesktop && (
          <Popover
            content={
              <EnumDefinitionsEditor
                enums={enumDefinitions}
                onAdd={onEnumAdd}
                onUpdate={onEnumUpdate}
                onRemove={onEnumRemove}
              />
            }
            title={t('toolbar.enums')}
            trigger="click"
            placement="bottomRight"
          >
            <Button
              type="text"
              style={{ color: Object.keys(enumDefinitions).length > 0 ? '#1677ff' : '#8c8c8c', fontSize: 12, whiteSpace: 'nowrap' }}
            >
              {isWideDesktop ? t('toolbar.enums') : t('toolbar.enumsShort')}{Object.keys(enumDefinitions).length > 0 ? ` (${Object.keys(enumDefinitions).length})` : ''}
            </Button>
          </Popover>
        )}

        {/* Hidden Columns */}
        <Popover
          content={hiddenColumnsContent}
          title={t('toolbar.hiddenColumns')}
          trigger="click"
          placement="bottomRight"
        >
          <Tooltip title={t('toolbar.hiddenColumnsTooltip')}>
            <Button
              type="text"
              icon={<EyeInvisibleOutlined />}
              style={{ color: hiddenCount > 0 ? '#1677ff' : '#8c8c8c' }}
            >
              {hiddenCount > 0 && (
                <span style={{ fontSize: 12 }}>
                  {hiddenCount}
                </span>
              )}
            </Button>
          </Tooltip>
        </Popover>

        {/* Language Switcher — desktop only (in settings popover for mobile) */}
        {isDesktop && <LanguageSwitcher />}

        {/* Help hint */}
        <Tooltip
          title={
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div>{t('toolbar.helpClickNode')}</div>
              <div>{t('toolbar.helpClickEdge')}</div>
              <div>{t('toolbar.helpDragHandle')}</div>
              <div>{t('toolbar.helpDragNode')}</div>
            </div>
          }
          placement="bottomRight"
        >
          <Button
            type="text"
            icon={<InfoCircleOutlined />}
            style={{ color: '#8c8c8c' }}
          />
        </Tooltip>

        {/* Add Table */}
        <Tooltip title={t('toolbar.addTableTooltip')}>
          <Button icon={<PlusOutlined />} onClick={onAddTable}>
            {isWideDesktop && t('toolbar.addTable')}
          </Button>
        </Tooltip>

        {/* Export DDL */}
        <Tooltip title={exportDisabled ? t('toolbar.fixValidationFirst') : t('toolbar.exportDdlTooltip')}>
          <Button icon={<DatabaseOutlined />} onClick={onExportDDL} disabled={exportDisabled}>
            {isWideDesktop && t('toolbar.exportDdl')}
          </Button>
        </Tooltip>

        {/* Export JSON */}
        <Tooltip title={exportDisabled ? t('toolbar.fixValidationFirst') : undefined}>
          <Button type="primary" icon={<ExportOutlined />} onClick={onExport} disabled={exportDisabled}>
            {isWideDesktop && t('toolbar.exportJson')}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}

const { Text } = Typography;

function EnumDefinitionsEditor({
  enums,
  onAdd,
  onUpdate,
  onRemove,
}: {
  enums: Record<string, string[]>;
  onAdd: (name: string, values: string[]) => void;
  onUpdate: (name: string, values: string[]) => void;
  onRemove: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const entries = Object.entries(enums);

  const isValidIdentifier = (s: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed || enums[trimmed] || !isValidIdentifier(trimmed)) return;
    onAdd(trimmed, []);
    setNewName('');
  };

  return (
    <div style={{ width: 360 }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
        {t('toolbar.enumsDesc')}
      </div>
      {entries.map(([name, values]) => (
        <div key={name} style={{ marginBottom: 8, border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text strong style={{ fontSize: 13 }}>{name}</Text>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onRemove(name)} />
          </div>
          <Select
            mode="tags"
            size="small"
            style={{ width: '100%' }}
            placeholder={t('toolbar.enumValuesPlaceholder')}
            value={values}
            onChange={(v) => onUpdate(name, v.filter(isValidIdentifier))}
            tokenSeparators={[',']}
            notFoundContent={null}
          />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 4 }}>
        <Input
          size="small"
          placeholder={t('toolbar.enumNamePlaceholder')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={handleAdd}
          style={{ flex: 1 }}
        />
        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={handleAdd} disabled={!newName.trim() || !!enums[newName.trim()]}>
          {t('toolbar.addEnum')}
        </Button>
      </div>
    </div>
  );
}

function DefaultColumnsEditor({
  columns,
  onChange,
  defaultIndexes = [],
  compact = false,
}: {
  columns: TableColumn[];
  onChange: (columns: TableColumn[]) => void;
  defaultIndexes?: TableIndex[];
  compact?: boolean;
}) {
  const { t } = useTranslation();

  const addColumn = () => {
    onChange([
      ...columns,
      {
        name: '',
        typeName: 'VARCHAR',
        typeValue: 255,
        primaryKey: false,
        notNull: false,
        unique: false,
        autoIncrement: false,
        defaultValue: null,
        note: null,
      },
    ]);
  };

  const updateColumn = (index: number, patch: Partial<TableColumn>) => {
    onChange(columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const removeColumn = (index: number) => {
    onChange(columns.filter((_, i) => i !== index));
  };

  const gridCols = compact ? '1fr 90px 50px 28px 28px' : '110px 100px 60px 32px 28px';

  return (
    <div style={{ width: compact ? '100%' : 420 }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
        {t('toolbar.defaultColumnsDesc').split('<id>')[0]}<Tag style={{ fontSize: 11 }}>id</Tag>{t('toolbar.defaultColumnsDesc').split('<id>')[1]}
      </div>

      {columns.length > 0 && (
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 8 }}>
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: 4,
              padding: '4px 6px',
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              fontSize: 10,
              color: '#8c8c8c',
              fontWeight: 600,
              alignItems: 'center',
            }}
          >
            <span>{t('toolbar.colName')}</span>
            <span>{t('toolbar.colType')}</span>
            <span>{t('toolbar.colSize')}</span>
            <span>{t('toolbar.colNN')}</span>
            <span />
          </div>
          {columns.map((col, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                gap: 4,
                padding: '3px 6px',
                borderBottom: '1px solid #f5f5f5',
                alignItems: 'center',
              }}
            >
              <Input
                size="small"
                value={col.name}
                onChange={(e) => {
                  const v = e.target.value;
                  if (AUDIT_COLUMN_NAMES.has(v)) return;
                  updateColumn(i, { name: v });
                }}
                placeholder={t('toolbar.colNamePlaceholder')}
                style={{ fontSize: 12 }}
              />
              <Select
                size="small"
                value={col.typeName.toUpperCase()}
                onChange={(v) => {
                  const patch: Partial<TableColumn> = { typeName: v };
                  if (!TYPES_WITH_SIZE.has(v)) patch.typeValue = null;
                  updateColumn(i, patch);
                }}
                options={COLUMN_TYPE_OPTIONS}
                style={{ width: '100%', fontSize: 11 }}
                showSearch
              />
              <InputNumber
                size="small"
                value={col.typeValue}
                onChange={(v) => updateColumn(i, { typeValue: v })}
                min={0}
                disabled={!TYPES_WITH_SIZE.has(col.typeName.toUpperCase())}
                style={{ width: '100%' }}
                placeholder="—"
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    const row = (e.target as HTMLElement).closest('[style]')?.parentElement;
                    const cb = row?.querySelector<HTMLInputElement>('.ant-checkbox-input');
                    if (cb) { e.preventDefault(); cb.focus(); }
                  }
                }}
              />
              <Checkbox
                checked={col.notNull}
                onChange={(e) => updateColumn(i, { notNull: e.target.checked })}
                style={{ margin: '0 auto' }}
              />
              <Tooltip title={defaultIndexes.some((idx) => idx.columns.includes(col.name)) ? t('toolbar.removeIndexFirst') : undefined}>
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                  onClick={() => removeColumn(i)}
                  disabled={defaultIndexes.some((idx) => idx.columns.includes(col.name))}
                  style={{ padding: 0, minWidth: 0, height: 22 }}
                />
              </Tooltip>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addColumn} style={{ fontSize: 12 }}>
            {t('toolbar.addColumn')}
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => {
              const existingNames = new Set(columns.map((c) => c.name));
              const newCols = AUDIT_COLUMNS.filter((c) => !existingNames.has(c.name));
              if (newCols.length > 0) onChange([...columns, ...newCols.map((c) => ({ ...c }))]);
            }}
            style={{ padding: 0, fontSize: 12 }}
          >
            {t('toolbar.addAuditColumns')}
          </Button>
        </div>
        {columns.length > 0 && (
          <Button size="small" type="link" danger onClick={() => onChange([])} style={{ padding: 0, fontSize: 12 }}>
            {t('toolbar.clearAll')}
          </Button>
        )}
      </div>
    </div>
  );
}

function DefaultIndexesEditor({
  indexes,
  onChange,
  columnNames,
  compact = false,
}: {
  indexes: TableIndex[];
  onChange: (indexes: TableIndex[]) => void;
  columnNames: string[];
  compact?: boolean;
}) {
  const { t } = useTranslation();

  const addIndex = () => {
    const existingKeys = new Set(indexes.map((idx) => [...idx.columns].sort().join(',')));
    const newIndexes = columnNames
      .filter((name) => !existingKeys.has(name))
      .map((name) => ({
        name: `idx_${name.replace(/[^a-z]/g, '')}`,
        columns: [name],
        unique: false,
        primaryKey: false,
      }));
    if (newIndexes.length > 0) {
      onChange([...indexes, ...newIndexes]);
    }
  };

  const updateIndex = (index: number, patch: Partial<TableIndex>) => {
    onChange(indexes.map((idx, i) => (i === index ? { ...idx, ...patch } : idx)));
  };

  const removeIndex = (index: number) => {
    onChange(indexes.filter((_, i) => i !== index));
  };

  const indexedColumns = new Set(indexes.flatMap((idx) => idx.columns));
  const allColumnsIndexed = columnNames.length > 0 && columnNames.every((n) => indexedColumns.has(n));

  const colOptions = columnNames.map((n) => ({ label: n, value: n }));
  const gridCols = compact ? '1fr 1fr 40px 28px' : '120px 1fr 50px 28px';

  return (
    <div style={{ width: compact ? '100%' : 420 }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
        {t('toolbar.defaultIndexesDesc')}
      </div>

      {indexes.length > 0 && (
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, marginBottom: 8 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gap: 4,
              padding: '4px 6px',
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
              fontSize: 10,
              color: '#8c8c8c',
              fontWeight: 600,
              alignItems: 'center',
            }}
          >
            <span>{t('toolbar.idxName')}</span>
            <span>{t('toolbar.idxColumns')}</span>
            <span>{t('toolbar.idxUnique')}</span>
            <span />
          </div>
          {indexes.map((idx, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                gap: 4,
                padding: '3px 6px',
                borderBottom: '1px solid #f5f5f5',
                alignItems: 'center',
              }}
            >
              <Input
                size="small"
                value={idx.name ?? ''}
                onChange={(e) => updateIndex(i, { name: e.target.value || null })}
                placeholder="idx_name"
                style={{ fontSize: 12 }}
              />
              <Select
                size="small"
                mode="multiple"
                value={idx.columns}
                onChange={(v) => updateIndex(i, { columns: v })}
                options={colOptions}
                style={{ width: '100%', fontSize: 11 }}
                placeholder={t('toolbar.idxSelectColumns')}
              />
              <Checkbox
                checked={idx.unique}
                onChange={(e) => updateIndex(i, { unique: e.target.checked })}
                style={{ margin: '0 auto' }}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                onClick={() => removeIndex(i)}
                style={{ padding: 0, minWidth: 0, height: 22 }}
              />
            </div>
          ))}
        </div>
      )}

      <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addIndex} disabled={allColumnsIndexed || columnNames.length === 0} style={{ fontSize: 12, width: '100%' }}>
        {t('toolbar.addIndexBatch')}
      </Button>
    </div>
  );
}
