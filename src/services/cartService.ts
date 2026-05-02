/**
 * Shopping Cart Service
 */

interface CartItem {
  plan: string;
  duration: number;
  quantity: number;
  addedAt: string;
}

interface CartSummary {
  items: CartItem[];
  total: number;
  itemCount: number;
}

interface PlanPricing {
  monthly: number;
  yearly: number;
  features: string[];
}

class CartService {
  carts: Map<string, CartItem[]>;

  constructor() {
    this.carts = new Map();
  }

  getCart(userId: string): CartItem[] {
    if (!this.carts.has(userId)) {
      this.carts.set(userId, []);
    }
    return this.carts.get(userId) || [];
  }

  addItem(userId: string, plan: string, duration = 1): CartSummary {
    const cart = this.getCart(userId);
    const existing = cart.findIndex(item => item.plan === plan);
    
    if (existing >= 0) {
      const item = cart[existing];
      if (item) {
        item.duration += duration;
        item.quantity = (item.quantity || 1) + 1;
      }
    } else {
      cart.push({
        plan,
        duration,
        quantity: 1,
        addedAt: new Date().toISOString()
      });
    }
    
    this.carts.set(userId, [...cart]);
    return this.getCartSummary(userId);
  }

  removeItem(userId: string, plan: string): CartSummary {
    const cart = this.getCart(userId);
    const filtered = cart.filter(item => item.plan !== plan);
    this.carts.set(userId, filtered);
    return this.getCartSummary(userId);
  }

  updateQuantity(userId: string, plan: string, quantity: number): CartSummary {
    const cart = this.getCart(userId);
    const item = cart.find(i => i.plan === plan);
    
    if (item) {
      if (quantity <= 0) {
        return this.removeItem(userId, plan);
      }
      item.quantity = quantity;
      this.carts.set(userId, [...cart]);
    }
    
    return this.getCartSummary(userId);
  }

  clearCart(userId: string): void {
    this.carts.set(userId, []);
  }

  getCartSummary(userId: string): CartSummary {
    const cart = this.getCart(userId);
    const { getPlanPricing } = require('./pricingService') as { getPlanPricing: (plan: string) => PlanPricing };
    
    let total = 0;
    for (const item of cart) {
      const pricing = getPlanPricing(item.plan);
      const period = item.duration >= 12 ? 'yearly' : 'monthly';
      const unitPrice = pricing[period as keyof PlanPricing] as number;
      total += unitPrice * item.quantity * item.duration;
    }

    return {
      items: cart,
      total,
      itemCount: cart.reduce((sum, item) => sum + item.quantity, 0)
    };
  }

  applyCoupon(userId: string, couponCode: string): { valid: boolean; discount: number; message: string } {
    const coupons: Record<string, { discount: number; minPurchase: number }> = {
      'WELCOME10': { discount: 10, minPurchase: 0 },
      'SAVE20': { discount: 20, minPurchase: 100 },
      'SPECIAL50': { discount: 50, minPurchase: 500 }
    };

    const coupon = coupons[couponCode];
    if (!coupon) {
      return { valid: false, discount: 0, message: 'Invalid coupon code' };
    }

    const summary = this.getCartSummary(userId);
    if (summary.total < coupon.minPurchase) {
      return { valid: false, discount: 0, message: `Minimum purchase of $${coupon.minPurchase} required` };
    }

    return { valid: true, discount: coupon.discount, message: 'Coupon applied successfully' };
  }
}

export default new CartService();