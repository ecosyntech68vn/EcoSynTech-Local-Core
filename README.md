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
| **Tổng file JS** | 290+ files |
| **Tổng dòng code** | ~50,000+ lines |
| **Trung bình** | ~160 lines/file |
| **Modules** | 20+ main modules |
| **API Endpoints** | 60+ routes |
| **Database Tables** | 40+ tables |

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

### 3.5 Quản lý Chu kỳ Cây trồng (Crop Cycle Management)
- **Crop Templates**: Lúa, Dưa leo, Cà chua, Ớt, Dưa hấu, Bắp, Đậu xanh
- **Giai đoạn cây trồng**: Gieo hạt → Cây con → Sinh trưởng → Ra hoa → Thu hoạch
- **Tính KC tự động**: Hệ số cây trồng (Kc) theo từng giai đoạn
- **Dự báo ngày thu hoạch**: Tự động tính toán dựa trên template
- **Tính nhu cầu tưới tiêu**: ETC = ETo × Kc
- **API Endpoints:**
  ```
  GET/POST /api/crops/plantings/v2      - Quản lý lô trồng
  GET  /api/crops/irrigation/:id        - Tính nhu cầu tưới
  GET  /api/crops/stats                 - Thống kê cây trồng
  POST /api/crops/harvest/:id           - Ghi nhận thu hoạch
  GET  /api/crops/timeline/:id          - Timeline các giai đoạn
  POST /api/crops/advance-stage/:id     - Chuyển giai đoạn
  ```

### 3.6 Truy xuất Nguồn gốc & QR Code (Traceability)
- **Tự động tạo batch**: Khi khởi tạo vụ mới (crop/aquaculture)
- **Timeline liền mạch**: Gieo trồng → Hoạt động nông nghiệp → Thu hoạch → Cung ứng
- **QR Code đầy đủ**: Bao gồm dữ liệu cây trồng, hoạt động, cảm biến
- **Liên kết Supply Chain**: Tự động tạo đơn hàng khi thu hoạch
- **API Endpoints:**
  ```
  POST /api/crops/plantings/:id/traceability  - Tạo/sync traceability
  GET  /api/crops/traceability/batch/:code    - Dữ liệu QR đầy đủ
  GET  /api/crops/traceability/batches        - Danh sách batch
  POST /api/crops/plantings/:id/supply-chain  - Tạo supply chain
  GET  /api/crops/traceability/:batchCode/full - Full traceability + activities
  ```

### 3.7 Hoạt động Nông nghiệp (Farm Activities)
Ghi nhận các sự kiện thủ công của nông dân:
- 💧 **Phun thuốc** (spray)
- 🌱 **Bón phân** (fertilizer)
- ✂️ **Cắt tỉa** (pruning)
- 💉 **Tiêm phòng** (vaccination)
- 🚿 **Tưới nước** (watering)
- 🪴 **Làm đất** (soil_preparation)
- 🐛 **Phòng trừ sâu bệnh** (pest_control)
- 👁️ **Giám sát** (monitoring)

Tự động sync vào **traceability stages** cho QR code.
- **API Endpoints:**
  ```
  GET/POST    /api/crops/activities              - CRUD hoạt động
  PUT/DELETE  /api/crops/activities/:id          - Cập nhật/xóa
  GET         /api/crops/activities/stats        - Thống kê chi phí
  GET         /api/crops/activities/timeline     - Timeline theo vụ
  GET/POST    /api/crops/plantings/:id/activities - Theo lô trồng
  ```

### 3.8 Hệ thống Module Nông nghiệp Đa dạng (Farm Modules)
Hệ thống dashboard tổng hợp cho nhiều loại hình nông nghiệp:

