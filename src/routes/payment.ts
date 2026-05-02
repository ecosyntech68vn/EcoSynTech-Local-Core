import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { PricingService, PLANS } from '../services/pricingService';
import { PaymentService as VNPayService } from '../services/paymentService';
import { MoMoService } from '../services/momoService';
import { SepayService } from '../services/sepayService';

const router = Router();

const vnPay = new VNPayService();
const momo = new MoMoService();
const sepay = new SepayService();

function generateOrderId(prefix = 'ECO'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

interface CreatePaymentBody {
  method: string;
  plan: string;
}

router.get('/methods', async (req: Request, res: Response) => {
  res.json({
    ok: true,
    data: [
      {
        id: 'vnpay',
        name: 'VNPay',
        logo: '/images/vnpay.png',
        banks: 40,
        description: 'Thanh toán qua ngân hàng nội địa'
      },
      {
        id: 'momo',
        name: 'MoMo',
        logo: '/images/momo.png',
        description: 'Ví điện tử MoMo'
      },
      {
        id: 'sepay',
        name: 'SePay',
        logo: '/images/sepay.png',
        banks: [
          { code: 'VCB', name: 'Vietcombank' },
          { code: 'TCB', name: 'Techcombank' },
          { code: 'ACB', name: 'ACB' },
          { code: 'BIDV', name: 'BIDV' },
          { code: 'CTG', name: 'VietinBank' },
          { code: 'MB', name: 'MB Bank' },
          { code: 'SHB', name: 'SHB' },
          { code: 'LPB', name: 'LienViet Post Bank' }
        ],
        description: 'SePay - Chuyển khoản ngân hàng'
      }
    ]
  });
});

router.post('/create', auth, async (req: Request, res: Response) => {
  try {
    const { method, plan } = req.body as CreatePaymentBody;
    const userId = (req as any).user?.id || 'unknown';
    
    if (!PLANS[plan]) {
      res.status(400).json({ ok: false, error: 'Invalid plan' });
      return;
    }
    
    const orderId = generateOrderId();
    
    let result;
    
    switch (method) {
    case 'vnpay':
      result = await vnPay.createPayment(orderId, plan, userId);
      break;
        
    case 'momo':
      result = await momo.createPayment(orderId, plan);
      break;
        
    case 'sepay':
      result = await sepay.createPayment(orderId, plan);
      break;
        
    default:
      res.status(400).json({ ok: false, error: 'Unsupported payment method' });
      return;
    }
    
    res.json({
      ok: true,
      orderId,
      plan,
      method,
      ...result
    });
    
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/status/:orderId', auth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { method } = req.query;
    
    let result;
    
    switch (method) {
    case 'vnpay':
      result = await vnPay.queryTransaction(orderId);
      break;
    case 'sepay':
      result = await sepay.checkStatus(orderId);
      break;
    case 'momo':
      result = { ok: false, error: 'MoMo requires webhook callback' };
      break;
    default:
      result = { ok: false, error: 'Unknown method' };
    }
    
    res.json({ ok: true, data: result });
    
  } catch (error) {
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

router.get('/vnpay-return', async (req: Request, res: Response) => {
  try {
    const result = vnPay.handleCallback(req.query);
    
    if (result.ok) {
      res.redirect(`/payment/success?order=${result.transactionId}`);
    } else {
      res.redirect(`/payment/failed?error=${result.error}`);
    }
    
  } catch (error) {
    res.redirect('/payment/failed?error=SYSTEM_ERROR');
  }
});

router.get('/sepay-return', async (req: Request, res: Response) => {
  try {
    const result = sepay.handleCallback(req.query);
    
    if (result.ok) {
      res.redirect(`/payment/success?order=${result.orderId}`);
    } else {
      res.redirect(`/payment/failed?error=${result.error}`);
    }
    
  } catch (error) {
    res.redirect('/payment/failed?error=SYSTEM_ERROR');
  }
});

router.post('/vnpay-ipn', async (req: Request, res: Response) => {
  try {
    const result = vnPay.handleCallback(req.body);
    
    if (result.ok) {
      console.log('[Payment] VNPay success:', result.transactionId);
    }
    
    res.json({ result: 'ok' });
    
  } catch (error) {
    console.error('[Payment] VNPay IPN error:', error);
    res.status(500).json({ result: 'error' });
  }
});

router.post('/sepay-ipn', async (req: Request, res: Response) => {
  try {
    const result = sepay.handleCallback(req.body);
    
    if (result.ok) {
      console.log('[Payment] SePay success:', result.orderId);
    }
    
    res.json({ result: 'ok' });
    
  } catch (error) {
    console.error('[Payment] SePay IPN error:', error);
    res.status(500).json({ result: 'error' });
  }
});

router.post('/momo-ipn', async (req: Request, res: Response) => {
  try {
    const { resultCode, orderId, transId } = req.body;
    
    if (resultCode === 0) {
      console.log('[Payment] MoMo success:', orderId);
    }
    
    res.json({ result: 'ok' });
    
  } catch (error) {
    console.error('[Payment] MoMo IPN error:', error);
    res.status(500).json({ result: 'error' });
  }
});

export default router;