/**
 * Cost Calculator Skill
 * Tính chi phí đầu tư, vận hành và thời gian thu hồi vốn cho nông dân Việt Nam
 */

interface SkillContext {
  event?: {
    action?: string;
    inputs?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface CostResult {
  hardware: number;
  installation: number;
  totalInvestment: number;
  monthlyCloud: number;
  monthlyMaintenance: number;
  monthlyTotal: number;
  yearlyTotal: number;
}

interface CalculationResult {
  inputs: { sensorCount: number; farmArea: number; cropType: string };
  costs: CostResult;
  annualRevenue: number;
  annualOperatingCost: number;
  annualProfit: number;
  paybackPeriod: number;
  roi: string;
}

const skill = {
  id: 'cost-calculator',
  name: 'Cost Calculator',
  description: 'Tính chi phí đầu tư, vận hành và thời gian thu hồi vốn cho nông dân Việt Nam',
  version: '2.3.2',
  triggers: ['event:cost.calculate', 'event:roi.calculate', 'event:cost.estimate'],
  riskLevel: 'low',
  canAutoFix: false,

  run: function(ctx: SkillContext): Record<string, unknown> {
    const event = ctx.event || {};
    const action = (event.action as string) || 'calculate';
    const inputs = (event.inputs as Record<string, unknown>) || event;
    
    const result: Record<string, unknown> = {
      ok: true,
      action: action,
      timestamp: new Date().toISOString(),
      version: '2.3.2'
    };
    
    switch (action) {
      case 'calculate':
      case 'estimate':
        result.calculation = this.calculate(inputs);
        break;
      case 'roi':
        result.roi = this.calculateROI(inputs);
        break;
      case 'breakdown':
        result.breakdown = this.getCostBreakdown(inputs);
        break;
      case 'compare':
        result.comparison = this.compareOptions(inputs);
        break;
      case 'summary':
        result.summary = this.getSummary(inputs);
        break;
      default:
        result.calculation = this.calculate(inputs);
    }
    
    return result;
  },

  calculate: function(inputs: Record<string, unknown>): CalculationResult {
    const sensorCount = (inputs.sensorCount as number) || 5;
    const farmArea = (inputs.farmArea as number) || 1000;
    const cropType = (inputs.cropType as string) || 'vegetables';
    
    const cost = this.getCosts(sensorCount, farmArea, cropType);
    
    const annualRevenue = this.getAnnualRevenue(farmArea, cropType);
    const annualCost = this.getAnnualOperatingCost(farmArea, cropType);
    const annualProfit = annualRevenue - annualCost;
    const paybackMonths = cost.totalInvestment > 0 && annualProfit > 0 
      ? Math.ceil((cost.totalInvestment / annualProfit) * 12) 
      : 0;
    
    return {
      inputs: { sensorCount, farmArea, cropType },
      costs: cost,
      annualRevenue: annualRevenue,
      annualOperatingCost: annualCost,
      annualProfit: annualProfit,
      paybackPeriod: paybackMonths,
      roi: annualProfit > 0 ? ((annualProfit / cost.totalInvestment) * 100).toFixed(1) + '%' : '0%'
    };
  },

  getCosts: function(sensorCount: number, farmArea: number, cropType: string): CostResult {
    const sensorPrice = 500000;
    const gatewayPrice = 2000000;
    const installationCost = sensorCount * 100000;
    const softwareFee = 500000;
    const trainingFee = 300000;
    
    const hardware = (sensorPrice * sensorCount) + gatewayPrice;
    const installation = installationCost + softwareFee + trainingFee;
    const totalInvestment = hardware + installation;
    
    const monthlyCloud = 100000;
    const monthlyMaintenance = 200000;
    
    return {
      hardware: hardware,
      installation: installation,
      totalInvestment: totalInvestment,
      monthlyCloud: monthlyCloud,
      monthlyMaintenance: monthlyMaintenance,
      monthlyTotal: monthlyCloud + monthlyMaintenance,
      yearlyTotal: (monthlyCloud + monthlyMaintenance) * 12
    };
  },

  getAnnualRevenue: function(farmArea: number, cropType: string): number {
    const revenuePerSqm: Record<string, number> = {
      vegetables: 180000,
      fruits: 250000,
      rice: 120000,
      flowers: 350000,
      herbs: 420000
    };
    
    return (revenuePerSqm[cropType] || 180000) * farmArea;
  },

  getAnnualOperatingCost: function(farmArea: number, cropType: string): number {
    const costPerSqm: Record<string, number> = {
      vegetables: 90000,
      fruits: 130000,
      rice: 70000,
      flowers: 180000,
      herbs: 220000
    };
    
    return (costPerSqm[cropType] || 90000) * farmArea;
  },

  calculateROI: function(inputs: Record<string, unknown>): Record<string, unknown> {
    const calculation = this.calculate(inputs);
    
    const yearlyProfit = calculation.annualProfit;
    const investment = calculation.costs.totalInvestment;
    const yearlyCost = calculation.costs.yearlyTotal;
    
    const netProfit = yearlyProfit - yearlyCost;
    const roi = investment > 0 ? ((netProfit / investment) * 100).toFixed(1) + '%' : '0%';
    
    return {
      investment: investment,
      yearlyProfit: yearlyProfit,
      yearlyCost: yearlyCost,
      netProfit: netProfit,
      roi: roi,
      paybackPeriod: calculation.paybackPeriod,
      recommendation: netProfit > 0 ? 'Nên đầu tư' : 'Cần xem lại'
    };
  },

  getCostBreakdown: function(inputs: Record<string, unknown>): Record<string, unknown> {
    const cost = this.getCosts((inputs.sensorCount as number) || 5, (inputs.farmArea as number) || 1000, (inputs.cropType as string) || 'vegetables');
    
    return {
      chiPhíĐầuTư: {
        'Thiết bị cảm biến': cost.hardware,
        'Cài đặt & training': cost.installation,
        'Tổng đầu tư': cost.totalInvestment
      },
      chiPhíVậnHành: {
        'Cloud/tháng': cost.monthlyCloud,
        'Bảo trì/tháng': cost.monthlyMaintenance,
        'Tổng/tháng': cost.monthlyTotal,
        'Tổng/năm': cost.yearlyTotal
      },
      display: ' Viet Nam Đồng (VNĐ)'
    };
  },

  compareOptions: function(inputs: Record<string, unknown>): Record<string, unknown> {
    const options = [
      { name: 'Cơ bản', sensors: 3, features: ['Giám sát cơ bản', 'Cảnh báo'] },
      { name: 'Tiêu chuẩn', sensors: 5, features: ['Giám sát đầy đủ', 'AI predictions', 'Tự động hóa'] },
      { name: 'Nâng cao', sensors: 10, features: ['Full automation', 'AI RAG', 'Predictive maintenance', 'Blockchain'] }
    ];
    
    const comparisons = options.map((opt) => {
      const calc = this.calculate({
        sensorCount: opt.sensors,
        farmArea: (inputs.farmArea as number) || 1000,
        cropType: (inputs.cropType as string) || 'vegetables'
      });
      
      return {
        option: opt.name,
        sensors: opt.sensors,
        features: opt.features,
        investment: calc.costs.totalInvestment,
        yearlyCost: calc.costs.yearlyTotal,
        roi: calc.roi,
        paybackMonths: calc.paybackPeriod
      };
    });
    
    return { options: comparisons };
  },

  getSummary: function(inputs: Record<string, unknown>): Record<string, string> {
    const roi = this.calculateROI(inputs) as Record<string, number | string>;
    
    return {
      'Tổng đầu tư': roi.investment + ' VNĐ',
      'Lợi nhuận/năm': roi.netProfit + ' VNĐ',
      'ROI': roi.roi as string,
      'Thời gian thu hồi': roi.paybackPeriod + ' tháng',
      'Khuyến nghị': roi.recommendation as string
    };
  },

  getPresets: function(): Record<string, { areaUnit: string; investmentPerSqm: number }> {
    return {
      vegetables: { areaUnit: 'm²', investmentPerSqm: 2500 },
      fruits: { areaUnit: 'm²', investmentPerSqm: 3500 },
      rice: { areaUnit: 'm²', investmentPerSqm: 1500 },
      flowers: { areaUnit: 'm²', investmentPerSqm: 5000 },
      herbs: { areaUnit: 'm²', investmentPerSqm: 6000 }
    };
  }
};

export = skill;