import { useState, useRef } from 'react';
import { Modal, Input, Typography, Alert } from 'antd';
import type { InputRef } from 'antd';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface Props {
  open: boolean;
  existingNames: string[];
  onSubmit: (tableName: string) => void;
  onCancel: () => void;
}

export default function AddTableModal({ open, existingNames, onSubmit, onCancel }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<InputRef>(null);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open && !prevOpen) {
    setPrevOpen(true);
    setName('');
    setError(null);
  }
  if (!open && prevOpen) {
    setPrevOpen(false);
  }

  const handleOk = () => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) {
      setError(t('addTable.nameRequired'));
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(trimmed)) {
      setError(t('addTable.invalidFormat'));
      return;
    }
    if (existingNames.includes(trimmed)) {
      setError(t('addTable.alreadyExists', { name: trimmed }));
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Modal title={t('addTable.title')} open={open} onOk={handleOk} onCancel={onCancel} okText={t('addTable.create')} afterOpenChange={(visible) => { if (visible) inputRef.current?.focus(); }}>
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {t('addTable.defaultColumnHint').split('<code>')[0]}<Text code style={{ fontSize: 12 }}>id BIGINT PK AUTO_INCREMENT</Text>{t('addTable.defaultColumnHint').split('</code>')[1]}
        </Text>
      </div>
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
      <Input
        ref={inputRef}
        placeholder={t('addTable.placeholder')}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onPressEnter={handleOk}
      />
    </Modal>
  );
}
