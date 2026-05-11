import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['navigator', 'htmlTag', 'path'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language',
    },
  });

export default i18n;