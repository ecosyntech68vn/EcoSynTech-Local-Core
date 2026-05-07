# EcoSynTech Farm OS - Product Architecture

## Product Naming Convention

| Internal Code | Product Name | Target Segment |
|---------------|--------------|----------------|
| GAS | EcoSynTech Cloud V10.2 | Cloud Management Platform |
| Web Local | EcoSynTech Global Core | Edge Operations Platform |
| Mobile PWA | EcoSynTech Mobile Pro | Field Operations App |

---

## Four Product Tiers

### 1. EcoSynTech BASE
**Target:** Small farms, individual users, beginners

```
┌─────────────────────────────────────────────┐
│           EcoSynTech Cloud V10.2            │
│     (Full Backend + Display + Storage)      │
└─────────────────────────────────────────────┘
```

| Aspect | Details |
|--------|---------|
| **Primary Platform** | EcoSynTech Cloud V10.2 |
| **Display** | Cloud Dashboard (Sheets-based) |
| **Telemetry Storage** | Google Sheets / Properties |
| **Device Limit** | Up to 10 devices |
| **Features** | Basic monitoring, manual alerts, basic reports |
| **Support** | Email (24h response) |
| **SLA** | 99% uptime |

---

### 2. EcoSynTech PRO
**Target:** Medium farms, cooperatives, growing businesses

```
┌─────────────────────────────────────────────┐
│          EcoSynTech Global Core            │
│        (Primary Operations Platform)        │
└─────────────────────────────────────────────┘
                    │
                    ▼ (Auto-failover)
┌─────────────────────────────────────────────┐
│           EcoSynTech Cloud V10.2            │
│      (Management + Administration)         │
└─────────────────────────────────────────────┘
```

| Aspect | Details |
|--------|---------|
| **Primary Platform** | EcoSynTech Global Core |
| **Backup Platform** | EcoSynTech Cloud V10.2 |
| **Display** | Web Dashboard |
| **Telemetry Storage** | SQLite (local) |
| **Device Limit** | Up to 50 devices |
| **Features** | Full telemetry, automation, AI agents, basic traceability |
| **Support** | Email + Chat (4h response) |
| **SLA** | 99.9% uptime |

---

### 3. EcoSynTech PROMAX
**Target:** Large farms, agricultural enterprises, franchise

```
┌─────────────────────────────────────────────┐
│          EcoSynTech Mobile Pro              │
│            (Field Operations)               │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│          EcoSynTech Global Core            │
│        (Primary Operations Platform)        │
└─────────────────────────────────────────────┘
                    │
                    ▼ (Auto-failover)
┌─────────────────────────────────────────────┐
│           EcoSynTech Cloud V10.2            │
│     (Management + Admin + Data Display)      │
└─────────────────────────────────────────────┘
```

| Aspect | Details |
|--------|---------|
| **Primary Platforms** | EcoSynTech Global Core + Mobile Pro |
| **Backup Platform** | EcoSynTech Cloud V10.2 |
| **Display** | Web + Mobile App |
| **Telemetry Storage** | SQLite (local) |
| **Device Limit** | Up to 200 devices |
| **Features** | Full operations, Mobile app, multi-zone, AI agents, full traceability |
| **Support** | Priority Chat (2h response) |
| **SLA** | 99.9% uptime |

---

### 4. EcoSynTech PREMIUM
**Target:** Enterprise, conglomerates, government projects

```
┌─────────────────────────────────────────────┐
│          EcoSynTech Mobile Pro              │
│            (Field Operations)               │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│          EcoSynTech Global Core            │
│        (Primary Operations Platform)        │
└─────────────────────────────────────────────┘
                    │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  Cloud Backup 1  │   │  Cloud Backup 2  │
│ EcoSynTech V10.2 │   │  Regional Cloud  │
└──────────────────┘   └──────────────────┘
```

| Aspect | Details |
|--------|---------|
| **Primary Platforms** | EcoSynTech Global Core + Mobile Pro |
| **Backup 1** | EcoSynTech Cloud V10.2 |
| **Backup 2** | Regional Cloud (multi-region) |
| **Display** | Web + Mobile + Cloud Dashboard |
| **Telemetry Storage** | SQLite + Cloud Archive |
| **Device Limit** | Unlimited |
| **Features** | Full enterprise, multi-site, compliance, audit, dedicated support |
| **Support** | Dedicated Manager (1h response) |
| **SLA** | 99.99% uptime |

