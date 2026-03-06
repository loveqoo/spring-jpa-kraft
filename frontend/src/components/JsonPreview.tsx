import { Modal, Button, Space, message, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { AggregateConfig } from '../types/aggregateConfig';

const { Text } = Typography;

interface Props {
  open: boolean;
  config: AggregateConfig | null;
  onClose: () => void;
}

export default function JsonPreview({ open, config, onClose }: Props) {
  const { t } = useTranslation();
  const jsonText = config ? JSON.stringify(config, null, 2) : '';
  const aggregateCount = config?.aggregates?.length ?? 0;
  const entityCount =
    config?.aggregates?.reduce((sum, a) => sum + 1 + (a.entities?.length ?? 0), 0) ?? 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonText);
    message.success(t('jsonPreview.copied'));
  };

  const handleDownload = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aggregate-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>{t('jsonPreview.title')}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={680}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('jsonPreview.aggregates', { count: aggregateCount })} &middot; {t('jsonPreview.entities', { count: entityCount })}
          </Text>
          <Space>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              {t('jsonPreview.copy')}
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              {t('jsonPreview.download')}
            </Button>
          </Space>
        </div>
      }
    >
      <pre
        style={{
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: 20,
          borderRadius: 8,
          maxHeight: 480,
          overflow: 'auto',
          fontSize: 13,
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          lineHeight: 1.6,
        }}
      >
        {jsonText}
      </pre>
    </Modal>
  );
}
