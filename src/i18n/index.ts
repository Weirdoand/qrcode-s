import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import zh from './locales/zh';
import ja from './locales/ja';
import ko from './locales/ko';
import vi from './locales/vi';
import de from './locales/de';
import fr from './locales/fr';

export const SUPPORTED_LANGUAGES = ['en', 'zh', 'ja', 'ko', 'vi', 'de', 'fr'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  vi: 'Tiếng Việt',
  de: 'Deutsch',
  fr: 'Français',
};

const resources = { en, zh, ja, ko, vi, de, fr };

function getInitialLanguage(): string {
  // Check localStorage first, then browser language
  try {
    const stored = localStorage.getItem('i18nextLng');
    if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
      return stored;
    }
  } catch {}
  const browserLang = navigator.language.split('-')[0];
  if (SUPPORTED_LANGUAGES.includes(browserLang as SupportedLanguage)) {
    return browserLang;
  }
  return 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;