---

## Platform Components

### EcoSynTech Cloud V10.2 (formerly GAS)
**Purpose:** Cloud Management Platform

| Function | Description |
|----------|-------------|
| OTA Administration | Firmware release, staging, approval |
| CRM | Customer accounts, onboarding, tiers |
| Dealer Management | Network, commission, territory |
| Sales Pipeline | Quotes, orders, invoices |
| Product Catalog | SKU, pricing, bundles |
| Notification Hub | Email, SMS, Telegram |
| Compliance Reports | Audit, regulatory exports |
| Data Backup | Export, archive |

---

### EcoSynTech Global Core (formerly Web Local)
**Purpose:** Edge Operations Platform

| Function | Description |
|----------|-------------|
| Real-time Dashboard | Live telemetry, alerts |
| Device Management | Register, configure, monitor |
| Alert Engine | Thresholds, notifications |
| AI Agent Orchestrator | Task scheduling, execution |
| Traceability | Audit log, chain of custody |
| Direct Control | On/Off, reset, config |
| Zone & Site Management | Hierarchical organization |
| Report Generation | Custom reports |

---

### EcoSynTech Mobile Pro (formerly Mobile PWA)
**Purpose:** Field Operations App

| Function | Description |
|----------|-------------|
| Real-time Status | View device states |
| Quick Actions | On/Off, reset |
| QR Scanning | Device lookup, traceability |
| Push Notifications | Alerts, tasks |
| Offline Sync | Works without internet |
| Photo Documentation | Issue capture |
| Location Tracking | GPS farm mapping |

---

## Feature Comparison Matrix

| Feature | BASE | PRO | PROMAX | PREMIUM |
|---------|------|-----|--------|---------|
| Real-time Dashboard | Cloud | Core | Core+Mobile | Core+Mobile+Cloud |
| Telemetry Storage | Cloud | SQLite | SQLite | SQLite+Cloud |
| Device Control | Manual | Auto | Auto+Mobile | Auto+Mobile |
| AI Agents | - | ✓ | ✓ | ✓ |
| Traceability | Basic | Full | Full | Full+Multi-site |
| OTA Management | Cloud | Cloud | Cloud | Cloud |
| CRM & Sales | Cloud | Cloud | Cloud | Cloud |
| Mobile App | - | - | ✓ | ✓ |
| Cloud Backup | - | 1 | 1 | 2 |
| Multi-site | - | - | - | ✓ |
| Compliance Reports | - | Basic | Full | Full+Audit |
| Dedicated Support | - | - | - | ✓ |
| SLA | 99% | 99.9% | 99.9% | 99.99% |

---

## Data Flow by Package

### BASE
```
Device → MQTT → Cloud V10.2 → Sheets → Dashboard
```

### PRO
```
Device → MQTT → Global Core → SQLite → Web Dashboard
              ↓ (offline)
              Cloud V10.2 → Sheets → Dashboard
```

### PROMAX
```
Device → MQTT → Global Core → SQLite → Web Dashboard
              ↓
         Mobile Pro ←─────────────────────────┘
              ↓ (offline)
              Cloud V10.2 → Sheets → Dashboard
```

### PREMIUM
```
Device → MQTT → Global Core → SQLite → Web Dashboard
              ↓                            ↓
         Mobile Pro ←─────────────────────┘
              ↓ (primary down)
         Cloud V10.2 (Backup 1)
              ↓ (region down)
         Regional Cloud (Backup 2)
```

---

## Upgrade Path

```
BASE ──► PRO ──► PROMAX ──► PREMIUM

BASE → PRO:     Add Global Core, migrate to SQLite
PRO → PROMAX:   Add Mobile Pro app
PROMAX → PREMIUM: Add regional backup, multi-site
```

---

## Summary

**EcoSynTech Farm OS** delivers four packages to match farm scale:

| Package | Best For | Key Differentiator |
|---------|----------|-------------------|
| **BASE** | Learning, small farms | Start with cloud-only |
| **PRO** | Growth, cooperatives | Full operations, local storage |
| **PROMAX** | Scale, franchises | Mobile app for field teams |
| **PREMIUM** | Enterprise, government | Multi-site, dual backup, SLA 99.99% |

All packages include EcoSynTech Cloud V10.2 for management, sales, and administration.
