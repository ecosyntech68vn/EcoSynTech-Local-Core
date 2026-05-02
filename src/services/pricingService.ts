/**
 * EcoSynTech Pricing Plans - 4 Product Tiers
 * Converted to TypeScript - Phase 1
 * 
 * BASE (Miễn phí) - Lite version
 * PRO (99K/tháng) - Pro version  
 * PRO_MAX (199K/tháng) - Pro Max
 * PREMIUM (299K/tháng) - Premium
 */

export interface PlanFeatures {
  dashboard: boolean;
  sensors: boolean;
  basicAlerts: boolean;
  manualControl: boolean;
  history7Days?: boolean;
  history30Days?: boolean;
  historyUnlimited?: boolean;
  exportCSV?: boolean;
  aiPredictions?: boolean;
  diseaseDetection?: boolean;
  federatedLearning?: boolean;
  qrTraceability?: boolean;
  multiFarm?: boolean;
  teamAccess?: boolean;
  apiAccess?: boolean;
  prioritySupport?: boolean;
}

export interface PricingPlan {
  name: string;
  price: number;
  period: string;
  maxDevices: number;
  maxSensors: number;
  features: PlanFeatures;
  description?: string;
  popular?: boolean;
}

export const PLANS: Record<string, PricingPlan> = {
  BASE: {
    name: 'BASE',
    price: 0,
    period: 'forever',
    maxDevices: 3,
    maxSensors: 5,
    features: {
      dashboard: true,
      sensors: true,
      basicAlerts: true,
      manualControl: true,
      history7Days: true,
      exportCSV: false,
      aiPredictions: false,
      diseaseDetection: false,
      federatedLearning: false,
      qrTraceability: false,
      multiFarm: false,
      teamAccess: false,
      apiAccess: false,
      prioritySupport: false
    }
  },
  
  PRO: {
    name: 'PRO',
    price: 99000,
    period: 'month',
    maxDevices: 8,
    maxSensors: 15,
    features: {
      dashboard: true,
      sensors: true,
      basicAlerts: true,
      manualControl: true,
      history30Days: true,
      exportCSV: true,
      aiPredictions: true,
      diseaseDetection: false,
      federatedLearning: false,
      qrTraceability: false,
      multiFarm: false,
      teamAccess: false,
      apiAccess: false,
      prioritySupport: false
    },
    description: 'Phù hợp cho hộ gia đình và HTX nhỏ',
    popular: true
  },
  
  PRO_MAX: {
    name: 'PRO_MAX',
    price: 199000,
    period: 'month',
    maxDevices: 20,
    maxSensors: 50,
    features: {
      dashboard: true,
      sensors: true,
      basicAlerts: true,
      manualControl: true,
      history30Days: true,
      exportCSV: true,
      aiPredictions: true,
      diseaseDetection: true,
      federatedLearning: false,
      qrTraceability: true,
      multiFarm: true,
      teamAccess: false,
      apiAccess: false,
      prioritySupport: false
    },
    description: 'Phù hợp cho HTX lớn và doanh nghiệp'
  },
  
  PREMIUM: {
    name: 'PREMIUM',
    price: 299000,
    period: 'month',
    maxDevices: 100,
    maxSensors: 200,
    features: {
      dashboard: true,
      sensors: true,
      basicAlerts: true,
      manualControl: true,
      historyUnlimited: true,
      exportCSV: true,
      aiPredictions: true,
      diseaseDetection: true,
      federatedLearning: true,
      qrTraceability: true,
      multiFarm: true,
      teamAccess: true,
      apiAccess: true,
      prioritySupport: true
    },
    description: 'Full features cho doanh nghiệp lớn'
  }
};

export type PlanName = 'BASE' | 'PRO' | 'PRO_MAX' | 'PREMIUM';

export function getPlan(planName: string): PricingPlan | undefined {
  return PLANS[planName];
}

export function getPlanByPrice(price: number): PricingPlan | undefined {
  return Object.values(PLANS).find(p => p.price === price);
}

export function hasFeature(planName: string, feature: keyof PlanFeatures): boolean {
  const plan = getPlan(planName);
  if (!plan) return false;
  return plan.features[feature] || false;
}

export function canUseDevice(planName: string, deviceCount: number): boolean {
  const plan = getPlan(planName);
  if (!plan) return false;
  return deviceCount <= plan.maxDevices;
}

export function canUseSensor(planName: string, sensorCount: number): boolean {
  const plan = getPlan(planName);
  if (!plan) return false;
  return sensorCount <= plan.maxSensors;
}

export function getUpgradePath(currentPlan: string): string[] {
  const order: PlanName[] = ['BASE', 'PRO', 'PRO_MAX', 'PREMIUM'];
  const currentIndex = order.indexOf(currentPlan as PlanName);
  
  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return [];
  }
  
  return order.slice(currentIndex + 1);
}

export function getFeatureDiff(plan1: string, plan2: string): string[] {
  const p1 = getPlan(plan1);
  const p2 = getPlan(plan2);
  
  if (!p1 || !p2) return [];
  
  const differences: string[] = [];
  const allFeatures = new Set([
    ...Object.keys(p1.features),
    ...Object.keys(p2.features)
  ]);
  
  for (const feature of allFeatures) {
    const hasP1 = p1.features[feature as keyof PlanFeatures];
    const hasP2 = p2.features[feature as keyof PlanFeatures];
    
    if (!hasP1 && hasP2) {
      differences.push(`+ ${feature}`);
    } else if (hasP1 && !hasP2) {
      differences.push(`- ${feature}`);
    }
  }
  
  return differences;
}

export function formatPrice(price: number): string {
  if (price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND' 
  }).format(price) + '/tháng';
}

export function getAllPlans(): PricingPlan[] {
  return Object.values(PLANS);
}

export default {
  getPlan,
  getPlanByPrice,
  hasFeature,
  canUseDevice,
  canUseSensor,
  getUpgradePath,
  getFeatureDiff,
  formatPrice,
  getAllPlans
};