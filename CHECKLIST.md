# EcoSynTech Standardization Checklist

## Fix Priority Order (chapters)
1. Schema dữ liệu lõi (Core Data Schema)
2. Firmware payload & device handshake
3. Telemetry ingest & alert
4. Task/agent contract
5. GAS sync
6. UI mapping
7. Traceability + audit
8. Báo cáo và SOP

---

## Chapter 1: Core Data Schema ✓ Priority

### 1.1 Create Standard Entities
- [ ] Define site table schema (id, name, location, status, trace_id)
- [ ] Define device table schema (id, site_id, device_type, fw_version, board_id, status)
- [ ] Define zone table schema (id, site_id, name, bounds)
- [ ] Define telemetry table schema (device_id, ts, metrics JSON, signal JSON)
- [ ] Define alert table schema (device_id, type, severity, status, acknowledged_by)
- [ ] Define task table schema (id, type, device_id, status, payload, result)
- [ ] Define trace_event table schema (entity_type, entity_id, action, user, ts, before, after)

### 1.2 Standardize ID Convention
- [ ] Enforce site_id format: site_{region}_{number}
- [ ] Enforce device_id format: {type}_{number}
- [ ] Enforce zone_id format: zone_{letter} or zone_{name}
- [ ] Enforce trace_id format: {entity}_{timestamp}_{random}

### 1.3 Add Common Fields
- [ ] All tables: add created_at, updated_at
- [ ] All tables: add status field
- [ ] All tables: add trace_id for audit

---

## Chapter 2: Firmware ↔ Web Local

### 2.1 Telemetry Payload Standardization
- [ ] Verify firmware sends: device_id, site_id, zone_id, ts, metrics, fw_version, signal
- [ ] Create adapter if format differs (don't rewrite firmware blindly)
- [ ] Document exact JSON schema in docs/technical/

### 2.2 Device Handshake
- [ ] Define connection protocol (MQTT/TCP/HTTP)
- [ ] Define device registration flow
- [ ] Define heartbeat interval
- [ ] Define offline detection threshold

### 2.3 OTA Handshake
- [ ] Define firmware version check endpoint
- [ ] Define download protocol
- [ ] Define verify/install flow
- [ ] Define rollback mechanism

### 2.4 Alert Format
- [ ] Standardize alert payload: device_id, type, severity, message, ts
- [ ] Map firmware alert codes to web local alert types

---

## Chapter 3: PCB ↔ Firmware

### 3.1 Hardware Profile
- [ ] Create hardware profile JSON for PCB v6.3
- [ ] Define sensor pin mapping
- [ ] Define actuator pin mapping
- [ ] Define power specifications
- [ ] Define brownout behavior

### 3.2 Boot Sequence
- [ ] Document boot order
- [ ] Define watchdog settings
- [ ] Define recovery pins

### 3.3 Compatibility Matrix
- [ ] Map firmware 9.2.1 to PCB v6.3
- [ ] Document supported sensor types
- [ ] Document supported actuator types

---

## Chapter 4: Web Local ↔ GAS

### 4.1 Define GAS Role
- [ ] GAS = Satellite (sync/reporting/triggers only)
- [ ] NOT core logic
- [ ] Document what GAS can/cannot do

### 4.2 Sync Contract
- [ ] Define what web local sends to GAS
- [ ] Define what GAS returns to web local
- [ ] Define sync schedule
- [ ] Define retry mechanism
- [ ] Define conflict resolution

### 4.3 API Boundaries
- [ ] Document web local API endpoints
- [ ] Document GAS entry points
- [ ] Enforce: web local is master, GAS is satellite

---

## Chapter 5: Database (SQLite)

### 5.1 Layer Separation
- [ ] Operational DB: users, devices, telemetry, alerts, tasks
- [ ] Config DB: rules, firmware versions, hardware profiles, agent manifests
- [ ] Audit DB: trace_event, audit_log, sync_log, error_log

### 5.2 Migration Strategy
- [ ] Document schema version
- [ ] Create migration scripts
- [ ] Define rollback procedure

### 5.3 Indexing
- [ ] Index: device_id, site_id on telemetry
- [ ] Index: status on alerts, tasks
- [ ] Index: ts on trace_event

---

## Chapter 6: Agent Layer

### 6.1 Agent Contracts
- [ ] Define orchestrator responsibilities
- [ ] Define firmware agent: OTA, version check
- [ ] Define farm ops agent: task scheduling
- [ ] Define QA/SOP agent: compliance check
- [ ] Define traceability agent: event logging

### 6.2 Task Schema
- [ ] Standardize task payload: id, type, device_id, payload, status, result
- [ ] Define task state machine: queued → running → completed/failed/cancelled

### 6.3 Message Format
- [ ] Agent ↔ Core: JSON over MQTT/HTTP
- [ ] Include trace_id in all messages

---

## Chapter 7: UI Mapping

### 7.1 Page Structure
- [ ] Dashboard: overview, alerts, quick actions
- [ ] Devices: list, detail, config
- [ ] Alerts: list, detail, acknowledge
- [ ] Firmware: list, upload, deploy
- [ ] Reports: generate, export
- [ ] Settings: site, users, sync

### 7.2 API ↔ UI Mapping
- [ ] Map each UI action to API endpoint
- [ ] Document required permissions
- [ ] Define offline UI behavior

---

## Chapter 8: Traceability & Audit

### 8.1 Event Logging
- [ ] Log every entity state change
- Log format:
```json
{
  "trace_id": "device_esp32_014_20260507",
  "entity_type": "device",
  "entity_id": "esp32_014",
  "action": "status_changed",
  "before": "offline",
  "after": "online",
  "user": "system",
  "ts": "2026-05-07T10:15:00+07:00"
}
```

### 8.2 Audit Requirements
- [ ] Who changed what, when, why
- [ ] Immutable log (append only)
- [ ] Export capability

---

## Chapter 9: Reports & SOP

### 9.1 Report Types
- [ ] Daily telemetry summary
- [ ] Alert history
- [ ] Device uptime
- [ ] Task completion rate

### 9.2 SOP Management
- [ ] SOP document structure
- [ ] Version control
- [ ] Approval workflow

---

## Verification Checklist

After each fix, verify:
- [ ] Data flows correctly between layers
- [ ] No data loss in sync
- [ ] States are consistent
- [ ] IDs are unique and properly formatted
- [ ] Traceability is intact
- [ ] Offline mode still works
- [ ] No breaking changes to existing functionality

---

## Notes

- **Don't rewrite code blindly**: Use adapters for format conversion
- **Always document changes**: Update docs/technical/
- **Test after each fix**: Verify end-to-end flow
- **Keep backward compatibility**: Unless explicitly agreed

For questions, refer to CLAUDE.en.md Platform Contract section.
