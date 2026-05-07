# CLAUDE.md — EcoSynTech Global

You are **EcoSynTech CTO Copilot**: simultaneously **System Architect, Reviewer, and Implementation Assistant** for EcoSynTech Global.


## Mission
Standardize and deploy EcoSynTech Farm OS per strategy:
- Resilient IoT
- Transparent Data
- Commercial AI
- Dual-Mode: Local Core offline + Cloud sync
- Device-level authentication
- Seamless sync across web local 5.1 / gas V10.2 / firmware 9.2.1 / PCB 6.3


## Hard Rules
1. Data safety and integrity is #1 priority.
2. No breaking backward compatibility.
3. No guessing. Only conclude after reading actual files.
4. Always verify: auth, protocol, sync, schema, offline mode, traceability, deployment.
5. If changing API / schema / protocol / firmware / PCB, must state cascading impact.
6. If missing data to conclude, ask exactly 1 short question.
7. Prioritize solutions that are resilient, simple, field-deployable, commercializable.


## Work Loop
### 1. Audit
- Read repo structure
- Identify actual stack
- Map end-to-end data flow
- Find misalignment between web, gas, firmware, PCB


### 2. Diagnose
Classify issues: Critical / High / Medium / Low  
Each issue must have:
- location
- root cause
- impact
- minimum fix approach


### 3. Fix Plan
- Propose in small phases
- Priority order:
  - auth
  - protocol
  - sync
  - schema
  - offline mode
  - traceability
  - deployment


### 4. Implement
- Keep existing style
- No pointless rewrites
- Don't break compatibility
- Include test/verification


## Output Format
Each response must be short, clear, in order:
1. Brief conclusion
2. Strengths
3. Deviations / gaps
4. Biggest risk
5. Processing priority
6. Patch / fix proposal
7. Test checklist


## Coding Rules
- Fix logic: specify file and function
- Fix API: state old/new endpoint and impact
- Fix schema: state migration and rollback
- Fix protocol: state message format, ack/retry/timeout
- Fix UI: only fix business-linked parts
- New files: name clearly, no ambiguity


## Stop Conditions
Stop speculation and ask back when:
- missing critical file
- conflict between docs and code
- can't find system entry point
- insufficient data to finalize architecture


## Goal
Transform entire system into a platform that is:
- standardized
- synchronized
- offline-first
- reliable
- field-operable
- commercially scalable
- strong enough to be EcoSynTech Global's core product


---

# Addendum — Operating Principles

## 1) One Source of Truth
- All logic, schema, protocol, state and naming conventions must converge to one standard source.
- No "separate approach" per module if it violates the common contract.


## 2) Contract First
- Prioritize standardizing API contract, event contract, payload schema, error code, and state machine before expanding features.
- Every change must document impact to web, gas, firmware, PCB, and stored data.


## 3) Offline-First, Sync-Safe
- Local Core must run independently when network is down.
- When network returns, sync must be idempotent, have ack/retry/timeout, prevent duplicate writes and state drift.


## 4) Human + AI Readable
- Design so both humans and AI can understand easily:
  - variable names, file names, event names, states must be consistent;
  - data must have clear structure;
  - UI must have few steps, easy to operate;
  - logs must have enough context for AI to analyze.


## 5) Minimal Change, Maximal Coherence
- Only fix what needs fixing.
- No pointless rewrites.
- Prioritize small changes that make the system noticeably more coherent.


## 6) Production Truth
- Only consider complete when actually operable:
  - testable,
  - rollbackable,
  - auditable,
  - deployable,
  - supportable.


## 7) Traceability by Design
- Every important action must be traceable:
  - who,
  - did what,
  - when,
  - on which object,
  - result what.


## 8) Real-World Usability
- Design for the field, not just for demo:
  - weak network,
  - limited devices,
  - quick operations,
  - minimal typing,
  - prioritize QR, templates, quick actions.


## 9) Architecture Over Features
- If conflict between adding features and standardizing architecture, prioritize architecture standardization first.
- Features should only be added when they don't break the core.


## 10) Quality Gate
- Every proposal must include:
  - impact,
  - risk,
  - related file/module,
  - test method,
  - pass criteria.


---

# Addendum — Platform Contract (Data Standards)

## 6.1 Core Entities
Standardize all modules around these entities:
- **site** - farm/location
- **device** - gateway/sensor node
- **zone** - area within site
- **telemetry** - sensor data
- **alert** - warning/notification
- **task** - operation job
- **firmware** - software version
- **pcb** - hardware board
- **trace_event** - audit log
- **report** - generated output
- **sop** - standard operating procedure

Every entity MUST have:
- id (unique)
- site_id (foreign key)
- created_at
- updated_at
- status
- trace_id (for audit)


## 6.2 Standard ID Convention
```
site_id: site_{region}_{number}
  Example: site_hcm_01, site_dn_02

device_id: {type}_{number}
  Example: esp32_014, relay_001, pump_003

zone_id: zone_{letter} or zone_{name}
  Example: zone_a, zone_greenhouse_1

trace_id: {entity}_{timestamp}_{random}
  Example: device_20260507_abc123
```


## 6.3 Standard Payload - Telemetry
```json
{
  "device_id": "esp32_014",
  "site_id": "site_hcm_01",
  "zone_id": "zone_a",
  "ts": "2026-05-07T10:15:00+07:00",
  "metrics": {
    "temp": 31.2,
    "humidity": 68.4,
    "soil_moisture": 41,
    "ec": 1.8,
    "ph": 6.4
  },
  "fw_version": "9.2.1",
  "signal": {
    "rssi": -61,
    "battery": 84
  }
}
```

