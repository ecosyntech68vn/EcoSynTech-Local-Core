import versionDrift from('../skills/drift/version-drift.skill');
import configDrift from('../skills/drift/config-drift.skill');
import wsHeartbeat from('../skills/network/ws-heartbeat.skill');
import mqttWatch from('../skills/network/mqtt-watch.skill');
import alertDeduper from('../skills/data/alert-deduper.skill');
import incidentCorrelator from('../skills/data/incident-correlator.skill');
import buildTestGate from('../skills/release/build-test-gate.skill');
import approvalGate from('../skills/release/approval-gate.skill');

import routeMapper from('../skills/diagnosis/route-mapper.skill');
import webhookCorrelator from('../skills/diagnosis/webhook-correlator.skill');
import anomalyClassifier from('../skills/diagnosis/anomaly-classifier.skill');
import deviceStateDiff from('../skills/diagnosis/device-state-diff.skill');
import kpiDrift from('../skills/diagnosis/kpi-drift.skill');
import rootCauseHint from('../skills/diagnosis/root-cause-hint.skill');

import retryJob from('../skills/selfheal/retry-job.skill');
import reconnectBridge from('../skills/selfheal/reconnect-bridge.skill');
import resetDevice from('../skills/selfheal/reset-device.skill');
import clearCache from('../skills/selfheal/clear-cache.skill');
import rollbackOta from('../skills/selfheal/rollback-ota.skill');
import autoAcknowledge from('../skills/selfheal/auto-acknowledge.skill');

import rulesEngine from('../skills/orchestration/rules-engine.skill');
import schedulesEngine from('../skills/orchestration/schedules-engine.skill');
import webhookDispatch from('../skills/orchestration/webhook-dispatch.skill');
import commandRouter from('../skills/orchestration/command-router.skill');
import otaOrchestrator from('../skills/orchestration/ota-orchestrator.skill');
import reportExport from('../skills/orchestration/report-export.skill');

import rbacGuard from('../skills/governance/rbac-guard.skill');
import auditTrail from('../skills/governance/audit-trail.skill');
import secretsCheck from('../skills/governance/secrets-check.skill');
import tenantIsolation from('../skills/governance/tenant-isolation.skill');
import rateLimitGuard from('../skills/governance/rate-limit-guard.skill');
import approvalGateAdvanced from('../skills/governance/approval-gate-advanced.skill');

import rootCauseAnalyzer from('../skills/analysis/root-cause-analyzer.skill');
import autoBackup from('../skills/analysis/auto-backup.skill');
import anomalyPredictor from('../skills/analysis/anomaly-predictor.skill');
import systemHealthScorer from('../skills/analysis/system-health-scorer.skill');

import autoRestore from('../skills/recovery/auto-restore.skill');

import vulnScanner from('../skills/security/vuln-scanner.skill');

import intrusionDetector from('../skills/defense/intrusion-detector.skill');

import telegramNotifier from('../skills/communication/telegram-notifier.skill');

import weatherDecision from('../skills/agriculture/weather-decision.skill');
import waterOptimization from('../skills/agriculture/water-optimization.skill');
import cropGrowthTracker from('../skills/agriculture/crop-growth-tracker.skill');
import pestAlert from('../skills/agriculture/pest-alert.skill');
import fertilizerScheduler from('../skills/agriculture/fertilizer-scheduler.skill');

import energySaver from('../skills/iot/energy-saver.skill');
import predictiveMaintenance from('../skills/iot/predictive-maintenance.skill');
import multiFarmManager from('../skills/iot/multi-farm-manager.skill');

import reportGenerator from('../skills/communication/report-generator.skill');
import voiceNotifier from('../skills/communication/voice-notifier.skill');
import voiceAssistant from('../skills/communication/voice-assistant.skill');

import languageSwitcher from('../skills/communication/language-switcher.skill');

import cleanupAgent from('../skills/maintenance/cleanup-agent.skill');
import logRotator from('../skills/maintenance/log-rotator.skill');
import dbOptimizer from('../skills/maintenance/db-optimizer.skill');
import aiPredictWeather from('../skills/ai/ai-predict-weather.skill');

import qrTraceability from('../skills/traceability/qr-traceability.skill');
import aptosBlockchain from('../skills/traceability/aptos-blockchain.skill');
import aptosIntegration from('../skills/traceability/aptos-integration.skill');
import aiInference from('../skills/ai/ai-inference.skill');
import aiRAG from('../skills/ai/ai-rag.skill');
import aiConversation from('../skills/ai/ai-conversation.skill');
import roiCalculator from('../skills/ai/roi-calculator.skill');
import dbSqliteIot from('../skills/maintenance/db-sqlite-iot.skill');
import hybridSync from('../skills/sync/hybrid-sync.skill');
import mobileDashboard from('../skills/dashboard/mobile-dashboard.skill');
import costCalculator from('../skills/ai/cost-calculator.skill');

import salesLeadClaw from('../skills/sales/lead-claw');
import salesProductClaw from('../skills/sales/product-claw');
import salesQuoteClaw from('../skills/sales/quote-claw');
import salesContractClaw from('../skills/sales/contract-claw');
import salesInstallClaw from('../skills/sales/install-claw');
import salesSupportClaw from('../skills/sales/support-claw');

import skills = [
  versionDrift,
  configDrift,
  wsHeartbeat,
  mqttWatch,
  alertDeduper,
  incidentCorrelator,
  buildTestGate,
  approvalGate,
  routeMapper,
  webhookCorrelator,
  anomalyClassifier,
  deviceStateDiff,
  kpiDrift,
  rootCauseHint,
  retryJob,
  reconnectBridge,
  resetDevice,
  clearCache,
  rollbackOta,
  autoAcknowledge,
  rulesEngine,
  schedulesEngine,
  webhookDispatch,
  commandRouter,
  otaOrchestrator,
  reportExport,
  rbacGuard,
  auditTrail,
  secretsCheck,
  tenantIsolation,
  rateLimitGuard,
  approvalGateAdvanced,
  rootCauseAnalyzer,
  autoBackup,
  anomalyPredictor,
  systemHealthScorer,
  autoRestore,
  vulnScanner,
  intrusionDetector,
  telegramNotifier,
  weatherDecision,
  waterOptimization,
  cropGrowthTracker,
  pestAlert,
  fertilizerScheduler,
  energySaver,
  predictiveMaintenance,
  multiFarmManager,
  reportGenerator,
  voiceNotifier,
  voiceAssistant,
  languageSwitcher,
  cleanupAgent,
  logRotator,
  dbOptimizer,
  aiPredictWeather,
  qrTraceability,
  aptosBlockchain,
  aptosIntegration,
  aiInference,
  aiRAG,
  aiConversation,
  roiCalculator,
  dbSqliteIot,
  hybridSync,
  mobileDashboard,
  costCalculator,
  salesLeadClaw,
  salesProductClaw,
  salesQuoteClaw,
  salesContractClaw,
  salesInstallClaw,
  salesSupportClaw
];

function buildRegistry() {
  const map = new Map();
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    map.set(skill.id, skill);
  }
  return map;
}

module.exports = { buildRegistry: buildRegistry, skills: skills };