import { Modal, Button, Space, message, Typography } from 'antd';
import { CopyOutlined, DownloadOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface Props {
  open: boolean;
  ddl: string;
  tableCount: number;
  onClose: () => void;
}

export default function DdlPreview({ open, ddl, tableCount, onClose }: Props) {
  const { t } = useTranslation();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ddl);
    message.success(t('ddlPreview.copied'));
  };

  const handleDownload = () => {
    const blob = new Blob([ddl], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DatabaseOutlined style={{ color: '#1677ff' }} />
          <span>{t('ddlPreview.title')}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={680}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('ddlPreview.tables', { count: tableCount })}
          </Text>
          <Space>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              {t('ddlPreview.copy')}
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              {t('ddlPreview.download')}
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
        {ddl || t('ddlPreview.noTables')}
      </pre>
    </Modal>
  );
}
