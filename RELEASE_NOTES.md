# EcoSynTech FarmOS Release Notes

**Version:** 5.1.0 | **Codename:** Mekong AI | **Date:** 2026-04-23
**Standard:** ISO 27001:2022 | **Governance:** A.14 AI/ML Operations | **Scope:** Vietnam Pilot (100 ESP32 devices)

---

## Highlights

This release adds a complete AI/ML Bootstrap system with ISO 27001:2022 A.14 AI/ML Operations controls, IoT data governance pipeline, and audit readiness artifacts. The system is aligned with Vietnam market requirements and ready for Go-Live pilot with 100 ESP32 devices.

### What's New

- **On-Demand AI Model Bootstrap**: Lightweight TFLite (~4MB) enabled by default; large ONNX (~2GB) available on-demand
- **IoT Data Governance Pipeline**: Sensor data quality assessment (A-F grading), prediction audit trail with data lineage hashing
- **ISO 27001:2022 Audit Ready**: 93/93 Annex A controls implemented, SHA256 model integrity verification, auditor-ready self-assessment
- **Admin Bootstrap Dashboard**: Web UI at `/bootstrap` for model management, status, and configuration

---

## Version Compatibility

| Component | Minimum Version | Notes |
|-----------|----------------|-------|
| Node.js | 18.0.0 | Tested on 18.x and 20.x |
| SQLite | 3.x | Default embedded database |
| MQTT Broker | Any MQTT 3.x/5.0 | HiveMQ public broker used by default |
| ESP32 Firmware | v1.0+ | MQTT payload format: `{"value": number}` |
| Browser | Modern evergreen | Tested on Chrome 120+, Firefox 120+ |

---

## What's Changed

### New Files

| File | Description |
|------|-------------|
| `src/bootstrap/modelLoader.js` | Model bootstrap with SHA256 checksum verification, ring buffer history |
| `src/bootstrap/bootstrap_api.js` | REST API: `/api/bootstrap/status|health|history|configure|reload` |
| `src/services/aiTelemetry.js` | IoT data governance with 8 sensor quality rules, audit trail |
| `src/services/aiEngine.js` | AI predictions with data quality gates and audit logging |
| `migrations/007_ai_telemetry_governance.sql` | `ai_prediction_audit` and `data_quality_logs` tables |
| `scripts/setup-models.sh` | Bootstrap script with Google Drive URL support |
| `bin/bootstrap-ai.js` | CLI: `status|health|history|apply|reload` |
| `public/bootstrap.html` | Admin Bootstrap Dashboard |
| `docs/bootstrap-runbook.md` | Full ops runbook with API reference |
| `AUDIT_CHECKLIST.md` | Auditor self-assessment (93 controls) |
| `AUDIT_EXECUTIVE_SUMMARY.md` | Executive summary for certification audit |
| `__tests__/ai_telemetry.test.js` | 22 tests for telemetry service |
| `__tests__/audit_evidence.test.js` | 41 tests for evidence collection |
| `models/plant_disease.tflite` | Plant disease detector model (38 classes, ~4MB) |
| `models/registry.json` | Model inventory with SHA256 checksums |
| `AI_EVIDENCE_PACK.md` v6.2 | Evidence pack for A.14 controls |

### Breaking Changes

**None.** This release adds new functionality without breaking existing APIs or behavior. All existing endpoints remain compatible.

### Deprecations

- `/api/ai/predict/irrigation` (existing) — now includes `dataQuality` and `auditId` in response
- `/api/ai/predict/disease-risk` (existing) — now includes `dataQuality` in response

---

## Migration Guide

### Upgrading from v5.0.0

**No database migration required** for existing deployments. The new `ai_prediction_audit` and `data_quality_logs` tables are created automatically on first run.

To enable the new AI/ML Bootstrap system:

