/**
 * @fileoverview i18n Middleware for API responses
 * @description Translate API responses based on Accept-Language header
 * @module middleware/i18n
 * @requires i18n
 */

const i18n = require('../i18n');

/**
 * i18n middleware for Express
 * Reads Accept-Language header and sets language
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function i18nMiddleware(req, res, next) {
  const lang = req.headers['accept-language'] || 'vi';
  const supportedLangs = ['vi', 'en', 'zh'];
  
  const shortLang = lang.split(',')[0].split('-')[0].toLowerCase();
  const validLang = supportedLangs.includes(shortLang) ? shortLang : 'vi';
  
  i18n.setLanguage(validLang);
  req.language = validLang;
  req.t = i18n.t.bind(i18n);
  
  next();
}

/**
 * Helper to get translated response
 * @param {Object} res - Express response object
 * @param {string} key - Translation key
 * @param {Object} params - Parameters for interpolation
 * @param {number} status - HTTP status code
 * @returns {Object} JSON response
 */
function translatedResponse(res, key, params = {}, status = 200) {
  const text = i18n.t(key, params);
  return res.status(status).json({ 
    message: text,
    key,
    language: i18n.getLanguage()
  });
}

module.exports = {
  i18nMiddleware,
  translatedResponse,
  setLanguage: i18n.setLanguage,
  getLanguage: i18n.getLanguage,
  t: i18n.t
};