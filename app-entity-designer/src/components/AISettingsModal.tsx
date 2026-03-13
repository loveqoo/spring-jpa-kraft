import { useState, useEffect } from 'react';
import { Modal, Input, Button, Alert, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { getAISettings, saveAISettings, clearAISettings } from '../ai/aiClient';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AISettingsModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      const settings = getAISettings();
      if (settings) {
        setBaseUrl(settings.baseUrl);
        setApiKey(settings.apiKey);
        setModel(settings.model);
      } else {
        setBaseUrl('https://api.openai.com/v1');
        setApiKey('');
        setModel('gpt-4o');
      }
      setTestResult(null);
    }
  }, [open]);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const url = `${baseUrl.replace(/\/+$/, '')}/models`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${res.status} ${body.slice(0, 100)}`);
      }
      setTestResult({ ok: true, message: t('ai.testSuccess') });
    } catch (e) {
      const msg = (e as Error).name === 'TimeoutError'
        ? 'Connection timed out (10s)'
        : (e as Error).message;
      setTestResult({ ok: false, message: t('ai.testFailed', { message: msg }) });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    saveAISettings({ apiKey, baseUrl, model });
    onClose();
  };

  const handleClear = () => {
    clearAISettings();
    setApiKey('');
    setBaseUrl('https://api.openai.com/v1');
    setModel('gpt-4o');
    setTestResult(null);
  };

  const canSave = apiKey.trim() && baseUrl.trim() && model.trim();

  return (
    <Modal
      title={t('ai.settingsTitle')}
      open={open}
      onCancel={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handleClear}>{t('ai.clear')}</Button>
          <Space>
            <Button onClick={onClose}>{t('tableEditor.cancel')}</Button>
            <Button type="primary" onClick={handleSave} disabled={!canSave}>
              {t('ai.save')}
            </Button>
          </Space>
        </div>
      }
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('ai.baseUrl')}
          </Text>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={t('ai.baseUrlPlaceholder')}
          />
          <Text type="secondary" style={{ fontSize: 11, marginTop: 2 }}>
            {t('ai.baseUrlHelp')}
          </Text>
        </div>

        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('ai.apiKey')}
          </Text>
          <Input.Password
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>

        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
            {t('ai.model')}
          </Text>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={t('ai.modelPlaceholder')}
          />
        </div>

        <Button
          onClick={handleTest}
          loading={testing}
          disabled={!canSave}
        >
          {t('ai.testConnection')}
        </Button>

        {testResult && (
          <Alert
            type={testResult.ok ? 'success' : 'error'}
            message={testResult.message}
            showIcon
          />
        )}
      </div>
    </Modal>
  );
}
