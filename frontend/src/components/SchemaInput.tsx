import { useState } from 'react';
import { Input, Button, Alert, Typography, Card } from 'antd';
import {
  UploadOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  ApiOutlined,
  FileTextOutlined,
  PlusSquareOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { TableSchema } from '../types/tableSchema';
import type { AggregateConfig } from '../types/aggregateConfig';
import { parseTableSchema } from '../utils/schemaParser';
import LanguageSwitcher from './LanguageSwitcher';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface Props {
  onLoad: (schema: TableSchema) => void;
  onLoadConfig: (config: AggregateConfig) => void;
}

export default function SchemaInput({ onLoad, onLoadConfig }: Props) {
  const { t } = useTranslation();
  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  const features = [
    {
      icon: <NodeIndexOutlined style={{ fontSize: 24, color: '#1677ff' }} />,
      title: t('schemaInput.featureVisualTitle'),
      desc: t('schemaInput.featureVisualDesc'),
    },
    {
      icon: <ApiOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      title: t('schemaInput.featureRelationTitle'),
      desc: t('schemaInput.featureRelationDesc'),
    },
    {
      icon: <FileTextOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      title: t('schemaInput.featureExportTitle'),
      desc: t('schemaInput.featureExportDesc'),
    },
  ];

  const handleLoad = () => {
    setError(null);
    try {
      const parsed = JSON.parse(json);

      if (parsed && Array.isArray(parsed.aggregates)) {
        // AggregateConfig format
        for (let i = 0; i < parsed.aggregates.length; i++) {
          if (!parsed.aggregates[i].root) {
            throw new Error(t('schemaInput.aggregateRootRequired', { index: i }));
          }
        }
        onLoadConfig(parsed as AggregateConfig);
      } else if (parsed && Array.isArray(parsed.tables)) {
        // TableSchema format
        const schema = parseTableSchema(json);
        onLoad(schema);
      } else {
        throw new Error(t('schemaInput.unrecognizedFormat'));
      }
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError(t('schemaInput.invalidJson', { message: e.message }));
      } else {
        setError(e instanceof Error ? e.message : t('schemaInput.failedToParse'));
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'linear-gradient(180deg, #f0f2f5 0%, #e6f4ff 100%)',
        position: 'relative',
      }}
    >
      {/* Language Switcher */}
      <div style={{ position: 'absolute', top: 16, right: 24 }}>
        <LanguageSwitcher />
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1677ff, #4096ff)',
            marginBottom: 20,
            boxShadow: '0 4px 16px rgba(22, 119, 255, 0.3)',
          }}
        >
          <AppstoreOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <Title level={2} style={{ margin: '0 0 8px', fontWeight: 700 }}>
          {t('schemaInput.title')}
        </Title>
        <Paragraph
          style={{
            color: 'rgba(0,0,0,0.45)',
            fontSize: 16,
            maxWidth: 480,
            margin: '0 auto',
          }}
        >
          {t('schemaInput.description')}
        </Paragraph>
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 32,
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 720,
        }}
      >
        {features.map((f) => (
          <Card
            key={f.title}
            size="small"
            style={{
              width: 220,
              borderRadius: 10,
              border: '1px solid #f0f0f0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
            styles={{ body: { padding: '16px' } }}
          >
            <div style={{ marginBottom: 8 }}>{f.icon}</div>
            <Text strong style={{ fontSize: 13 }}>
              {f.title}
            </Text>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginTop: 4, lineHeight: 1.5 }}>
              {f.desc}
            </div>
          </Card>
        ))}
      </div>

      {/* Input area */}
      <Card
        style={{
          width: '100%',
          maxWidth: 720,
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
        styles={{ body: { padding: '24px' } }}
      >
        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
          {t('schemaInput.jsonInput')}
        </Text>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 12 }}
          />
        )}

        <TextArea
          rows={14}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          placeholder={t('schemaInput.placeholder')}
          style={{
            fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
            fontSize: 13,
            borderRadius: 8,
            background: '#fafafa',
          }}
        />

        <Button
          type="primary"
          icon={<UploadOutlined />}
          size="large"
          onClick={handleLoad}
          disabled={!json.trim()}
          style={{ marginTop: 16, width: '100%', height: 44, fontWeight: 600 }}
        >
          {t('schemaInput.loadJson')}
        </Button>

        <Button
          icon={<PlusSquareOutlined />}
          size="large"
          onClick={() => onLoad({ tables: [] })}
          style={{ marginTop: 8, width: '100%', height: 44, fontWeight: 600 }}
        >
          {t('schemaInput.emptyCanvas')}
        </Button>
      </Card>

      {/* Footer */}
      <Text type="secondary" style={{ marginTop: 32, fontSize: 12 }}>
        {t('schemaInput.footer')}
      </Text>
    </div>
  );
}
