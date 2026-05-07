# EcoSynTech Farm OS - Feature Entitlement & Automated OTA

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Feature Entitlement System                    │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │   BASE   │    │   PRO    │    │ PROMAX   │    │ PREMIUM  │  │
│  │   10 dev │    │   50 dev │    │  200 dev │    │ Unlimited│  │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐         ┌──────────┐         ┌──────────┐
    │Firmware │         │   GAS    │         │Web Local │
    │ (Poll)  │◄────────│(Master)  │────────►│(Online)  │
    └─────────┘   sync  └──────────┘   sync  └──────────┘
```

---

## 1. Feature Entitlement Data Model

### 1.1 Device Entitlement Schema

```json
{
  "device_id": "esp32_014",
  "site_id": "site_hcm_01",
  "package": "PRO",
  "features": [
    "telemetry",
    "auto_rules", 
    "ai_agents",
    "traceability"
  ],
  "limits": {
    "max_devices": 50,
    "max_zones": 10,
    "max_api_calls_per_day": 10000,
    "max_telemetry_per_minute": 60,
    "max_alerts": 100
  },
  "upgrade_code": null,
  "package_expires": null,
  "entitled_at": "2026-01-15T10:00:00+07:00",
  "last_sync": "2026-05-07T10:00:00+07:00"
}
```

### 1.2 Feature Flags

| Feature Flag | Description | BASE | PRO | PROMAX | PREMIUM |
|--------------|-------------|------|-----|--------|---------|
| `telemetry_basic` | Basic sensor data | ✓ | ✓ | ✓ | ✓ |
| `telemetry_realtime` | Real-time streaming | - | ✓ | ✓ | ✓ |
| `control_manual` | Manual on/off | ✓ | ✓ | ✓ | ✓ |
| `control_auto` | Automatic rules | - | ✓ | ✓ | ✓ |
| `ai_agents` | AI orchestration | - | ✓ | ✓ | ✓ |
| `traceability_basic` | Basic logging | - | ✓ | ✓ | ✓ |
| `traceability_full` | Full chain of custody | - | - | ✓ | ✓ |
| `mobile_app` | Mobile access | - | - | ✓ | ✓ |
| `multi_site` | Multi-site management | - | - | - | ✓ |
| `priority_support` | Dedicated support | - | - | - | ✓ |

### 1.3 Entitlement Check Response

```json
{
  "valid": true,
  "package": "PRO",
  "features": {
    "telemetry_basic": true,
    "telemetry_realtime": true,
    "control_manual": true,
    "control_auto": true,
    "ai_agents": true,
    "traceability_basic": true,
    "traceability_full": false,
    "mobile_app": false,
    "multi_site": false,
    "priority_support": false
  },
  "limits": {
    "max_devices": 50,
    "devices_used": 12,
    "remaining": 38
  },
  "sync_interval_minutes": 60,
  "next_sync": "2026-05-07T11:00:00+07:00"
}
```

---

## 2. Automated OTA System

### 2.1 Daily Poll Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        DAILY OTA CYCLE                          │
│                                                                   │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐     │
│  │  Poll   │───►│  Check  │───►│  Fetch  │───►│ Apply   │     │
│  │ Request │    │  Update │    │  FW     │    │  Update │     │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘     │
│                                                                   │
│  Time: Daily (configurable: 1h, 6h, 12h, 24h)                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Poll Request (Device → GAS)

```json
{
  "action": "ota_poll",
  "device_id": "esp32_014",
  "firmware_version": "9.2.1",
  "board_id": "pcb_v6_3",
  "package": "PRO",
  "last_poll": "2026-05-06T10:00:00+07:00",
  "device_status": "online",
  "free_heap": 45200,
  "uptime_seconds": 86400
}
```

### 2.3 Poll Response (GAS → Device)

```json
{
  "action": "ota_response",
  "update_available": true,
  "firmware": {
    "version": "9.2.2",
    "size_bytes": 1048576,
    "sha256": "a1b2c3d4e5f6...",
    "release_type": "patch",  // patch | minor | major
    "changelog": [
      "Fixed sensor drift in high humidity",
      "Improved OTA stability",
      "Added watchdog for network drops"
    ],
    "force_update": false,
    "min_battery_percent": 30,
    "min_free_heap": 30000
  },
  "download": {
    "url": "https://storage.ecosyntech.vn/fw/9.2.2/esp32_014.bin",
    "signature": "sha256:abc123...",
    "expires_at": "2026-05-08T10:00:00+07:00",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2.4 Security Verification Chain

```
1. URL VALIDATION
   ├── Verify JWT token signature
   ├── Check token expiration (max 48h)
   └── Validate device_id in token matches request

2. DOWNLOAD VERIFICATION
   ├── HTTPS (TLS 1.2+)
   ├── Content-Type: application/octet-stream
   └── Content-Length matches header

3. FIRMWARE INTEGRITY
   ├── SHA256 hash verification
   ├── Signature verification (if signed)
   └── Header magic bytes check (0xE9)

4. VERSION CHECK
   ├── Prevent downgrade attacks
   ├── Verify board compatibility
   └── Check minimum version requirements
```

### 2.5 Dual-Partition Rollback

```
┌─────────────────────────────────────────────────────────────────┐
│                     ESP32 DUAL PARTITION                         │
│                                                                  │
│  ┌─────────────────┐      ┌─────────────────┐                    │
│  │   PARTITION A   │      │   PARTITION B   │                    │
│  │   Firmware 9.2.1│◄────►│   Firmware 9.2.2│                    │
│  │   (Active)      │      │   (Updating)    │                    │
│  └─────────────────┘      └─────────────────┘                    │
│                                                                  │
│  Boot Sequence:                                                  │
│  1. Try boot partition B                                        │
│  2. If fail → try partition A                                   │
│  3. If both fail → stay in bootloader recovery                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.6 OTA State Machine

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐
│  IDLE   │───►│ CHECKING │───►│ DOWNLOAD  │───►│VERIFYING │
└─────────┘    └──────────┘    └───────────┘    └──────────┘
                                            │
                                            ▼
              ┌──────────┐    ┌───────────┐    ┌──────────┐
              │  FAILED  │◄───│ APPLYING  │───►│  ACTIVE  │
              └──────────┘    └───────────┘    └──────────┘
                    │
                    ▼
              ┌──────────┐
              │ROLLBACK │
              └──────────┘
```

---

## 3. Package Upgrade Flow

### 3.1 Upgrade Trigger

```
1. Customer purchases upgrade (via Sales/CRM)
2. Admin updates package in GAS
3. GAS generates upgrade_code for device
4. Device polls → receives upgrade_code
5. Device unlocks features automatically
```

### 3.2 Upgrade Code Generation

```json
{
  "upgrade_code": "UPG-PROMAX-20260507-ABC123",
  "device_id": "esp32_014",
  "from_package": "PRO",
  "to_package": "PROMAX",
  "features_to_unlock": ["mobile_app", "traceability_full"],
  "created_by": "admin@ecosyntech.vn",
  "created_at": "2026-05-07T10:00:00+07:00",
  "expires_at": "2026-05-14T10:00:00+07:00",
  "used_at": null
}
```

### 3.3 Auto-Unlock Logic

```
Device Poll → Check upgrade_code
    │
    ├── If upgrade_code exists AND not expired
    │   └── Update package in device config
    │   └── Set features[feature_flag] = true
    │   └── Mark upgrade_code as used
    │   └── Log "Package upgraded to PROMAX"
    │
    └── If no upgrade_code
        └── Use current package features
```

---

## 4. Auto-Operation Rules

### 4.1 Automation Levels

| Automation | Trigger | Action | Human Needed |
|------------|---------|--------|--------------|
| **Telemetry** | Sensor data | Auto-collect, auto-store | No |
| **Alerts** | Threshold breach | Auto-detect, auto-notify | Acknowledge |
| **AI Agents** | Schedule/event | Auto-execute | Override only |
| **OTA - Patch** | Daily poll | Auto-download, auto-apply | No |
| **OTA - Minor** | Staged rollout | Auto after 24h staging | Approve first |
| **OTA - Major** | New release | Require approval | Approve then auto |
| **Entitlements** | Package upgrade | Auto-unlock | No |
| **Reports** | Schedule | Auto-generate | Review |
| **Backups** | Daily | Auto-sync | No |

### 4.2 Self-Healing Rules

```
Device Offline > 1 hour:
  → Send alert to owner
  → Log event in trace

Device Offline > 24 hours:
  → Send reboot command (if possible)
  → Escalate to higher priority alert

Device Offline > 72 hours:
  → Create support ticket
  → Notify dealer/technician

Sensor Stuck (no change > 24h):
  → Auto-calibration trigger
  → Log calibration event

Memory Low (free_heap < 10000):
  → Flush local buffers
  → Prioritize critical telemetry

Network Error > 10 consecutive:
  → Switch to offline mode
  → Increase poll interval
```

---

## 5. Integration Points

### 5.1 GAS ↔ Firmware

```
Endpoint: /api/ota/poll
Method: POST
Auth: Device token (JWT)
Rate: Configurable (default 1h)
```

### 5.2 GAS ↔ Web Local

```
Endpoint: /api/devices/{id}/entitlement
Method: GET
Auth: API key / JWT
Sync: On device connect, on demand
```

### 5.3 Web Local ↔ Firmware

```
When online: Sync entitlement from GAS
When offline: Use cached entitlement
Cache TTL: 24 hours
```

---

## 6. Monitoring & Audit

### 6.1 Entitlement Audit Log

```json
{
  "trace_id": "entitlement_20260507_001",
  "event": "package_upgrade",
  "device_id": "esp32_014",
  "from_package": "PRO",
  "to_package": "PROMAX",
  "triggered_by": "sales_system",
  "approved_by": "admin@ecosyntech.vn",
  "timestamp": "2026-05-07T10:00:00+07:00"
}
```

### 6.2 OTA Audit Log

```json
{
  "trace_id": "ota_20260507_002",
  "event": "firmware_update",
  "device_id": "esp32_014",
  "from_version": "9.2.1",
  "to_version": "9.2.2",
  "release_type": "patch",
  "download_time_seconds": 45,
  "verify_time_seconds": 2,
  "apply_time_seconds": 30,
  "result": "success",
  "timestamp": "2026-05-07T10:15:00+07:00"
}
```

### 6.3 Dashboard Metrics

- Devices by package (BASE/PRO/PROMAX/PREMIUM)
- Feature usage by type
- OTA success/failure rate
- Average poll latency
- Upgrade conversion rate

---

## 7. Summary

| Component | Behavior |
|-----------|----------|
| **Feature Entitlement** | GAS master → Firmware poll → Auto-unlock |
| **OTA** | Daily poll → Verify → Download → Apply → Rollback if fail |
| **Package Upgrade** | Generate code → Device poll → Auto-apply |
| **Self-Healing** | Auto-alert → Auto-reboot → Auto-ticket |
| **Human Role** | Approve major OTA, review reports, handle exceptions only |

The system operates with **minimal human intervention** while maintaining **full auditability** and **rollback capability**.
