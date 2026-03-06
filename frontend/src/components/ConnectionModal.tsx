import { useState, useMemo } from 'react';
import { Modal, Select, Segmented, Typography, Divider, Alert } from 'antd';
import { Trans, useTranslation } from 'react-i18next';
import type { TableDef } from '../types/tableSchema';
import type { RelationType } from '../types/aggregateConfig';

const { Text } = Typography;

type Cardinality = 'One' | 'Many';

export interface PendingConnection {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}

export interface ConfirmedConnectionResult {
  relationType: RelationType;
  joinColumn: string;
  fkTableName: string;
}

interface Props {
  pending: PendingConnection;
  tables: TableDef[];
  onConfirm: (result: ConfirmedConnectionResult) => void;
  onCancel: () => void;
}

function cardinalitiesToRel(source: Cardinality, target: Cardinality): RelationType | null {
  if (source === 'Many' && target === 'One') return 'ManyToOne';
  if (source === 'One' && target === 'Many') return 'OneToMany';
  if (source === 'One' && target === 'One') return 'OneToOne';
  return null; // Many-Many not supported
}

const CREATE_NEW = '__create_new__';

export default function ConnectionModal({ pending, tables, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const [sourceCard, setSourceCard] = useState<Cardinality>('Many');
  const [targetCard, setTargetCard] = useState<Cardinality>('One');
  const [joinColumn, setJoinColumn] = useState<string>(CREATE_NEW);

  const relationType = cardinalitiesToRel(sourceCard, targetCard);
  const isManyToMany = relationType === null;

  // FK side: Many side holds the FK. For OneToOne, source holds FK.
  const fkTableName = sourceCard === 'Many' || relationType === 'OneToOne' ? pending.source : pending.target;
  const refTableName = fkTableName === pending.source ? pending.target : pending.source;

  const fkTable = tables.find((t) => t.name === fkTableName);

  // Existing _id columns in FK table
  const existingIdColumns = useMemo(
    () => (fkTable ? fkTable.columns.filter((c) => c.name.endsWith('_id')).map((c) => c.name) : []),
    [fkTable],
  );

  const suggestedColumn = `${refTableName}_id`;

  // Reset joinColumn when FK table changes (React-recommended setState-during-render pattern)
  const [prevFkTableName, setPrevFkTableName] = useState(fkTableName);
  if (prevFkTableName !== fkTableName) {
    setPrevFkTableName(fkTableName);
    if (existingIdColumns.includes(suggestedColumn)) {
      setJoinColumn(suggestedColumn);
    } else {
      setJoinColumn(CREATE_NEW);
    }
  }

  const resolvedJoinColumn = joinColumn === CREATE_NEW ? suggestedColumn : joinColumn;

  const handleOk = () => {
    if (!relationType) return;
    onConfirm({ relationType, joinColumn: resolvedJoinColumn, fkTableName });
  };

  const selectOptions = [
    ...existingIdColumns.map((col) => ({ label: col, value: col })),
    ...(existingIdColumns.includes(suggestedColumn)
      ? []
      : [{ label: t('connectionModal.createNew', { column: suggestedColumn }), value: CREATE_NEW }]),
  ];

  return (
    <Modal
      title={t('connectionModal.title')}
      open
      onOk={handleOk}
      onCancel={onCancel}
      okText={t('connectionModal.create')}
      okButtonProps={{ disabled: isManyToMany || !resolvedJoinColumn }}
      width={480}
    >
      {/* Source / Target labels */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Text strong style={{ flex: 1, textAlign: 'center' }}>{pending.source}</Text>
        <Text type="secondary">→</Text>
        <Text strong style={{ flex: 1, textAlign: 'center' }}>{pending.target}</Text>
      </div>

      {/* Cardinality */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('connectionModal.side', { table: pending.source })}
          </Text>
          <Segmented
            block
            options={['One', 'Many']}
            value={sourceCard}
            onChange={(v) => setSourceCard(v as Cardinality)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('connectionModal.side', { table: pending.target })}
          </Text>
          <Segmented
            block
            options={['One', 'Many']}
            value={targetCard}
            onChange={(v) => setTargetCard(v as Cardinality)}
          />
        </div>
      </div>

      <div
        style={{
          padding: '8px 12px',
          background: '#f6f6f6',
          borderRadius: 6,
          marginBottom: 16,
          fontSize: 13,
          textAlign: 'center',
        }}
      >
        <Text type="secondary">{pending.source}</Text>{' '}
        <Text strong>{sourceCard}</Text>
        <Text type="secondary"> {t('connectionModal.toSeparator')} </Text>
        <Text strong>{targetCard}</Text>{' '}
        <Text type="secondary">{pending.target}</Text>
      </div>

      {isManyToMany && (
        <Alert
          type="warning"
          message={t('connectionModal.manyToManyWarning')}
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* FK info */}
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('connectionModal.fkColumnIn')} <Text code style={{ fontSize: 12 }}>{fkTableName}</Text>
          {' '}{t('connectionModal.referencesArrow')}{' '}
          <Text code style={{ fontSize: 12 }}>{refTableName}</Text>
        </Text>
      </div>

      <Select
        style={{ width: '100%' }}
        value={joinColumn}
        onChange={setJoinColumn}
        options={selectOptions}
        placeholder={t('connectionModal.selectJoinColumn')}
      />

      {joinColumn === CREATE_NEW && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          <Trans
            i18nKey="connectionModal.newColumnNotice"
            values={{ column: suggestedColumn, table: fkTableName }}
            components={{ code: <Text code style={{ fontSize: 11 }} /> }}
          />
        </Text>
      )}
    </Modal>
  );
}