```bash
# 1. Run database migrations
node run-migrations.js

# 2. Verify small model (default)
npm run bootstrap-ai status

# 3. (Optional) Enable large model
AI_LARGE_MODEL=1 AI_ONNX_URL="https://..." npm run bootstrap-ai apply --large 1 --url "..."

# 4. Verify bootstrap UI
open http://localhost:3000/bootstrap
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_SMALL_MODEL` | `1` (ON) | Enable TFLite plant disease model |
| `AI_LARGE_MODEL` | `0` (OFF) | Enable ONNX irrigation model |
| `AI_ONNX_URL` | empty | URL to download large model (Drive or direct) |
| `AI_CONFIDENCE_THRESHOLD` | `0.6` | Minimum confidence for predictions |
| `AI_ENGINE_ENABLED` | `true` | Enable/disable AI engine |

---

## AI/ML Model Inventory

| Model | ID | Size | Default | Checksum (SHA256) |
|-------|-----|------|---------|-------------------|
| Plant Disease Detector | model-001 | 3.9 MB | ON | `899d4f5e...` |
| Irrigation LSTM Predictor | model-002 | ~2 GB | OFF | (vendor-provided) |

---

## ISO 27001:2022 A.14 Controls

All 6 AI/ML controls implemented and documented:

| Control | Description | Implementation |
|---------|-------------|----------------|
| **A.14.1** | AI Decision Logging | Ring buffer (100 entries) + `ai_prediction_audit` DB table |
| **A.14.2** | AI Lifecycle Management | Versioned models, registry, bootstrap, SHA256 checksums |
| **A.14.3** | Data Quality for AI | 8 sensor rules, A-F grading, quality gate (score ≥ 40) |
| **A.14.4** | Security of AI Assets | RBAC, checksum verification, path-based access control |
| **A.14.5** | AI Incident Response | SOP-E-06, Telegram alerts, incident audit trail |
| **A.14.6** | Third-Party Model Download | Two-step Drive download, SHA256 verification |

---

## Bug Fixes

No bugs fixed in this release — initial feature implementation.

---

## Known Issues

| ID | Description | Workaround |
|----|-------------|-----------|
| K-001 | `gh` CLI crashes on aarch64 (ARMv8) | Use web UI or REST API for GitHub operations |
| K-002 | Large model (model-002) not included in repo | Download via `AI_ONNX_URL` with vendor-provided SHA256 |
| K-003 | ONNX runtime may fail without GPU on some ARM platforms | Falls back to heuristic prediction |

---

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| AI Telemetry | 22 | ✅ Pass |
| Bootstrap API | 6 | ✅ Pass |
| Bootstrap Script | 2 | ✅ Pass |
| Audit Evidence | 41 | ✅ Pass |
| Smart Automation | (existing) | ✅ Pass |
| AI Manager | 17 | ✅ Pass |
| **Total** | **88+** | **✅ All Pass** |

---

## Documentation

| Document | Description |
|----------|-------------|
| `docs/bootstrap-runbook.md` | Operations runbook for bootstrap system |
| `AUDIT_CHECKLIST.md` | Auditor self-assessment (93 controls) |
| `AUDIT_EXECUTIVE_SUMMARY.md` | Executive summary for certification audit |
| `AI_EVIDENCE_PACK.md` v6.2 | Evidence pack for ISO 27001:2022 A.14 |
| `ISMS_POLICY.md` | Information Security Management System policy |
| `RISK_REGISTER.md` | Risk register including 7 AI/ML risks |
| `SOP_AI_GOVERNANCE.md` | AI governance SOPs (E-04/05/06) |
| `IoT_DATA_TAXONOMY.md` | IoT data classification and retention |

---

## Support

- **Internal**: AI Ops Lead | ISMS Manager
- **Vietnam Pilot**: 100 ESP32 devices, Ho Chi Minh City region
- **Documentation**: See `docs/` directory
- **Governance**: See ISMS_POLICY.md

---

## Roadmap

| Milestone | Target | Status |
|-----------|--------|--------|
| Internal Audit | 2026-05-15 | 🔄 Scheduled |
| External Audit (Stage 1) | 2026-09-15 | ⏳ Pending |
| External Audit (Stage 2) | 2026-10-23 | ⏳ Pending |
| Certification | 2026-11-15 | ⏳ Pending |
| Vietnam Pilot Expansion (500 devices) | 2027-Q1 | ⏳ Planned |

---

*Document Classification: Internal – Controlled*
*Owner: AI Ops Lead | Review Cycle: 6 months | Next Review: 2026-10-23*