import { Router, Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as salesModule from '../modules/sales-integration';

const router = Router();

interface LeadBody {
  message?: string;
  customer?: string;
  source?: string;
}

interface ProductBody {
  leadId?: string;
  farmSize?: string;
  cropType?: string;
  budget?: string;
  packageId?: string;
}

interface QuoteBody {
  leadId?: string;
  packageId?: string;
  farmSize?: string;
  cropType?: string;
}

interface ContractBody {
  quoteId?: string;
  customer?: Record<string, unknown>;
  payment?: Record<string, unknown>;
}

interface InstallBody {
  contractId?: string;
}

interface SupportBody {
  issue?: string;
  customerId?: string;
  contractId?: string;
}

interface ChatBody {
  message?: string;
  customerId?: string;
  sessionId?: string;
}

router.post('/lead', asyncHandler(async (req: Request, res: Response) => {
  const { message, customer, source } = req.body as LeadBody;
  const result = await salesModule.processLead({ message, customer, source });
  res.json(result);
}));

router.post('/product', asyncHandler(async (req: Request, res: Response) => {
  const { leadId, farmSize, cropType, budget, packageId } = req.body as ProductBody;
  const result = await salesModule.processProduct({ leadId, farmSize, cropType, budget, packageId });
  res.json(result);
}));

router.post('/quote', asyncHandler(async (req: Request, res: Response) => {
  const { leadId, packageId, farmSize, cropType } = req.body as QuoteBody;
  const result = await salesModule.processQuote({ leadId, packageId, farmSize, cropType });
  res.json(result);
}));

router.post('/contract', asyncHandler(async (req: Request, res: Response) => {
  const { quoteId, customer, payment } = req.body as ContractBody;
  const result = await salesModule.processContract({ quoteId, customer, payment });
  res.json(result);
}));

router.post('/install', asyncHandler(async (req: Request, res: Response) => {
  const { contractId } = req.body as InstallBody;
  const result = await salesModule.processInstall({ contractId });
  res.json(result);
}));

router.post('/support', asyncHandler(async (req: Request, res: Response) => {
  const { issue, customerId, contractId } = req.body as SupportBody;
  const result = await salesModule.processSupport({ issue, customerId, contractId });
  res.json(result);
}));

router.post('/chat', asyncHandler(async (req: Request, res: Response) => {
  const { message, customerId, sessionId } = req.body as ChatBody;
  const result = await salesModule.processChat({ message, customerId, sessionId });
  res.json(result);
}));

router.get('/status', asyncHandler(async (req: Request, res: Response) => {
  const stats = salesModule.getStats();
  res.json(stats);
}));

export default router;