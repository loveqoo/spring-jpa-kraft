import { Segmented } from 'antd';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('ko') ? 'ko' : 'en';

  return (
    <Segmented
      size="small"
      options={[
        { label: 'EN', value: 'en' },
        { label: '한국어', value: 'ko' },
      ]}
      value={lang}
      onChange={(v) => i18n.changeLanguage(v as string)}
    />
  );
}
