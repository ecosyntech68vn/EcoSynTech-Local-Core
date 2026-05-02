/**
 * Features Config Type Declaration
 */

export interface FeaturesConfig {
  enableRedis: boolean;
  enableWebSocket: boolean;
  enableMQTT: boolean;
  enableAI: boolean;
  enablePayment: boolean;
  enableNotification: boolean;
}

declare const features: FeaturesConfig;

export default features;