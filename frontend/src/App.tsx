import { useState, Suspense } from 'react';
import { ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import enUS from 'antd/locale/en_US';
import koKR from 'antd/locale/ko_KR';
import type { TableSchema } from './types/tableSchema';
import type { AggregateConfig } from './types/aggregateConfig';
import type { InitialOverrides } from './utils/configImporter';
import { importAggregateConfig } from './utils/configImporter';
import SchemaInput from './components/SchemaInput';
import AggregateDesigner from './components/AggregateDesigner';
import './i18n';

const ANT_LOCALES: Record<string, typeof enUS> = {
  en: enUS,
  ko: koKR,
};

interface DesignerInput {
  schema: TableSchema;
  overrides?: InitialOverrides;
}

export default function App() {
  const { i18n } = useTranslation();
  const [designerInput, setDesignerInput] = useState<DesignerInput | null>(null);

  const handleLoadSchema = (schema: TableSchema) => {
    setDesignerInput({ schema });
  };

  const handleLoadConfig = (config: AggregateConfig) => {
    const { schema, overrides } = importAggregateConfig(config);
    setDesignerInput({ schema, overrides });
  };

  const lang = i18n.language?.startsWith('ko') ? 'ko' : 'en';

  return (
    <Suspense fallback={null}>
      <ConfigProvider
        locale={ANT_LOCALES[lang] ?? enUS}
        theme={{
          token: {
            borderRadius: 6,
            colorPrimary: '#1677ff',
            colorBgContainer: '#ffffff',
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          },
          components: {
            Button: {
              borderRadius: 6,
            },
            Select: {
              borderRadius: 6,
            },
            Input: {
              borderRadius: 6,
            },
          },
        }}
      >
        {designerInput ? (
          <AggregateDesigner
            schema={designerInput.schema}
            overrides={designerInput.overrides}
            onBack={() => setDesignerInput(null)}
          />
        ) : (
          <SchemaInput onLoad={handleLoadSchema} onLoadConfig={handleLoadConfig} />
        )}
      </ConfigProvider>
    </Suspense>
  );
}
