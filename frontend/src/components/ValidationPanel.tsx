import { Badge, Typography } from 'antd';
import {
  CloseCircleFilled,
  WarningFilled,
  CheckCircleFilled,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ValidationError } from '../utils/schemaValidator';

const { Text } = Typography;

interface Props {
  errors: ValidationError[];
  onSelectTable: (tableId: string) => void;
  onSelectEdge: (edgeId: string) => void;
}

export default function ValidationPanel({ errors, onSelectTable, onSelectEdge }: Props) {
  const { t } = useTranslation();

  if (errors.length === 0) return null;

  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  const handleClick = (err: ValidationError) => {
    if (!err.target) return;
    if (err.target.type === 'table') onSelectTable(err.target.id);
    else onSelectEdge(err.target.id);
  };

  return (
    <div
      style={{
        borderTop: '1px solid #e8e8e8',
        background: '#fffbe6',
        maxHeight: 160,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '6px 16px',
          borderBottom: '1px solid #f0e8c0',
          background: errorCount > 0 ? '#fff1f0' : '#fffbe6',
        }}
      >
        <Text strong style={{ fontSize: 12 }}>{t('validation.title')}</Text>
        {errorCount > 0 && (
          <Badge count={errorCount} size="small" color="#ff4d4f" />
        )}
        {warningCount > 0 && (
          <Badge count={warningCount} size="small" color="#faad14" />
        )}
        {errorCount === 0 && warningCount === 0 && (
          <CheckCircleFilled style={{ color: '#52c41a', fontSize: 14 }} />
        )}
      </div>

      {/* Items */}
      {errors.map((err, i) => (
        <div
          key={i}
          onClick={() => handleClick(err)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 16px',
            cursor: err.target ? 'pointer' : 'default',
            fontSize: 12,
            borderBottom: '1px solid #f5f0d0',
          }}
          onMouseEnter={(e) => {
            if (err.target) (e.currentTarget.style.background = '#f0f0f0');
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {err.severity === 'error' ? (
            <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 13, flexShrink: 0 }} />
          ) : (
            <WarningFilled style={{ color: '#faad14', fontSize: 13, flexShrink: 0 }} />
          )}
          <Text style={{ fontSize: 12 }}>{t(err.messageKey, err.messageParams)}</Text>
        </div>
      ))}
    </div>
  );
}
