import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import * as cartService from '../services/cartService';
import * as orderService from '../services/orderService';
import { PLANS } from '../services/pricingService';
import { SepayService } from '../services/sepayService';
import { MoMoService } from '../services/momoService';
import { PaymentService as VNPayService } from '../services/paymentService';

const router = Router();

const sepay = new SepayService();
const momo = new MoMoService();
const vnPay = new VNPayService();

interface AddToCartBody {
  plan: string;
  duration?: number;
}

interface RemoveFromCartBody {
  plan: string;
}

interface UpdateCartBody {
  plan: string;
  quantity: number;
}

interface CreateCheckoutBody {
  method: string;
}

router.get('/cart', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const summary = cartService.getCartSummary(userId);
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/cart/add', auth, async (req: Request, res: Response) => {
  try {
    const { plan, duration } = req.body as AddToCartBody;
    const userId = (req as any).user?.id || (req as any).user?.sub;

    if (!PLANS[plan]) {
      res.status(400).json({ ok: false, error: 'Invalid plan' });
      return;
    }

    const summary = cartService.addItem(userId, plan, duration || 1);
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/cart/remove', auth, async (req: Request, res: Response) => {
  try {
    const { plan } = req.body as RemoveFromCartBody;
    const userId = (req as any).user?.id || (req as any).user?.sub;
    
    const summary = cartService.removeItem(userId, plan);
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/cart/update', auth, async (req: Request, res: Response) => {
  try {
    const { plan, quantity } = req.body as UpdateCartBody;
    const userId = (req as any).user?.id || (req as any).user?.sub;
    
    const summary = cartService.updateQuantity(userId, plan, quantity);
    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/cart/clear', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    cartService.clearCart(userId);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/checkout/create', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const { method } = req.body as CreateCheckoutBody;

    const validation = cartService.validateCart(userId);
    if (!validation.valid) {
      res.status(400).json({ ok: false, errors: validation.errors });
      return;
    }

    const checkoutData = cartService.getCheckoutData(userId);
    const order = orderService.createOrder(userId, checkoutData, method);
    
    let paymentUrl: string | null = null;
    
    switch (method) {
    case 'sepay': {
      const sepayResult = await sepay.createPayment(order.orderId, checkoutData.items[0]?.plan || 'PRO');
      paymentUrl = sepayResult.paymentUrl || (sepayResult as any).link;
      break;
    }
    case 'momo': {
      const momoResult = await momo.createPayment(order.orderId, checkoutData.items[0]?.plan || 'PRO');
      paymentUrl = momoResult.payUrl || momoResult.payURL;
      break;
    }
    case 'vnpay': {
      const vnpResult = await vnPay.createPayment(order.orderId, checkoutData.total, 'Order ' + order.orderId);
      paymentUrl = vnpResult.paymentUrl;
      break;
    }
        
    default:
      res.status(400).json({ ok: false, error: 'Unsupported payment method' });
      return;
    }

    res.json({
      ok: true,
      data: {
        orderId: order.orderId,
        paymentUrl,
        amount: checkoutData.total,
        method,
        expiresAt: checkoutData.validUntil
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/checkout/confirm/:orderId', auth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = orderService.getOrder(orderId);
    
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found' });
      return;
    }

    if (order.status === 'paid') {
      res.json({
        ok: true,
        message: 'Payment already confirmed',
        data: order
      });
      return;
    }

    orderService.markAsPaid(orderId, order.transactionId || 'manual-confirm', {});
    
    const userId = (req as any).user?.id || (req as any).user?.sub;
    cartService.clearCart(userId);

    res.json({
      ok: true,
      message: 'Payment confirmed successfully',
      data: {
        orderId: order.orderId,
        items: order.items,
        total: order.total
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/orders', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const history = orderService.getOrderHistory(userId);
    res.json({ ok: true, data: history });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/orders/:orderId', auth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = orderService.getOrder(orderId);
    
    if (!order) {
      res.status(404).json({ ok: false, error: 'Order not found' });
      return;
    }

    res.json({ ok: true, data: order });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/orders/stats', auth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.sub;
    const stats = orderService.getOrderStats(userId);
    res.json({ ok: true, data: stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.post('/webhook/sepay', async (req: Request, res: Response) => {
  try {
    const result = sepay.handleCallback(req.body);
    
    if (result.ok) {
      orderService.markAsPaid(result.orderId, (result as any).bankTransactionId, req.body);
    }
    
    res.json({ result: 'ok' });
  } catch (error) {
    res.status(500).json({ result: 'error' });
  }
});

router.post('/webhook/vnpay', async (req: Request, res: Response) => {
  try {
    const result = vnPay.handleCallback(req.body);
    
    if (result.ok) {
      orderService.markAsPaid(result.transactionId, (result as any).bankTransactionId, req.body);
    }
    
    res.json({ result: 'ok' });
  } catch (error) {
    res.status(500).json({ result: 'error' });
  }
});

router.post('/webhook/momo', async (req: Request, res: Response) => {
  try {
    const { resultCode, orderId, transId } = req.body;
    
    if (resultCode === 0) {
      orderService.markAsPaid(orderId, transId, req.body);
    }
    
    res.json({ result: 'ok' });
  } catch (error) {
    res.status(500).json({ result: 'error' });
  }
});

export default router;