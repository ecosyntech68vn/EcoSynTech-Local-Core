/**
 * ROI Calculator Skill
 * Calculate and display ROI for IoT Agriculture investment
 */

interface SkillContext {
  event?: {
    action?: string;
    params?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

import skill = {
  id: 'roi-calculator',
  name: 'ROI Calculator',
  description: 'Calculate and display ROI for IoT Agriculture investment',
  triggers: ['event:roi.calculate', 'event:roi.show', 'event:roi.compare', 'cron:1h'],
  riskLevel: 'low',
  canAutoFix: false,

  run: function(ctx: SkillContext): Record<string, unknown> {
    const event = ctx.event || {};
    const action = (event.action as string) || 'calculate';
    
    const result: Record<string, unknown> = {
      ok: true,
      action: action,
      timestamp: new Date().toISOString(),
      roi: null,
      payback: null,
      savings: null
    };
    
    switch (action) {
      case 'calculate':
      case 'show':
        result.roi = this.calculateROI(event.params);
        result.payback = this.calculatePayback(event.params);
        result.savings = this.calculateSavings(event.params);
        break;
      case 'compare':
        result.comparison = this.compareOptions(event.params);
        break;
      default:
        result.roi = this.getDefaultROI();
    }
    
    return result;
  },

  calculateROI: function(params: Record<string, unknown> | undefined): Record<string, number> {
    const investment = (params?.investment as number) || 15000000;
    const annualBenefit = (params?.annualBenefit as number) || 2400000;
    const yearlyCost = (params?.yearlyCost as number) || 3600000;
    
    const netBenefit = annualBenefit - yearlyCost;
    const roi = investment > 0 ? (netBenefit / investment) * 100 : 0;
    
    return { investment, annualBenefit, yearlyCost, netBenefit, roi: Math.round(roi * 10) / 10 };
  },

  calculatePayback: function(params: Record<string, unknown> | undefined): { months: number; years: number } {
    const investment = (params?.investment as number) || 15000000;
    const monthlyBenefit = ((params?.annualBenefit as number) || 2400000) / 12;
    
    const months = monthlyBenefit > 0 ? Math.ceil(investment / monthlyBenefit) : 0;
    return { months, years: Math.ceil(months / 12) };
  },

  calculateSavings: function(params: Record<string, unknown> | undefined): Record<string, number> {
    const waterSaved = (params?.waterSaved as number) || 30;
    const laborHours = (params?.laborHours as number) || 20;
    const yieldIncrease = (params?.yieldIncrease as number) || 15;
    
    return {
      waterSavingsPercent: waterSaved,
      laborHoursSaved: laborHours,
      yieldIncreasePercent: yieldIncrease,
      estimatedValue: waterSaved * 50000 + laborHours * 150000 + yieldIncrease * 100000
    };
  },

  compareOptions: function(params: Record<string, unknown> | undefined): unknown {
    return {
      basic: this.calculateROI({ investment: 8000000, annualBenefit: 1800000, yearlyCost: 2400000 }),
      standard: this.calculateROI({ investment: 15000000, annualBenefit: 3600000, yearlyCost: 3600000 }),
      premium: this.calculateROI({ investment: 25000000, annualBenefit: 6000000, yearlyCost: 4800000 })
    };
  },

  getDefaultROI: function(): Record<string, number> {
    return { roi: 16, paybackMonths: 75, savings: 4500000 };
  }
};

export = skill;