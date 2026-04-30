/**
 * EcoSynTech Type Definitions
 * 
 * Phase 1: Core API types for type safety
 * Use JSDoc annotations in existing JS files: @param {string} name
 */

// ============================================================
// Common Types
// ============================================================

/** @typedef {Object} ApiResponse
 * @property {boolean} ok
 * @property {string|null} error
 * @property {any} [data]
 */

/** @typedef {Object} Pagination
 * @property {number} page
 * @property {number} limit
 * @property {number} total
 */

// ============================================================
// Dashboard API Types
// ============================================================

/** @typedef {Object} FinanceSummary
 * @property {number} totalIncome
 * @property {number} totalExpense
 * @property {number} netProfit
 * @property {string} period
 */

/** @typedef {Object} FinanceKPIs
 * @property {Object} thisMonth
 * @property {Object} lastMonth
 * @property {Object} budget
 * @property {Object} trend
 */

/** @typedef {Object} InventoryStats
 * @property {number} totalItems
 * @property {number} totalValue
 * @property {Object} categories
 */

/** @typedef {Object} EquipmentStats
 * @property {number} total
 * @property {Object} byStatus
 * @property {number} categories
 * @property {number} totalMaintenanceCost
 */

/** @typedef {Object} LaborStats
 * @property {number} totalWorkers
 * @property {number} activeWorkers
 * @property {number} totalTasks
 * @property {number} pendingTasks
 */

/** @typedef {Object} CropStats
 * @property {number} totalPlantings
 * @property {number} active
 * @property {number} harvest
 */

/** @typedef {Object} WeatherData
 * @property {Object} current
 * @property {Array} forecast
 * @property {Array} alerts
 */

/** @typedef {Object} SalesStats
 * @property {number} totalOrders
 * @property {number} totalRevenue
 * @property {number} avgOrderValue
 * @property {number} completedOrders
 */

/** @typedef {Object} PaymentStats
 * @property {number} totalTransactions
 * @property {number} totalReceived
 * @property {number} totalPending
 * @property {number} totalFailed
 */

// ============================================================
// Auth Types
// ============================================================

/** @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string} role
 */

/** @typedef {Object} AuthToken
 * @property {string} token
 * @property {number} expiresIn
 * @property {User} user
 */

// ============================================================
// IoT Types
// ============================================================

/** @typedef {Object} SensorData
 * @property {string} id
 * @property {string} type
 * @property {number} value
 * @property {string} unit
 * @property {string} timestamp
 */

/** @typedef {Object} Device
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} status
 * @property {string} [farm_id]
 */

// ============================================================
// Export for use in JS files via JSDoc
// ============================================================

module.exports = {
  ApiResponse: /** @type {import('./api').ApiResponse} */ ({}),
  FinanceSummary: /** @type {import('./api').FinanceSummary} */ ({}),
  InventoryStats: /** @type {import('./api').InventoryStats} */ ({}),
  SensorData: /** @type {import('./api').SensorData} */ ({}),
};