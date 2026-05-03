import * as fs from 'fs';
import * as path from 'path';

export interface LanguageConfig {
  name: string;
  native: string;
  code: string;
}

export interface TranslationParams {
  [key: string]: string | number;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  'vi': { name: 'Tiếng Việt', native: 'Tiếng Việt', code: 'vi' },
  'en': { name: 'English', native: 'English', code: 'en' },
  'zh': { name: '中文', native: 'Chinese', code: 'zh' }
};

export const DEFAULT_LANGUAGE = 'vi';

import translationCache: Record<string, Record<string, string>> = {};
let currentLanguage = DEFAULT_LANGUAGE;

export function setLanguage(lang: string): boolean {
  if (SUPPORTED_LANGUAGES[lang]) {
    currentLanguage = lang;
    return true;
  }
  return false;
}

export function getLanguage(): string {
  return currentLanguage;
}

export function getSupportedLanguages(): Record<string, LanguageConfig> {
  return SUPPORTED_LANGUAGES;
}

export function t(key: string, params?: TranslationParams): string {
  const lang = currentLanguage;
  let translations = translationCache[lang] || {};
  let text = translations[key] || key;

  if (!text || text === key) {
    if (lang !== DEFAULT_LANGUAGE) {
      translations = translationCache[DEFAULT_LANGUAGE] || {};
      text = translations[key] || key;
    }
  }

  if (params) {
    for (const p in params) {
      text = text.replace(new RegExp('\\{' + p + '\\}', 'g'), String(params[p]));
    }
  }

  return text;
}

export function tArray(key: string, count: number): string {
  if (count === 1) {
    return t(key + '.one', {});
  } else if (count >= 2 && count <= 4) {
    return t(key + '.few', { count: count } as TranslationParams);
  } else {
    return t(key + '.many', { count: count } as TranslationParams);
  }
}

export function loadTranslations(lang: string, dir?: string): boolean {
  if (!dir) {
    dir = path.join(process.cwd(), 'src', 'i18n');
  }

  const filePath = path.join(dir, lang + '.json');
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      translationCache[lang] = JSON.parse(content);
      return true;
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[i18n] Failed to load ' + lang + ':', errorMessage);
  }
  return false;
}

export function loadAllTranslations(): void {
  for (const lang in SUPPORTED_LANGUAGES) {
    loadTranslations(lang);
  }
}

export function detectLanguage(acceptHeader?: string): string {
  if (!acceptHeader) return DEFAULT_LANGUAGE;

  const langs = acceptHeader.split(',');
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i].split(';')[0].trim().toLowerCase();
    if (lang.indexOf('vi') !== -1) return 'vi';
    if (lang.indexOf('en') !== -1) return 'en';
    if (lang.indexOf('zh') !== -1 || lang.indexOf('cn') !== -1) return 'zh';
  }

  return DEFAULT_LANGUAGE;
}

export default {
  setLanguage,
  getLanguage,
  getSupportedLanguages,
  t,
  tArray,
  loadTranslations,
  loadAllTranslations,
  detectLanguage,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES
};