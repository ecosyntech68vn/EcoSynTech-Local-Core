import config from '../config';

interface BlockchainConfig {
  enabled?: boolean;
  type?: string;
  network?: string;
  moduleAddress?: string;
  privateKey?: string;
}

let BC_ENABLED = false;

function init(): void {
  const bcConfig = (config as { blockchain?: BlockchainConfig }).blockchain || {};
  BC_ENABLED = bcConfig.enabled === true;
}

export function isEnabled(): boolean {
  init();
  return BC_ENABLED;
}

export interface HarvestMetadata {
  harvest_quantity: number;
  harvest_notes: string;
  timestamp: string;
}

export function createHarvestMetadata(harvestQuantity: number, harvestNotes: string): HarvestMetadata {
  return {
    harvest_quantity: harvestQuantity,
    harvest_notes: harvestNotes,
    timestamp: new Date().toISOString()
  };
}

export interface ExportMetadata {
  buyer_name: string;
  buyer_contact: string;
  export_price: number;
  export_unit: string;
  export_notes: string;
  timestamp: string;
}

export function createExportMetadata(buyerName: string, buyerContact: string, exportPrice: number, exportUnit: string, notes: string): ExportMetadata {
  return {
    buyer_name: buyerName,
    buyer_contact: buyerContact,
    export_price: exportPrice,
    export_unit: exportUnit,
    export_notes: notes,
    timestamp: new Date().toISOString()
  };
}

export interface CertMetadata {
  certification_name: string;
  certification_body: string;
  certification_date: string;
  certification_expire: string;
  certificate_number: string;
  timestamp: string;
}

export function createCertMetadata(certificationName: string, certificationBody: string, certificationDate: string, certificationExpire: string, certificateNumber: string): CertMetadata {
  return {
    certification_name: certificationName,
    certification_body: certificationBody,
    certification_date: certificationDate,
    certification_expire: certificationExpire,
    certificate_number: certificateNumber,
    timestamp: new Date().toISOString()
  };
}

export interface StageMetadata {
  stage: string;
  timestamp: string;
}

export function createStageMetadata(stage: string): StageMetadata {
  return {
    stage: stage,
    timestamp: new Date().toISOString()
  };
}

export function shouldRecordToBlockchain(): boolean {
  init();
  return BC_ENABLED;
}

export default {
  isEnabled,
  shouldRecordToBlockchain,
  createHarvestMetadata,
  createExportMetadata,
  createCertMetadata,
  createStageMetadata
};