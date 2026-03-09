import { useState } from 'react';
import { Input, Button, Alert, Select } from 'antd';
import { SendOutlined, StopOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { TextArea } = Input;

interface Props {
  onSubmit: (prompt: string, targetTables: string[]) => void;
  loading: boolean;
  error?: string | null;
  onAbort?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Available table names for the target selector */
  tableNames?: string[];
}

export default function AIPromptInput({ onSubmit, loading, error, onAbort, placeholder, disabled, tableNames = [] }: Props) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);

  const handleSubmit = () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading || disabled) return;
    onSubmit(trimmed, selectedTables);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {error && (
        <Alert type="error" message={error} showIcon closable style={{ fontSize: 12 }} />
      )}
      {tableNames.length > 0 && (
        <Select
          mode="multiple"
          size="small"
          placeholder={t('ai.selectTables')}
          value={selectedTables}
          onChange={setSelectedTables}
          options={tableNames.map((n) => ({ label: n, value: n }))}
          style={{ width: '100%' }}
          allowClear
          maxTagCount="responsive"
        />
      )}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t('ai.promptPlaceholder')}
          autoSize={{ minRows: 2, maxRows: 5 }}
          disabled={loading || disabled}
          style={{ fontSize: 13 }}
        />
        {loading ? (
          <Button
            icon={<StopOutlined />}
            onClick={onAbort}
            style={{ flexShrink: 0, height: 40 }}
          />
        ) : (
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            disabled={!prompt.trim() || disabled}
            style={{ flexShrink: 0, height: 40 }}
          />
        )}
      </div>
    </div>
  );
}
