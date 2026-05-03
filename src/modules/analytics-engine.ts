export interface Lead {
  id: string;
  timestamp: string;
  source: string;
  campaign: string | null;
  [key: string]: unknown;
}

export interface Quote {
  id: string;
  timestamp: string;
  package: string;
  value: number;
  [key: string]: unknown;
}

export interface Order {
  id: string;
  timestamp: string;
  quoteId: string;
  value: number;
  status: string;
  customer: unknown;
  [key: string]: unknown;
}

export interface Revenue {
  timestamp: string;
  amount: number;
  source: string;
  [key: string]: unknown;
}

export interface SalesData {
  leads: Lead[];
  quotes: Quote[];
  orders: Order[];
  revenue: Revenue[];
}

export interface KPIResult {
  totalLeads: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
  previousPeriod: {
    leads: number;
    orders: number;
    revenue: number;
  };
  growth: {
    leads: number;
    orders: number;
    revenue: number;
  };
}

import analyticsEngine = {
  version: '2.3.2',
  
  salesData: {
    leads: [] as Lead[],
    quotes: [] as Quote[],
    orders: [] as Order[],
    revenue: [] as Revenue[]
  },
  
  trackLead: function(data: Record<string, unknown>): Lead {
    const lead: Lead = {
      id: 'LEAD-' + Date.now(),
      timestamp: new Date().toISOString(),
      source: (data.source as string) || 'website',
      campaign: (data.campaign as string) || null,
      ...data
    };
    this.salesData.leads.push(lead);
    return lead;
  },
  
  trackQuote: function(data: Record<string, unknown>): Quote {
    const quote: Quote = {
      id: 'QT-' + Date.now(),
      timestamp: new Date().toISOString(),
      package: data.package as string,
      value: data.value as number,
      ...data
    };
    this.salesData.quotes.push(quote);
    return quote;
  },
  
  trackOrder: function(data: Record<string, unknown>): Order {
    const order: Order = {
      id: 'ORD-' + Date.now(),
      timestamp: new Date().toISOString(),
      quoteId: data.quoteId as string,
      value: data.value as number,
      status: 'new',
      customer: data.customer,
      ...data
    };
    this.salesData.orders.push(order);
    return order;
  },
  
  trackRevenue: function(data: Record<string, unknown>): Revenue {
    const revenue: Revenue = {
      timestamp: new Date().toISOString(),
      amount: data.amount as number,
      source: (data.source as string) || 'sales',
      ...data
    };
    this.salesData.revenue.push(revenue);
    return revenue;
  },
  
  getKPIs: function(period: number = 30): KPIResult {
    const cutoff = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    
    const leadsInPeriod = this.salesData.leads.filter(l => new Date(l.timestamp) > cutoff);
    const ordersInPeriod = this.salesData.orders.filter(o => new Date(o.timestamp) > cutoff);
    const revenueInPeriod = this.salesData.revenue.filter(r => new Date(r.timestamp) > cutoff);
    
    const totalRevenue = revenueInPeriod.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalOrders = ordersInPeriod.length;
    const closedOrders = ordersInPeriod.filter(o => o.status === 'closed').length;
    
    const previousPeriod = new Date(Date.now() - period * 2 * 24 * 60 * 60 * 1000);
    const prevLeads = this.salesData.leads.filter(l => {
      const d = new Date(l.timestamp);
      return d > previousPeriod && d <= cutoff;
    });
    const prevOrders = this.salesData.orders.filter(o => {
      const d = new Date(o.timestamp);
      return d > previousPeriod && d <= cutoff;
    });
    const prevRevenue = this.salesData.revenue.filter(r => {
      const d = new Date(r.timestamp);
      return d > previousPeriod && d <= cutoff;
    });

    const prevRevenueTotal = prevRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);
    const prevOrdersCount = prevOrders.length;

    const growthLeads = prevLeads.length > 0 ? ((leadsInPeriod.length - prevLeads.length) / prevLeads.length) * 100 : 0;
    const growthOrders = prevOrdersCount > 0 ? ((totalOrders - prevOrdersCount) / prevOrdersCount) * 100 : 0;
    const growthRevenue = prevRevenueTotal > 0 ? ((totalRevenue - prevRevenueTotal) / prevRevenueTotal) * 100 : 0;

    return {
      totalLeads: leadsInPeriod.length,
      totalOrders: totalOrders,
      totalRevenue: totalRevenue,
      conversionRate: leadsInPeriod.length > 0 ? (closedOrders / leadsInPeriod.length) * 100 : 0,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      previousPeriod: {
        leads: prevLeads.length,
        orders: prevOrdersCount,
        revenue: prevRevenueTotal
      },
      growth: {
        leads: growthLeads,
        orders: growthOrders,
        revenue: growthRevenue
      }
    };
  },
  
  getFunnel: function(): Record<string, number> {
    return {
      leads: this.salesData.leads.length,
      quotes: this.salesData.quotes.length,
      orders: this.salesData.orders.length,
      revenue: this.salesData.revenue.length
    };
  },
  
  getRevenueBySource: function(): Record<string, number> {
    const sourceRevenue: Record<string, number> = {};
    this.salesData.revenue.forEach(r => {
      const source = r.source || 'unknown';
      sourceRevenue[source] = (sourceRevenue[source] || 0) + r.amount;
    });
    return sourceRevenue;
  },
  
  exportData: function(): string {
    return JSON.stringify(this.salesData, null, 2);
  },
  
  importData: function(json: string): void {
    try {
      const data = JSON.parse(json);
      if (data.leads) this.salesData.leads = data.leads;
      if (data.quotes) this.salesData.quotes = data.quotes;
      if (data.orders) this.salesData.orders = data.orders;
      if (data.revenue) this.salesData.revenue = data.revenue;
    } catch (e) {
      console.error('Failed to import analytics data:', e);
    }
  },
  
  clearData: function(): void {
    this.salesData = {
      leads: [],
      quotes: [],
      orders: [],
      revenue: []
    };
  }
};

export default analyticsEngine;