interface SalesContext {
  leadId?: string;
  lead?: Record<string, unknown>;
  message?: string;
  customerId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

interface SalesResult {
  lead?: { id: string; [key: string]: unknown };
  productResult?: unknown;
  quote?: { id: string; [key: string]: unknown };
  contract?: { id: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface SessionData {
  stage: string;
  data: unknown;
  updatedAt: string;
}

const leadClaw = require('../skills/sales/lead-claw');
const productClaw = require('../skills/sales/product-claw');
const quoteClaw = require('../skills/sales/quote-claw');
const contractClaw = require('../skills/sales/contract-claw');
const installClaw = require('../skills/sales/install-claw');
const supportClaw = require('../skills/sales/support-claw');

const module = {
  version: '2.3.2',
  
  sessions: new Map<string, SessionData>(),
  leads: new Map<string, SalesResult>(),
  quotes: new Map<string, SalesResult>(),
  contracts: new Map<string, SalesResult>(),
  tickets: new Map<string, unknown>(),
  
  async processLead(context: SalesContext): Promise<SalesResult> {
    const result = leadClaw.process(context);
    this.leads.set(result.lead.id, result);
    this.createSession(result.lead.id, 'lead');
    return result;
  },
  
  async processProduct(context: SalesContext): Promise<SalesResult> {
    const lead = this.findLead(context.leadId);
    context.lead = lead?.lead || {};
    const result = productClaw.process(context);
    if (lead) {
      (lead as Record<string, unknown>).productResult = result;
      (lead as Record<string, unknown>).stage = 'product';
      this.updateSession(lead.lead.id, result);
    }
    return result;
  },
  
  async processQuote(context: SalesContext): Promise<SalesResult> {
    const lead = this.findLead(context.leadId);
    context.lead = lead?.lead || {};
    const result = quoteClaw.process(context);
    this.quotes.set(result.quote.id, result);
    if (lead) {
      (lead as Record<string, unknown>).quoteResult = result;
      (lead as Record<string, unknown>).stage = 'quote';
      this.updateSession(lead.lead.id, result);
    }
    return result;
  },

  findLead(leadId: string): SalesResult | undefined {
    return this.leads.get(leadId);
  },

  createSession(id: string, stage: string): void {
    this.sessions.set(id, {
      stage,
      data: {},
      updatedAt: new Date().toISOString()
    });
  },

  updateSession(id: string, data: unknown): void {
    const session = this.sessions.get(id);
    if (session) {
      session.data = data;
      session.updatedAt = new Date().toISOString();
    }
  },

  async processChat(context: SalesContext): Promise<{ message: string }> {
    const message = context.message?.toLowerCase() || '';
    
    if (message.includes('san pham') || message.includes('product')) {
      return { message: 'EcoSynTech co cac goi IoT sau:\n1. Basic - 5.000.000VND\n2. Pro - 12.000.000VND\n3. Enterprise - Lien he' };
    }
    
    if (message.includes('roi') || message.includes('tinh')) {
      return { message: 'Vui long cho biet dien tich va loai cay de tinh ROI' };
    }
    
    return { message: 'Xin chao! EcoSynTech ho tro gi cho ban?' };
  }
};

export = module;