# EcoSynTech Package Architecture

## Premium Product Naming

| Code Name | Product Name | Role |
|-----------|--------------|------|
| GAS | EcoSynTech Cloud V10.2 | Cloud Management Platform |
| Web Local | EcoSynTech Global Core | Edge Operations Platform |
| Mobile App | EcoSynTech Mobile Pro | Field Operations App |

---

## Package Tiers

### EcoSynTech BASE
**Target:** Small farms, individual users

```
┌─────────────────────────────────────┐
│        EcoSynTech Cloud V10.2       │
│   (Full Backend + Display + Data)   │
└─────────────────────────────────────┘
```

- Primary: EcoSynTech Cloud V10.2
- Display: Cloud Dashboard
- Telemetry: Cloud Storage
- Features: Basic monitoring, alerts, manual control

---

### EcoSynTech PRO
**Target:** Medium farms, cooperatives, small businesses

```
┌─────────────────────────────────┐
│    EcoSynTech Global Core       │
│   (Primary Operations Platform) │
└─────────────────────────────────┘
              │
              ▼ (Backup)
┌─────────────────────────────────┐
│    EcoSynTech Cloud V10.2      │
│    (Management + Administration)│
└─────────────────────────────────┘
```

- Primary: EcoSynTech Global Core
- Backup: EcoSynTech Cloud V10.2
- Display: Web Dashboard
- Features: Full telemetry, automation, AI agents, traceability

---

### EcoSynTech ENTERPRISE
**Target:** Large farms, agribusiness, franchise

```
┌─────────────────────────────────┐
│    EcoSynTech Mobile Pro        │
│      (Field Operations)         │
└─────────────────────────────────┘
              │
┌─────────────────────────────────┐
│    EcoSynTech Global Core       │
│   (Primary Operations Platform) │
└─────────────────────────────────┘
              │
       ┌──────┴──────┐
       ▼             ▼
┌──────────┐   ┌──────────┐
│  Cloud   │   │  Cloud   │
│ Backup 1 │   │ Backup 2 │
│  V10.2   │   │ (Region) │
└──────────┘   └──────────┘
```

- Primary: EcoSynTech Global Core + Mobile Pro
- Backup 1: EcoSynTech Cloud V10.2
- Backup 2: Regional Cloud
- Display: Web + Mobile + Cloud Dashboard
- Features: Full enterprise features, multi-site, compliance, audit

---

## Platform Components

### EcoSynTech Cloud V10.2 (formerly GAS)
**Purpose:** Cloud Management Platform

**Core Functions:**
- OTA Administration Platform
- Customer Relationship Management (CRM)
- Dealer Network Management
- Sales Pipeline & Quotation
- Product Catalog Management
- Pricing & Discount Management
- Compliance & Audit Reports
- Data Export & Backup
- Notification Hub (Email, SMS, Telegram)

**Storage:**
- Google Sheets (User Data, Products, Pricing)
- Google Properties (Telemetry Buffer)
- Cloud Logs (Audit Trail)

---

### EcoSynTech Global Core (formerly Web Local)
**Purpose:** Edge Operations Platform

**Core Functions:**
- Real-time Telemetry Dashboard
- Device Management (Register, Configure, Monitor)
- Alert & Notification Engine
- AI Agent Orchestration
- Task Scheduling & Execution
- Traceability & Audit Log
- Direct Device Control
- Zone & Site Management
- Report Generation

**Storage:**
- SQLite (Operational Data)
- Local Cache (Performance)

---

### EcoSynTech Mobile Pro (formerly Mobile PWA)
**Purpose:** Field Operations App

**Core Functions:**
- Real-time Status View
- Quick Actions (On/Off, Reset)
- QR Code Scanning (Device Lookup, Traceability)
- Push Notifications
- Offline Data Sync
- Photo Documentation
- Location Tracking

**Platform:** PWA (Progressive Web App)

---

## Data Flow Architecture

### BASE Package Flow
```
Sensor → MQTT → EcoSynTech Cloud V10.2 → Sheets/Properties → Dashboard
```

### PRO Package Flow
```
Sensor → MQTT → EcoSynTech Global Core → SQLite → Web Dashboard
         ↓ (offline backup)
         EcoSynTech Cloud V10.2 → Sheets → Dashboard
```

### ENTERPRISE Package Flow
```
Sensor → MQTT → EcoSynTech Global Core → SQLite → Web Dashboard
         ↓                                    ↓
    EcoSynTech Mobile Pro ←──────────────────┘
         ↓ (primary down)
    EcoSynTech Cloud V10.2 (Backup 1)
         ↓ (region down)
    Regional Cloud (Backup 2)
```

---

## Feature Comparison Matrix

| Feature | BASE | PRO | ENTERPRISE |
|---------|------|-----|------------|
| Real-time Dashboard | Cloud | Core | Core + Mobile |
| Telemetry Storage | Cloud | SQLite | SQLite |
| Device Control | Manual | Auto | Auto + Mobile |
| AI Agents | - | ✓ | ✓ |
| Traceability | Basic | Full | Full + Multi-site |
| OTA Management | Cloud | Cloud | Cloud |
| CRM & Sales | Cloud | Cloud | Cloud |
| Multi-site | - | - | ✓ |
| Mobile App | - | - | ✓ |
| Cloud Backup | - | 1 | 2 |
| Compliance Reports | - | Basic | Full |
| SLA Guarantee | 99% | 99.9% | 99.99% |

---

## Upgrade Path

```
BASE ──► PRO ──► ENTERPRISE
  │        │         │
  │        │         └─► Add Mobile App
  │        │         └─► Add Regional Cloud
  │        └────────────► Add Global Core
  │                      └─► Migrate telemetry to SQLite
  └─────────────────────► Start with Cloud only
```

---

## Administration

### EcoSynTech Cloud V10.2 Management
- Product catalog (SKU, pricing, bundles)
- Firmware releases (version, compatibility)
- Customer accounts (onboarding, tier)
- Dealer network (commission, territory)
- Sales pipeline (quotes, orders, invoices)
- OTA scheduling (staged rollout, groups)

### EcoSynTech Global Core Operations
- Site configuration (zones, devices)
- Alert rules (thresholds, notifications)
- Agent setup (tasks, schedules)
- User access (RBAC, permissions)
- System health (monitoring, logs)

---

## Support & Maintenance

| Package | Support Level | Response Time | Update Frequency |
|---------|---------------|---------------|------------------|
| BASE | Email | 24h | Monthly |
| PRO | Email + Chat | 4h | Weekly |
| ENTERPRISE | Dedicated | 1h | Real-time |

---

## Summary

EcoSynTech offers three packages to meet different farm scales:

- **BASE:** Entry level with Cloud-only, ideal for learning and small operations
- **PRO:** Full operations with Edge platform + Cloud backup, ideal for growth
- **ENTERPRISE:** Complete solution with Mobile app + dual backup, ideal for scale

All packages include EcoSynTech Cloud V10.2 for management, sales, and administration.