| Module | Icon | Mô tả | Database |
|--------|------|-------|----------|
| **Crops** | 🌾 | Cây trồng đồng ruộng | crop_plantings |
| **Aquaculture** | 🐟 | Thủy sản (tôm, cá) | aquaculture_spawning |
| **Greenhouse** | 🏡 | Nhà màng/ nhà kính | greenhouse_zones |
| **Hydroponics** | 💧 | Thủy canh (không đất) | hydroponic_systems |
| **Livestock** | 🐄 | Chăn nuôi (bò, heo, gà) | livestock_batches |
| **Aeroponics** | 💨 | Khí canh | aeroponic_systems |

**Đặc điểm:**
- Kiến trúc modular - dễ dàng thêm module mới
- Thống kê tổng hợp cross-module
- Timeline liên kết xuyên suốt
- Tự động tạo traceability cho mọi module

**API Endpoints:**
  ```
  GET  /api/crops/modules                  - Danh sách modules
  GET  /api/crops/dashboard               - Dashboard tổng hợp
  GET  /api/crops/module/:id/units        - Đơn vị theo module
  GET  /api/crops/module/:id/stats        - Thống kê module
  POST /api/crops/module/:id/units        - Tạo đơn vị mới
  DELETE /api/crops/module/:id/units/:uid - Xóa đơn vị
  GET  /api/crops/module/:id/timeline/:uid - Timeline chi tiết
  ```

### 3.9 Dashboard UI
- **dashboard.html**: Dashboard giám sát thiết bị IoT
- **dashboard-farm.html**: Dashboard nông nghiệp tổng hợp (mới)
  - Tab navigation cho từng module
  - Thống kê real-time
  - Form thêm đơn vị mới
  - Timeline hoạt động

### 3.10
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

### Scripts có sẵn
| Script | Mô tả |
|--------|-------|
| `npm start` | Chạy server production |
| `npm run dev` | Chế độ dev với hot reload |
| `npm run test` | Chạy unit tests |
| `npm run test:ci` | Chạy tests cho CI (silent) |
| `npm run test:coverage` | Chạy tests với coverage report |
| `npm run test:e2e` | Chạy e2e tests |
| `npm run lint` | Kiểm tra code style |
| `npm run lint:fix` | Tự động sửa lỗi style |
| `npm run build` | Build kiểm tra syntax |
| `npm run migrate` | Chạy database migrations |
| `npm run backup` | Sao lưu database |
| `npm run restore` | Khôi phục database |
| `npm run validate-skills` | Validate AI skills |
| `npm run bootstrap-ai` | Khởi tạo AI models |
| `npm run audit` | Security audit |
| `npm run docs` | Generate JSDoc |

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
│   ├── routes/              # API routes (60+ endpoints)
│   │   ├── crops.js         # Crop cycle + Farm modules
│   │   ├── traceability.js  # QR Code traceability
│   │   ├── supply-chain.js  # Supply chain management
│   │   ├── aiModels.js      # AI Model Management
│   │   ├── devices.js       # Device CRUD
│   │   ├── sensors.js       # Sensor data
│   │   └── auth.js          # Authentication
│   ├── services/            # Business logic
│   │   ├── cropService.js        # Crop cycle management
│   │   ├── batchService.js       # Traceability integration
│   │   ├── farmActivityService.js # Farm activities
│   │   ├── farmModuleService.js  # Modular farm dashboard
│   │   ├── alertService.js       # Telegram/Zalo alerts
│   │   ├── sensorValidator.js    # Data validation
│   │   ├── ingestQueue.js        # Data buffering
│   │   └── ai/                   # AI/ML services
│   ├── config/              # Configuration
│   │   └── database.js      # SQLite + schema
│   ├── i18n/                # Translations (EN/VN/ZH)
│   └── server/              # Modular server
├── public/                  # Dashboards
│   ├── dashboard.html      # IoT monitoring
│   └── dashboard-farm.html # Farm agriculture (NEW)
├── docs/                    # Documentation
│   ├── ARCHITECTURE.md     # Architecture diagrams
│   └── DATA_FLOW.md       # Data flow documentation
├── .env.minimal            # Minimal profile (~130MB RAM)
├── .env.basic              # Basic profile (~260MB RAM)
├── .env.standard           # Standard profile (~320MB RAM)
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