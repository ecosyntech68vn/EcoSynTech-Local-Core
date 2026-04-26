// Middleware to assign a unique Request ID for traceability
const crypto = require('crypto')

module.exports = function requestIdMiddleware(req, res, next) {
  let id
  try {
    if (typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID()
    } else {
      // Fallback for environments without randomUUID
      id = Date.now().toString(16) + '-' + Math.random().toString(16).slice(2)
    }
  } catch (e) {
    id = Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
  }
  req.id = id
  res.setHeader('X-Request-Id', id)
  next()
}
