import { Input, Select, Button, Tooltip, Divider, Popover, Tag, InputNumber } from 'antd';
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
import { ID_STRATEGIES, COLUMN_TYPES, TYPES_WITH_SIZE } from '../types/aggregateConfig';
import type { IdStrategy } from '../types/aggregateConfig';
import type { TableColumn } from '../types/tableSchema';

const COMMON_AUDIT_COLUMNS = ['created_at', 'created_by', 'updated_at', 'updated_by'];

const ID_STRATEGY_OPTIONS = ID_STRATEGIES.map((s) => ({ label: s, value: s }));
const COLUMN_TYPE_OPTIONS = COLUMN_TYPES.map((ct) => ({ label: ct, value: ct }));

const AUDIT_COLUMN_PRESET: TableColumn[] = [
  { name: 'created_at', typeName: 'DATETIME', typeValue: null, primaryKey: false, notNull: true, unique: false, autoIncrement: false, defaultValue: null, note: null },
  { name: 'created_by', typeName: 'VARCHAR', typeValue: 100, primaryKey: false, notNull: true, unique: false, autoIncrement: false, defaultValue: null, note: null },
  { name: 'updated_at', typeName: 'DATETIME', typeValue: null, primaryKey: false, notNull: true, unique: false, autoIncrement: false, defaultValue: null, note: null },
  { name: 'updated_by', typeName: 'VARCHAR', typeValue: 100, primaryKey: false, notNull: true, unique: false, autoIncrement: false, defaultValue: null, note: null },
];

interface Props {
  basePackage: string;
  globalIdStrategy: IdStrategy;
  hiddenColumns: string[];
  onBasePackageChange: (value: string) => void;
  onIdStrategyChange: (value: IdStrategy) => void;
  onHiddenColumnsChange: (columns: string[]) => void;
  defaultColumns: TableColumn[];
  onDefaultColumnsChange: (columns: TableColumn[]) => void;
  onAddTable: () => void;
  onExportDDL: () => void;
  onExport: () => void;
  onBack: () => void;
  exportDisabled?: boolean;
}

export default function DesignerToolbar({
  basePackage,
  globalIdStrategy,
  hiddenColumns,
  onBasePackageChange,
  onIdStrategyChange,
  onHiddenColumnsChange,
  defaultColumns,
  onDefaultColumnsChange,
  onAddTable,
  onExportDDL,
  onExport,
  onBack,
  exportDisabled = false,
}: Props) {
  const { t } = useTranslation();
  const { isMobile, isDesktop, isWideDesktop } = useResponsive();
  const hiddenCount = hiddenColumns.length;

  const handleAddPreset = () => {
    const merged = Array.from(new Set([...hiddenColumns, ...COMMON_AUDIT_COLUMNS]));
    onHiddenColumnsChange(merged);
  };

  const handleRemove = (col: string) => {
    onHiddenColumnsChange(hiddenColumns.filter((c) => c !== col));
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {hiddenColumns.map((col) => (
          <Tag key={col} closable onClose={() => handleRemove(col)} style={{ fontSize: 11 }}>
            {col}
          </Tag>
        ))}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button size="small" type="link" onClick={handleAddPreset} style={{ padding: 0, fontSize: 12 }}>
          {t('toolbar.addAuditColumns')}
        </Button>
        {hiddenCount > 0 && (
          <Button size="small" type="link" danger onClick={() => onHiddenColumnsChange([])} style={{ padding: 0, fontSize: 12 }}>
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
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{t('toolbar.defaultColumns')}</div>
        <DefaultColumnsEditor columns={defaultColumns} onChange={onDefaultColumnsChange} compact />
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
              <DefaultColumnsEditor
                columns={defaultColumns}
                onChange={onDefaultColumnsChange}
              />
            }
            title={t('toolbar.defaultColumnsTitle')}
            trigger="click"
            placement="bottomRight"
          >
            <Button
              type="text"
              style={{ color: defaultColumns.length > 0 ? '#1677ff' : '#8c8c8c', fontSize: 12, whiteSpace: 'nowrap' }}
            >
              {isWideDesktop ? t('toolbar.defaultColumns') : t('toolbar.defaultColumnsShort')}{defaultColumns.length > 0 ? ` (${defaultColumns.length})` : ''}
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

function DefaultColumnsEditor({
  columns,
  onChange,
  compact = false,
}: {
  columns: TableColumn[];
  onChange: (columns: TableColumn[]) => void;
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

  const addAuditPreset = () => {
    const existingNames = new Set(columns.map((c) => c.name));
    const newCols = AUDIT_COLUMN_PRESET.filter((c) => !existingNames.has(c.name));
    if (newCols.length > 0) onChange([...columns, ...newCols.map((c) => ({ ...c }))]);
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
                onChange={(e) => updateColumn(i, { name: e.target.value })}
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
              />
              <input
                type="checkbox"
                checked={col.notNull}
                onChange={(e) => updateColumn(i, { notNull: e.target.checked })}
                style={{ margin: '0 auto' }}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined style={{ fontSize: 11 }} />}
                onClick={() => removeColumn(i)}
                style={{ padding: 0, minWidth: 0, height: 22 }}
              />
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={addColumn} style={{ fontSize: 12 }}>
          {t('toolbar.addColumn')}
        </Button>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="small" type="link" onClick={addAuditPreset} style={{ padding: 0, fontSize: 12 }}>
            {t('toolbar.auditColumns')}
          </Button>
          {columns.length > 0 && (
            <Button size="small" type="link" danger onClick={() => onChange([])} style={{ padding: 0, fontSize: 12 }}>
              {t('toolbar.clearAll')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
