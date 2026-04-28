# EcoSynTech Local Core V5.1
### Ultra-Intelligent AI System for Smart Agriculture

[![ISO 27001](https://img.shields.io/badge/ISO-27001-2022-Compliant-green)](https://github.com/ecosyntech68vn/EcoSynTech-Local-Core)
[![Node.js](https://img.shields.io/badge/Node.js-18+-yellow)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-purple)](LICENSE)

---

## 📋 MỤC LỤC

1. [Giới thiệu](#giới-thiệu)
2. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
3. [Các mảng tính năng](#các-mảng-tính-năng)
4. [Bảo mật](#bảo-mật)
5. [Kết nối & Tích hợp](#kết-nối--tích-hợp)
6. [Bắt đầu](#bắt-đầu)
7. [Cấu trúc dự án](#cấu-trúc-dự-án)
8. [Đóng góp](#đóng-góp)
9. [Liên hệ](#liên-hệ)

---

## 1. Giới thiệu

EcoSynTech Local Core là hệ thống phần mềm **on-premises** cho nông nghiệp thông minh, cung cấp:

- 📡 **Quản lý thiết bị IoT** - ESP32, sensors, actuators
- 🤖 **AI/ML Engine** - Dự đoán tưới tiêu, phát hiện sâu bệnh
- 📊 **Dashboard** - Real-time monitoring với light/dark mode
- 🔐 **Bảo mật** - 3-layer authentication, ISO 27001 compliant
- 🔄 **Tự động hóa** - Smart automation rules
- 🌐 **API** - RESTful APIs với JWT authentication

### Tiêu chuẩn áp dụng

| Tiêu chuẩn | Mô tả |
|-----------|-------|
| **ISO 27001:2022** | Information Security Management |
| **5S** | Sort, Set, Shine, Standardize, Sustain |
| **PDCA** | Plan-Do-Check-Act continuous improvement |
| **5W1H** | What, Why, Who, Where, When, How |

### Thống kê Code

| Chỉ số | Giá trị |
|--------|---------|
| **Tổng file JS** | 287 files |
| **Tổng dòng code** | ~44,554 lines |
| **Trung bình** | ~155 lines/file |
| **Modules** | 17 main modules |
| **API Endpoints** | 40+ routes |

### Cấu trúc Modules

| Module | Files | Lines | Mô tả |
|--------|-------|-------|-------|
| `services/` | 51 | 10,644 | Business logic, IoT, AI services |
| `routes/` | 43 | 9,073 | REST API endpoints |
| `skills/` | 80 | 7,780 | AI skills & capabilities |
| `config/` | 9 | 2,487 | Configuration & database |
| `modules/` | 12 | 2,020 | Core modules (auth, sync, etc.) |
| `middleware/` | 21 | 1,672 | Auth, security, validation |
| `ops/` | 8 | 1,294 | Operations & maintenance |
| `bootstrap/` | 2 | 373 | System bootstrap |
| Root entry points | 10 | 43,527 | server.js, app.js, bootstrap.js |

---

## 2. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────┬─────────────────────┬─────────────────────────────────┤
│   Web Dashboard │   Mobile App       │   ESP32 Firmware               │
│   (Light/Dark)  │   (Responsive)      │   (HMAC Auth)                  │
└────────┬────────┴──────────┬─────────┴────────────┬──────────────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Express.js Server                                                      │
│  ├── Rate Limiting (100 req/15min)                                     │
│  ├── Auth Middleware (JWT, HMAC, API Key)                               │
│  ├── Account Lockout (5 attempts → 15min lock)                        │
│  └── Request ID (traceability)                                          │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                              │
├────────────────┬───────────────┬──────────────┬───────────────────────┤
│ Device Mgmt    │ AI/ML Engine  │ Automation   │ Data Processing      │
│ - CRUD Devices │ - AIManager   │ - Rules      │ - Ingest Queue        │
│ - Status       │ - Predictions │ - Schedules  │ - Cache (Redis)       │
│ - Provisioning │ - Optimization│ - Triggers   │ - SQLite DB           │
└────────────────┴───────────────┴──────────────┴───────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                      │
├────────────────┬─────────────────────┬─────────────────────────────────┤
│ SQLite (WAL)   │ Redis Cache         │ Ingest Queue                   │
│ - Devices      │ - Session           │ - 10k buffer                   │
│ - Sensors      │ - API responses     │ - Batch 100                    │
│ - Rules        │ - Model cache       │ - Retry 3x                     │
└────────────────┴─────────────────────┴─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       IoT INTEGRATION LAYER                             │
├────────────────┬─────────────────────┬─────────────────────────────────┤
│ MQTT (Mosquitto) │ WebSocket         │ Google Apps Script             │
│ - Subscribe     │ - Real-time push   │ - Device secrets sync         │
│ - Publish       │ - Dashboard live  │ - Cloud backup                │
└────────────────┴─────────────────────┴─────────────────────────────────┘
```

---

## 3. Các mảng tính năng

### 3.1 Quản lý Thiết bị (Device Management)
- Đăng ký/huỷ đăng ký thiết bị
- Theo dõi trạng thái online/offline
- Firmware version tracking
- HMAC signature verification

### 3.2 Thu thập dữ liệu (Data Collection)
- **Ingest Queue**: Buffer 10,000 readings
- **Batch Processing**: 100 records/flush
- **Auto-retry**: 3 attempts on failure
- **Sensor types**: Temperature, Humidity, Soil moisture, Light, pH, EC, CO2

### 3.3 AI/ML Engine
- **Irrigation Prediction**: Dự đoán nhu cầu tưới
- **Pest Detection**: Phát hiện sâu bệnh
- **Model Management API**: CRUD models, versioning, performance tracking
- **Model Management Endpoints:**
  ```
  GET    /api/ai-models         - List all models
  GET    /api/ai-models/:id    - Get model details
  POST   /api/ai-models        - Register new model (admin)
  PUT    /api/ai-models/:id/deploy - Deploy model
  PUT    /api/ai-models/:id/retire - Retire model
  GET    /api/ai-models/:id/performance - Get metrics
  ```

### 3.4 Tự động hóa (Automation)
- Rule-based automation
- Schedule management
- Trigger actions (irrigation, lighting, fertilization)

### 3.5 Dashboard
- **Real-time monitoring**
- **Light/Dark mode** với system preference detection
- **Responsive design** - Mobile-first
- **Accessibility** - Font size 16px, high contrast

### 3.6 Feature Flags (Frugal Innovation)
Hệ thống tối ưu bộ nhớ với profile-based features:

| Profile | RAM | Use Case |
|---------|-----|----------|
| `minimal` | ~130MB | Core API only |
| `basic` | ~260MB | IoT + WebSocket |
| `standard` | ~320MB | Full (trừ AI) |
| `ai` | ~750MB | AI enabled |
| `full` | ~905MB | Tất cả features |

**Sử dụng:**
```bash
# Copy profile .env và chạy
cp .env.minimal .env && npm start
# Hoặc set biến PROFILE
PROFILE=standard npm start
```

---

## 4. Bảo mật

### 4.1 3-Layer Authentication
```
Layer 1: Firmware (ESP32) → HMAC Signature
Layer 2: Web Local → JWT Token  
Layer 3: GAS → Google Apps Script Hybrid
```

### 4.2 Account Lockout (ISO 27001 A.9.4.3)
- Max login attempts: **5**
- Lockout duration: **15 minutes**
- Auto-unlock after timeout

### 4.3 Security Features
| Feature | Implementation |
|---------|----------------|
| Access Control | Role-based (admin, manager, user) |
| Session Management | JWT + SESSION_TIMEOUT (30 min) |
| Rate Limiting | 100 requests/15 minutes |
| Audit Trail | Hash-based tamper-proof logging |
| Data Protection | Encryption middleware |
| API Security | API Key + HMAC verification |

### 4.4 ISO 27001 Controls
- **A.5.23** - Information security policies
- **A.8.25** - Secure engineering principles
- **A.8.34** - Web filtering/proxy (Redis caching)
- **A.9.4.3** - Password management (account lockout)
- **A.12.3** - Information backup (Ingest queue + auto-backup)
- **A.12.4** - Logging and monitoring
- **A.16** - Management of security incidents

---

## 5. Kết nối & Tích hợp

### 5.1 IoT Protocols
| Protocol | Port | Use Case |
|----------|------|----------|
| **MQTT** | 1883 | Sensor data, device commands |
| **WebSocket** | 3000 | Real-time dashboard updates |
| **HTTP/REST** | 3000 | API endpoints |

### 5.2 External Integrations
- **Google Apps Script (GAS)**: Device secrets sync, cloud backup
- **Telegram**: Alert notifications
- **Zalo**: Customer notifications (optional)

### 5.3 Deployment Options
```bash
# Docker (Recommended)
docker-compose up -d

# Windows 1-click
run install.bat

# Node.js direct
npm start
```

---

## 6. Bắt đầu

### Yêu cầu
- Node.js 18+
- npm 9+
- Git

### Cài đặt
```bash
# Clone repo
git clone https://github.com/ecosyntech68vn/EcoSynTech-Local-Core.git
cd EcoSynTech-Local-Core

# Install dependencies
npm install

# Run migrations
npm run migrate

# Start server
npm start
```

### Environment Variables
| Variable | Default | Mô tả |
|----------|---------|-------|
| `NODE_ENV` | development | Environment mode |
| `PORT` | 3000 | Server port |
| `JWT_SECRET` | - | JWT secret (required in production) |
| `MAX_LOGIN_ATTEMPTS` | 5 | Account lockout threshold |
| `CACHE_TTL` | 60000 | Cache TTL (ms) |
| `REDIS_URL` | - | Redis connection URL |

---

## 7. Cấu trúc dự án

```
EcoSynTech-Local-Core/
├── src/
│   ├── middleware/           # Express middlewares
│   │   ├── auth.js          # Authentication + Lockout
│   │   ├── deviceAuth.js    # HMAC verification
│   │   ├── i18n.js          # Internationalization
│   │   └── cacheService.js  # Cache management
│   ├── routes/              # API routes (40+ endpoints)
│   │   ├── aiModels.js      # AI Model Management
│   │   ├── devices.js      # Device CRUD
│   │   ├── sensors.js      # Sensor data
│   │   └── auth.js         # Authentication
│   ├── services/           # Business logic
│   │   ├── ingestQueue.js  # Data buffering
│   │   └── ai/             # AI/ML services
│   ├── config/             # Configuration
│   ├── i18n/              # Translations (EN/VN/ZH)
│   └── server/             # Modular server
├── public/                  # Dashboards
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md     # Architecture diagrams
│   └── DATA_FLOW.md       # Data flow documentation
├── docker-compose.yml      # Production deployment
├── server.js               # Entry point
└── README.md              # This file
```

---

## 8. Đóng góp

1. Tạo feature branch: `git checkout -b feature/your-feature`
2. Thực hiện thay đổi và viết tests
3. Đảm bảo CI passes: `npm run lint && npm test`
4. Tạo Pull Request vào main branch

---

## 9. Liên hệ

- **Maintainer**: EcoSynTech Engineering Team
- **Email**: info@ecosyntech.com
- **Website**: https://ecosyntech.com
- **GitHub**: https://github.com/ecosyntech68vn/EcoSynTech-Local-Core

---

*EcoSynTech Local Core - Empowering Vietnamese Smart Agriculture* 🚀