/**
 * Order Service
 * Manages e-commerce orders
 * Converted to TypeScript - Phase 1
 */

import crypto from 'crypto';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  paymentMethod: string;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface CreateOrderData {
  userId: string;
  items: OrderItem[];
  paymentMethod: string;
  total: number;
}

export interface UpdateOrderData {
  status?: OrderStatus;
  paymentMethod?: string;
  notes?: string;
}

export class OrderServiceClass {
  private orders: Map<string, Order>;
  private sequence: number;

  constructor() {
    this.orders = new Map();
    this.sequence = 0;
  }

  generateOrderId(): string {
    this.sequence++;
    const seq = String(this.sequence).padStart(6, '0');
    const timestamp = Date.now().toString(36).toUpperCase();
    return `ORD-${timestamp.slice(-6)}${seq}`;
  }

  createOrder(data: CreateOrderData): Order {
    const orderId = this.generateOrderId();
    const now = new Date().toISOString();
    
    const order: Order = {
      id: orderId,
      userId: data.userId,
      items: data.items,
      paymentMethod: data.paymentMethod,
      total: data.total,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    
    this.orders.set(orderId, order);
    return order;
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  updateOrder(orderId: string, data: UpdateOrderData): Order | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    if (data.status) order.status = data.status;
    if (data.paymentMethod) order.paymentMethod = data.paymentMethod;
    order.updatedAt = new Date().toISOString();

    return order;
  }

  updateOrderStatus(orderId: string, status: OrderStatus): Order | null {
    return this.updateOrder(orderId, { status });
  }

  getOrdersByUser(userId: string): Order[] {
    return Array.from(this.orders.values()).filter(o => o.userId === userId);
  }

  getOrdersByStatus(status: OrderStatus): Order[] {
    return Array.from(this.orders.values()).filter(o => o.status === status);
  }

  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (['paid', 'shipped', 'delivered'].includes(order.status)) {
      return false;
    }

    order.status = 'cancelled';
    order.updatedAt = new Date().toISOString();
    return true;
  }

  deleteOrder(orderId: string): boolean {
    return this.orders.delete(orderId);
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  getOrderStats(): {
    total: number;
    pending: number;
    paid: number;
    cancelled: number;
    totalRevenue: number;
  } {
    const orders = this.getAllOrders();
    
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      paid: orders.filter(o => o.status === 'paid').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.total, 0)
    };
  }

  clearOrders(): void {
    this.orders.clear();
    this.sequence = 0;
  }
}

export const OrderService = new OrderServiceClass();

export default OrderService;