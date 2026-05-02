import { Response, NextFunction } from 'express';

const i18nModule = require('../i18n');

export type TranslateFunction = (key: string, params?: Record<string, any>) => string;

export function i18nMiddleware(req: any, res: any, next: NextFunction): void {
  const langHeader = req.headers['accept-language'];
  const supportedLangs = ['vi', 'en', 'zh'];
  
  const langStr = langHeader ? String(langHeader) : 'vi';
  const parts = langStr.split(',');
  const firstPart = parts[0] || 'vi';
  const shortLang = firstPart.split('-')[0]?.toLowerCase() || 'vi';
  const validLang = supportedLangs.includes(shortLang) ? shortLang : 'vi';
  
  i18nModule.setLanguage(validLang);
  req.language = validLang;
  req.t = i18nModule.t.bind(i18nModule);
  
  next();
}

export function translatedResponse(res: any, key: string, params: Record<string, any> = {}, status: number = 200): void {
  const text = i18nModule.t(key, params);
  res.status(status).json({ 
    message: text,
    key,
    language: i18nModule.getLanguage()
  });
}

export default {
  i18nMiddleware,
  translatedResponse,
  setLanguage: i18nModule.setLanguage,
  getLanguage: i18nModule.getLanguage,
  t: i18nModule.t
};