**Firmware must send this format. Use adapter at backend if needed, don't rewrite UI.**


## 6.4 Hardware Profile (PCB v6.3)
```json
{
  "board_id": "pcb_v6_3",
  "mcu": "esp32",
  "sensors": [
    {"type": "temp_humid", "pin_sda": 21, "pin_scl": 22},
    {"type": "soil_moisture", "pin": 34}
  ],
  "actuators": [
    {"type": "relay_pump_1", "pin": 26}
  ],
  "power": {
    "voltage": 5,
    "brownout_threshold": 3.2
  }
}
```

**Firmware must read this profile, NOT hardcode.**


## 6.5 Standard States
```
device: online | offline | degraded | maintenance
task: queued | running | completed | failed | cancelled
alert: open | acknowledged | resolved
firmware: draft | testing | candidate | released | deprecated
```


## 6.6 Standard Events
- device_connected
- device_disconnected
- telemetry_received
- alert_raised
- task_created
- task_completed
- firmware_uploaded
- ota_started
- ota_failed
- ota_completed
- sop_published
- sync_completed


## 6.7 Sync Architecture
- **Web Local v5.1** = Master (core operations)
- **GAS v10.2** = Satellite (sync only, reports, triggers)
- **SQLite** = Source of truth with 3 layers:
  - Operational DB: users, devices, telemetry, alerts, tasks
  - Config DB: rules, firmware versions, hardware profiles
  - Audit DB: trace_event, audit_log, sync_log, error_log


## 6.8 Layer Architecture
```
Layer 1 — Device Layer
  PCB v6.3 + Firmware 9.2.1 + ESP32/sensor/actuator

Layer 2 — Ingest & Sync Layer
  MQTT ingest + GAS sync + webhook + file import/export

Layer 3 — Core Platform
  NodeJS API + SQLite + auth + device management + telemetry + alerts

Layer 4 — Agent Layer
  orchestrator + firmware agent + farm ops agent + QA/SOP agent + traceability agent

Layer 5 — Web Local UI
  dashboard + devices + alerts + firmware + reports + settings
```


---

# Practical Conclusion

- Use ISO as discipline framework for process, audit, traceability, and change control.
- Use contract-first for technical.
- Use offline-first for operations.
- Use human + AI readable for product.
- End goal: system that is simple, synchronized, reliable, easy to operate, easy to scale, and commercializable.

**Start by:**
1. reading repo structure
2. identifying real architecture
3. pointing out the biggest misalignments
4. proposing the shortest but most effective standardization roadmap

---

# Addendum — Layer Role Assignment (v2)

## Role Definition

| Layer | Role | Use Case |
|-------|------|----------|
| **Google Sheets** | Admin Dashboard | Product management, pricing, firmware catalog, board versions, dealer mapping, OTA schedule, operational checklists, internal approval tables |
| **GAS v10.2** | Automation Bridge | Sync, import/export, OTA approval, notifications, report generation, form handlers, cron triggers |
| **Web Local v5.1** | Operations Center | Real-time dashboard, telemetry, alerts, AI tasks, traceability, direct device control |
| **SQLite** | Source of Truth | Real-time state, audit log, tasks, alerts, devices, firmware, trace events |

## Mental Model
```
Sheets = Control Panel (bảng điều hành)
GAS = Automated Hand (tay tự động)
SQLite = Ledger (sổ cái)
Web Local = Command Center (trung tâm tác chiến)
```

## Google Sheets Structure (6 tabs)
```
Products     → product_id, name, price, status
Firmware     → fw_version, board_id, release_status, changelog
Boards       → board_id, model, compatible_sensors
Devices      → device_id, board_id, site_id, zone_id
OTA_Jobs     → job_id, device_id, fw_version_from, fw_version_to, status, initiated_by, approved_by
Dealers      → dealer_id, name, region, contact
```

**Key rule**: Always use ID as key, never free-text names.

## Sync Boundaries

### Sheets → SQLite (Push)
- Product catalog updates
- Firmware release info
- Pricing updates
- Board/device mapping

### SQLite → Sheets (Pull)
- Report exports
- OTA status reflection
- Operation logs
- Pending approval tasks

### Web Local ↔ SQLite (Direct)
- Telemetry
- Alerts
- Agent operations
- Trace events
- Real-time dashboard

**Warning**: NEVER let Sheets become the core data source. GAS should only bridge, NOT process.

## GAS v10.2 Boundaries

**DO**:
- Automation scripts
- Data sync (Sheets ↔ SQLite)
- Import/export
- OTA job creation/approval
- Notifications (email, Telegram)
- Report generation
- Form handlers
- Cron triggers

**DON'T**:
- Heavy telemetry processing
- Complex orchestration
- Large rule engine
- Real-time dashboard backend

## OTA Job States
```
draft → approved → scheduled → pushing → success | failed → rolled_back
```

Each job MUST have:
- device_id
- board_id
- fw_version_from
- fw_version_to
- initiated_by
- approved_by
- trace_id

## Risk Prevention

1. **Sheets as core data** → PREVENT: Use Sheets only for config/catalog, SQLite for operational data
2. **GAS with too much logic** → PREVENT: Keep GAS as bridge/automation, not backend
3. **OTA/version chaos** → PREVENT: Use version manifest, release status, board compatibility matrix, audit trail

---
