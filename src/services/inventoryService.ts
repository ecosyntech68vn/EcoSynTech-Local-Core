/**
 * Inventory Service - Quản lý kho vật liệu nông nghiệp
 * V5.1.0 - Converted to TypeScript - Phase 1
 * 
 * Features:
 * - Quản lý kho vật tư (hạt giống, phân bón, thuốc, thức ăn)
 * - Theo dõi tồn kho theo lô
 * - Nhập/xuất kho với transaction history
 * - Cảnh báo tồn kho thấp
 * - Tích hợp với farm activities để trừ khi sử dụng
 * - Traceability vật tư: dùng lô nào cho vụ nào
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import alertService from './alertService';
import db from '../config/database';

export interface InventoryCategory {
  label: string;
  icon: string;
  unit: string;
}

export interface TransactionType {
  label: string;
  icon: string;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  farm_id?: string;
  category: string;
  current_stock: number;
  unit: string;
  cost_per_unit?: number;
  min_stock_level?: number;
  supplier?: string;
  expiry_date?: string;
  lot_number?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
}

export interface CreateItemData {
  item_name: string;
  farm_id?: string;
  category?: string;
  current_stock?: number;
  unit?: string;
  cost_per_unit?: number;
  min_stock_level?: number;
  supplier?: string;
  expiry_date?: string;
  lot_number?: string;
}

export interface TransactionData {
  item_id: string;
  transaction_type: string;
  quantity: number;
  unit_cost?: number;
  reference?: string;
  notes?: string;
  performed_by?: string;
}

export const INVENTORY_CATEGORIES: Record<string, InventoryCategory> = {
  seeds: { label: 'Hạt giống', icon: '🌱', unit: 'kg' },
  fertilizer: { label: 'Phân bón', icon: '🌿', unit: 'kg' },
  pesticide: { label: 'Thuốc BVTV', icon: '💧', unit: 'lit' },
  herbicide: { label: 'Thuốc cỏ', icon: '🌾', unit: 'lit' },
  fungicide: { label: 'Thuốc trừ nấm', icon: '🍄', unit: 'lit' },
  feed: { label: 'Thức ăn chăn nuôi', icon: '🐄', unit: 'kg' },
  veterinary: { label: 'Thuốc thú y', icon: '💉', unit: 'lit' },
  other: { label: 'Vật tư khác', icon: '📦', unit: 'pcs' }
};

export const TRANSACTION_TYPES: Record<string, TransactionType> = {
  import: { label: 'Nhập kho', icon: '📥' },
  export: { label: 'Xuất kho', icon: '📤' },
  adjustment: { label: 'Điều chỉnh', icon: '🔄' },
  return: { label: 'Trả lại', icon: '↩️' },
  discard: { label: 'Hủy bỏ', icon: '🗑️' }
};

export function createItem(data: CreateItemData): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  const category = data.category || 'other';
  const categoryInfo = INVENTORY_CATEGORIES[category] || INVENTORY_CATEGORIES.other!;

  db.run(`
    INSERT INTO inventory_items (
      id, item_name, farm_id, category, current_stock, unit,
      cost_per_unit, min_stock_level, supplier, expiry_date, lot_number,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.item_name,
    data.farm_id || null,
    category,
    data.current_stock || 0,
    data.unit || categoryInfo.unit,
    data.cost_per_unit || null,
    data.min_stock_level || 10,
    data.supplier || null,
    data.expiry_date || null,
    data.lot_number || null,
    now,
    now
  ]);

  logger.info(`Tạo vật tư mới: ${data.item_name} (${id})`);
  return id;
}

export function getItem(itemId: string): InventoryItem | null {
  return db.get('SELECT * FROM inventory_items WHERE id = ?', [itemId]) as InventoryItem | null;
}

export function getItemsByFarm(farmId: string): InventoryItem[] {
  return db.all('SELECT * FROM inventory_items WHERE farm_id = ? ORDER BY category, item_name', [farmId]) as InventoryItem[];
}

export function getItemsByCategory(farmId: string, category: string): InventoryItem[] {
  return db.all('SELECT * FROM inventory_items WHERE farm_id = ? AND category = ? ORDER BY item_name', [farmId, category]) as InventoryItem[];
}

export function updateItem(itemId: string, data: Partial<CreateItemData>): boolean {
  try {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.item_name !== undefined) { updates.push('item_name = ?'); values.push(data.item_name); }
    if (data.category !== undefined) { updates.push('category = ?'); values.push(data.category); }
    if (data.current_stock !== undefined) { updates.push('current_stock = ?'); values.push(data.current_stock); }
    if (data.unit !== undefined) { updates.push('unit = ?'); values.push(data.unit); }
    if (data.cost_per_unit !== undefined) { updates.push('cost_per_unit = ?'); values.push(data.cost_per_unit); }
    if (data.min_stock_level !== undefined) { updates.push('min_stock_level = ?'); values.push(data.min_stock_level); }
    if (data.supplier !== undefined) { updates.push('supplier = ?'); values.push(data.supplier); }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(itemId);

    db.run(`UPDATE inventory_items SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error: any) {
    logger.error('Update item error:', error.message);
    return false;
  }
}

export function deleteItem(itemId: string): boolean {
  try {
    db.run('DELETE FROM inventory_transactions WHERE item_id = ?', [itemId]);
    db.run('DELETE FROM inventory_items WHERE id = ?', [itemId]);
    return true;
  } catch (error: any) {
    logger.error('Delete item error:', error.message);
    return false;
  }
}

export function recordTransaction(data: TransactionData): string {
  const id = uuidv4();
  const now = new Date().toISOString();
  const totalCost = data.unit_cost ? data.quantity * data.unit_cost : undefined;

  db.run(`
    INSERT INTO inventory_transactions (
      id, item_id, transaction_type, quantity, unit_cost, total_cost,
      reference, notes, performed_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.item_id,
    data.transaction_type,
    data.quantity,
    data.unit_cost || null,
    totalCost || null,
    data.reference || null,
    data.notes || null,
    data.performed_by || null,
    now
  ]);

  const item = getItem(data.item_id);
  if (item) {
    let newStock = item.current_stock;
    switch (data.transaction_type) {
      case 'import':
        newStock += data.quantity;
        break;
      case 'export':
      case 'discard':
        newStock -= data.quantity;
        break;
      case 'adjustment':
        newStock = data.quantity;
        break;
      case 'return':
        newStock += data.quantity;
        break;
    }
    updateItem(data.item_id, { current_stock: newStock });

    if (newStock < (item.min_stock_level || 10)) {
      alertService.sendAlert(`Cảnh báo tồn kho: ${item.item_name} chỉ còn ${newStock}`, {
        type: 'DATA_QUALITY',
        severity: 'warning'
      });
    }
  }

  logger.info(`Ghi nhận giao dịch: ${data.transaction_type} - ${data.quantity} cho item ${data.item_id}`);
  return id;
}

export function getTransactions(itemId: string): InventoryTransaction[] {
  return db.all('SELECT * FROM inventory_transactions WHERE item_id = ? ORDER BY created_at DESC', [itemId]) as InventoryTransaction[];
}

export function getLowStockItems(farmId: string): InventoryItem[] {
  return db.all(`
    SELECT * FROM inventory_items 
    WHERE farm_id = ? AND current_stock <= min_stock_level 
    ORDER BY current_stock ASC
  `, [farmId]) as InventoryItem[];
}

export function getInventorySummary(farmId: string): {
  totalItems: number;
  totalValue: number;
  byCategory: Record<string, { count: number; value: number }>;
  lowStock: number;
} {
  const items = getItemsByFarm(farmId);
  
  const byCategory: Record<string, { count: number; value: number }> = {};
  let totalValue = 0;
  let lowStock = 0;

  for (const item of items) {
    const category = item.category || 'other';
    if (!byCategory[category]) {
      byCategory[category] = { count: 0, value: 0 };
    }
    byCategory[category].count++;
    const value = (item.current_stock || 0) * (item.cost_per_unit || 0);
    byCategory[category].value += value;
    totalValue += value;
    
    if ((item.current_stock || 0) <= (item.min_stock_level || 10)) {
      lowStock++;
    }
  }

  return {
    totalItems: items.length,
    totalValue,
    byCategory,
    lowStock
  };
}

export function adjustStock(itemId: string, newStock: number, reason: string, performedBy?: string): boolean {
  const result = recordTransaction({
    item_id: itemId,
    transaction_type: 'adjustment',
    quantity: newStock,
    notes: reason,
    performed_by: performedBy
  });
  return !!result;
}

export default {
  createItem,
  getItem,
  getItemsByFarm,
  getItemsByCategory,
  updateItem,
  deleteItem,
  recordTransaction,
  getTransactions,
  getLowStockItems,
  getInventorySummary,
  adjustStock
};