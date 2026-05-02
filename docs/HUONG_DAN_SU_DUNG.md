# Hướng Dẫn Sử Dụng EcoSynTech Local Core V5.1

## Mục Lục
1. [Dashboard - Tổng Quan](#1-dashboard---tổng-quan)
2. [Truy Xuất Nguồn Gốc](#2-truy-xuất-nguồn-gốc-traceability)
3. [Quản Lý Cây Trồng](#3-quản-lý-cây-trồng-crops)
4. [Quản Lý Kho](#4-quản-lý-kho-inventory)
5. [Quản Lý Nhân Sự](#5-quản-lý-nhân-sự-labor)
6. [Tài Chính](#6-tài-chính-finance)
7. [Thiết Bị IoT](#7-thiết-bị-iot-devices)
8. [Bảo Mật](#8-bảo-mật-security)

---

## 1. DASHBOARD - Tổng Quan

Dashboard là trung tâm điều hành, hiển thị toàn bộ thông tin trang trại theo thời gian thực.

### Các API Endpoints:

| Endpoint | Mô Tả | Tham Số |
|----------|-------|---------|
| `GET /api/dashboard/overview` | Tổng quan toàn hệ thống | - |
| `GET /api/dashboard/alerts` | Danh sách cảnh báo | `limit` (mặc định: 10) |
| `GET /api/dashboard/activity` | Hoạt động gần đây | - |
| `GET /api/dashboard/weather` | Thời tiết hiện tại + dự báo 5 ngày | `lat`, `lon` |
| `GET /api/dashboard/weather-forecast` | Dự báo thời tiết 5 ngày | `lat`, `lon` |
| `GET /api/dashboard/weather-alerts` | Cảnh báo thời tiết | `lat`, `lon` |
| `GET /api/dashboard/finance-summary` | Tổng quan tài chính | `farm_id`, `period` (today/week/month/year) |
| `GET /api/dashboard/finance-kpis` | KPIs tài chính | `farm_id` |
| `GET /api/dashboard/inventory-overview` | Tổng quan kho | `farm_id`, `category` |
| `GET /api/dashboard/inventory-alerts` | Cảnh báo kho | `farm_id` |
| `GET /api/dashboard/inventory-kpis` | KPIs kho | `farm_id` |
| `GET /api/dashboard/equipment-overview` | Tổng quan thiết bị | `farm_id`, `status` |
| `GET /api/dashboard/labor-overview` | Tổng quan nhân sự | `farm_id` |
| `GET /api/dashboard/crops-overview` | Tổng quan cây trồng | `farm_id`, `status` |
| `GET /api/dashboard/automation-overview` | Tổng quan tự động hóa | `farm_id` |
| `GET /api/dashboard/sales-overview` | Tổng quan bán hàng | `farm_id` |
| `GET /api/dashboard/audit-logs` | Nhật ký kiểm toán | `limit`, `action` |

### Ví Dụ Sử Dụng:

```bash
# 1. Lấy tổng quan dashboard
curl -X GET http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer <token>"

# 2. Lấy thời tiết
curl -X GET "http://localhost:3000/api/dashboard/weather?lat=10.7769&lon=106.7009" \
  -H "Authorization: Bearer <token>"

# 3. Tổng quan tài chính tháng này
curl -X GET "http://localhost:3000/api/dashboard/finance-summary?period=month" \
  -H "Authorization: Bearer <token>"

# 4. Cảnh báo tồn kho thấp
curl -X GET "http://localhost:3000/api/dashboard/inventory-alerts" \
  -H "Authorization: Bearer <token>"
```

### Response mẫu - Overview:
```json
{
  "ok": true,
  "data": {
    "system": {
      "uptime": 3600,
      "cpu": "25.3",
      "memory": "52.1",
      "disk": "45"
    },
    "farms": 3,
    "devices": {
      "total": 25,
      "online": 18
    },
    "crops": {
      "total": 12,
      "area": 5.5
    },
    "sensors": {
      "temperature": { "value": 28.5, "unit": "°C" },
      "humidity": { "value": 72, "unit": "%" }
    },
    "alerts": {
      "total": 5,
      "pending": 2
    },
    "automation": {
      "rules": 15,
      "active": 12
    }
  }
}
```

---

## 2. TRUY XUẤT NGUỒN GỐC (Traceability)

Truy xuất nguồn gốc theo chuẩn GS1, GAP, và organic certification. Mỗi lô hàng có QR code riêng để khách hàng quét kiểm tra.

### Các API Endpoints:

| Endpoint | Mô Tả | Auth |
|----------|-------|------|
| `GET /api/traceability/batch/:code` | Xem chi tiết lô | Không |
| `GET /api/traceability/batches` | Danh sách lô | Có |
| `POST /api/traceability/batch` | Tạo lô mới | Có |
| `POST /api/traceability/batch/:code/stage` | Thêm giai đoạn | Có |
| `GET /api/traceability/batch/:code/qr` | Lấy QR code | Không |
| `POST /api/traceability/batch/:code/harvest` | Đánh dấu thu hoạch | Có |
| `POST /api/traceability/batch/:code/export` | Đánh dấu xuất bán | Có |
| `GET /api/traceability/stats` | Thống kê | Có |

### Quy Trình Truy Xuất:

```
TẠO LÔ → Gieo trồng → Chăm sóc → Thu hoạch → Xuất bán
   │         │            │            │
   ▼         ▼            ▼            ▼
 Batch   Stage 1    Stage 2...   Stage N    Export
 Code                  (QR Code)              (Blockchain)
```

### Ví Dụ Sử Dụng:

```bash
# 1. Tạo lô mới
curl -X POST http://localhost:3000/api/traceability/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Rau Muống Hữu Cơ",
    "product_type": "vegetable",
    "quantity": 500,
    "unit": "kg",
    "farm_name": "EcoSynTech Farm",
    "zone": "A1",
    "seed_variety": "Muống ta",
    "planting_date": "2026-04-01",
    "expected_harvest": "2026-05-15"
  }'

# Response:
{
  "success": true,
  "message": "Batch created successfully",
  "batch": {
    "id": "abc-123",
    "batch_code": "BATCH-A1B2-C3D4",
    "product_name": "Rau Muống Hữu Cơ",
    "status": "active"
  },
  "qr_code": "data:image/png;base64,...",
  "trace_url": "https://ecosyntech.com/trace/BATCH-A1B2-C3D4"
}

# 2. Thêm giai đoạn chăm sóc
curl -X POST http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/stage \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "stage_name": "Tưới nước buổi sáng",
    "stage_type": "growing",
    "description": "Tưới phun sương 30 phút",
    "performed_by": "Nguyễn Văn A",
    "location": "Khu A1",
    "inputs_used": [
      { "name": "Nước sạch", "quantity": "200L" }
    ]
  }'

# 3. Đánh dấu thu hoạch
curl -X POST http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/harvest \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "harvest_quantity": 480,
    "harvest_notes": "Chất lượng tốt, lá xanh mượt"
  }'

# 4. Đánh dấu xuất bán
curl -X POST http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/export \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_name": "Công ty TNHH Fresh Mart",
    "buyer_contact": "contact@freshmart.vn",
    "export_price": 35000,
    "export_unit": "kg"
  }'

# 5. Xem chi tiết lô (khách hàng quét QR)
curl -X GET http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4

# Response:
{
  "success": true,
  "batch": {
    "batch_code": "BATCH-A1B2-C3D4",
    "product_name": "Rau Muống Hữu Cơ",
    "product_type": "vegetable",
    "quantity": 500,
    "unit": "kg",
    "farm_name": "EcoSynTech Farm",
    "zone": "A1",
    "seed_variety": "Muống ta",
    "planting_date": "2026-04-01",
    "expected_harvest": "2026-05-15",
    "harvest_date": "2026-05-15",
    "status": "exported"
  },
  "stages": [
    { "stage_name": "Gieo trồng", "stage_type": "planting", "stage_order": 1 },
    { "stage_name": "Tưới nước", "stage_type": "growing", "stage_order": 2 }
  ],
  "trace_url": "https://ecosyntech.com/trace/BATCH-A1B2-C3D4"
}
```

### Các Loại Giai Đoạn (Stage Types):
| Type | Mô Tả |
|------|-------|
| `preparation` | Chuẩn bị đất, làm đất |
| `planting` | Gieo trồng |
| `growing` | Chăm sóc, tưới tiêu, bón phân |
| `harvesting` | Thu hoạch |
| `processing` | Chế biến, đóng gói |
| `packaging` | Đóng gói |
| `storage` | Bảo quản |
| `transport` | Vận chuyển |

### Tạo QR Code Để In:

```bash
# Lấy QR dạng base64
curl -X GET "http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/qr" \
  -H "Content-Type: application/json"

# Lấy QR dạng SVG (để in)
curl -X GET "http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/qr?format=svg"
```

---

## 3. QUẢN LÝ CÂY TRỒNG (Crops)

### Các API Endpoints:

| Endpoint | Mô Tả |
|----------|-------|
| `GET /api/crops/crops` | Danh sách cây trồng |
| `GET /api/crops/crops/:id` | Chi tiết cây trồng |
| `GET /api/crops/plantings` | Danh sách trồng |
| `GET /api/crops/plantings/:id` | Chi tiết trồng |
| `POST /api/crops/plantings` | Tạo trồng mới |
| `PUT /api/crops/plantings/:id` | Cập nhật trồng |
| `GET /api/crops/aquaculture` | Danh sách thủy sản |

### Ví Dụ:

```bash
# 1. Tạo trồng mới
curl -X POST http://localhost:3000/api/crops/plantings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "farm-001",
    "crop_id": "crop-001",
    "area": 1.5,
    "planting_date": "2026-04-01",
    "expected_harvest": "2026-06-01",
    "method": "hydroponic",
    "notes": "Trồng thủy canh NFT"
  }'

# 2. Cập nhật trạng thái
curl -X PUT http://localhost:3000/api/crops/plantings/planting-123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "harvested",
    "actual_harvest_date": "2026-05-28",
    "harvest_quantity": 450,
    "notes": "Thu hoạch sớm 3 ngày"
  }'
```

---

## 4. QUẢN LÝ KHO (Inventory)

### Các API Endpoints:

| Endpoint | Mô Tả |
|----------|-------|
| `GET /api/inventory/` | Danh sách vật tư |
| `GET /api/inventory/categories` | Danh mục vật tư |
| `GET /api/inventory/:id` | Chi tiết vật tư |
| `POST /api/inventory/` | Thêm vật tư |
| `PUT /api/inventory/:id` | Cập nhật vật tư |
| `DELETE /api/inventory/:id` | Xóa vật tư |

### Ví Dụ:

```bash
# 1. Thêm vật tư mới
curl -X POST http://localhost:3000/api/inventory \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Phân hữu cơ Compost",
    "category": "fertilizer",
    "unit": "kg",
    "quantity": 500,
    "min_quantity": 100,
    "cost_per_unit": 5000,
    "supplier": "Công ty Phân Bón Xanh",
    "farm_id": "farm-001",
    "expiry_date": "2027-12-31"
  }'

# 2. Lấy danh sách tồn kho thấp
curl -X GET "http://localhost:3000/api/inventory/?low_stock=true" \
  -H "Authorization: Bearer <token>"
```

---

## 5. QUẢN LÝ NHÂN SỰ (Labor)

### Các API Endpoints:

| Endpoint | Mô Tả |
|----------|-------|
| `GET /api/labor/positions` | Danh sách vị trí |
| `GET /api/labor/skill-levels` | Danh sách skill |
| `GET /api/labor/workers` | Danh sách công nhân |
| `POST /api/labor/workers` | Thêm công nhân |
| `PUT /api/labor/workers/:id` | Cập nhật công nhân |
| `POST /api/labor/shifts` | Tạo ca làm |
| `GET /api/labor/shifts` | Danh sách ca |
| `POST /api/labor/attendance` | Chấm công |

### Ví Dụ:

```bash
# 1. Thêm công nhân
curl -X POST http://localhost:3000/api/labor/workers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "farm-001",
    "name": "Nguyễn Văn An",
    "phone": "0912345678",
    "position": "nong_cong",
    "skill_level": "level_2",
    "start_date": "2026-04-01",
    "wage_type": "daily",
    "wage_amount": 200000
  }'

# 2. Tạo ca làm
curl -X POST http://localhost:3000/api/labor/shifts \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": "worker-001",
    "farm_id": "farm-001",
    "date": "2026-05-02",
    "shift_type": "morning",
    "start_time": "06:00",
    "end_time": "14:00",
    "task": "Tưới nước khu A1"
  }'
```

---

## 6. TÀI CHÍNH (Finance)

### Các API Endpoints:

| Endpoint | Mô Tả |
|----------|-------|
| `GET /api/finance/` | Danh sách giao dịch |
| `GET /api/finance/categories` | Danh mục |
| `POST /api/finance/` | Tạo giao dịch |
| `PUT /api/finance/:id` | Cập nhật giao dịch |
| `DELETE /api/finance/:id` | Xóa giao dịch |
| `GET /api/finance/summary` | Tổng kết |

### Ví Dụ:

```bash
# 1. Tạo thu
curl -X POST http://localhost:3000/api/finance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "category": "sales",
    "amount": 15000000,
    "description": "Bán rau Muống - Lô BATCH-001",
    "farm_id": "farm-001",
    "date": "2026-05-01",
    "payment_method": "bank_transfer",
    "reference_id": "ORDER-001"
  }'

# 2. Tạo chi
curl -X POST http://localhost:3000/api/finance \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "category": "labor",
    "amount": 6000000,
    "description": "Tiền công tháng 4/2026",
    "farm_id": "farm-001",
    "date": "2026-05-01",
    "payment_method": "cash"
  }'
```

---

## 7. THIẾT BỊ IoT (Devices)

### Các API Endpoints:

| Endpoint | Mô Tả |
|----------|-------|
| `GET /api/devices/` | Danh sách thiết bị |
| `POST /api/devices/` | Thêm thiết bị |
| `PUT /api/devices/:id` | Cập nhật thiết bị |
| `POST /api/devices/:id/action` | Điều khiển |
| `GET /api/devices/:id/telemetry` | Dữ liệu cảm biến |
| `POST /api/ota/check` | Kiểm tra cập nhật |
| `POST /api/ota/update` | Cập nhật firmware |

### Ví Dụ:

```bash
# 1. Thêm thiết bị
curl -X POST http://localhost:3000/api/devices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cảm biến A1-01",
    "type": "sensor",
    "subtype": "temperature_humidity",
    "farm_id": "farm-001",
    "zone": "A1",
    "location": "Nhà kính A1",
    "config": {
      "read_interval": 300000,
      "threshold_temp": 35,
      "threshold_humidity": 40
    }
  }'

# 2. Điều khiển thiết bị
curl -X POST http://localhost:3000/api/devices/device-001/action \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "relay_on",
    "relay": 1
  }'

# 3. Bật quạt
curl -X POST http://localhost:3000/api/devices/device-001/action \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "fan_on"
  }'
```

---

## 8. BẢO MẬT (Security)

### Các API Endpoints:

| Endpoint | Mô Tả |
|----------|-------|
| `GET /api/security/audit-log` | Nhật ký audit |
| `POST /api/security/audit-log` | Ghi audit log |
| `GET /api/security/security-scan` | Quét bảo mật |
| `GET /api/security/sessions` | Phiên đang hoạt động |
| `DELETE /api/security/sessions/:id` | Xóa phiên |
| `GET /api/security/api-keys` | Danh sách API keys |
| `POST /api/security/api-keys` | Tạo API key |
| `GET /api/security/ip-whitelist` | Danh sách IP trắng |
| `POST /api/security/ip-whitelist` | Thêm IP |
| `GET /api/security/audit-chain-verify` | Xác minh audit chain |

### Ví Dụ:

```bash
# 1. Tạo API key cho thiết bị
curl -X POST http://localhost:3000/api/security/api-keys \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ESP32-A1-Sensor",
    "deviceId": "device-001",
    "permissions": ["telemetry:write"],
    "expires_at": "2027-12-31"
  }'

# 2. Thêm IP vào whitelist
curl -X POST http://localhost:3000/api/security/ip-whitelist \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.100",
    "description": "Server AI",
    "expires_at": "2027-12-31"
  }'

# 3. Xem security scan
curl -X GET http://localhost:3000/api/security/security-scan \
  -H "Authorization: Bearer <token>"
```

---

## Authentication

Tất cả API (trừ public) đều cần token:

```bash
# Đăng nhập
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ecosyntech.com",
    "password": "your-password"
  }'

# Response:
{
  "user": { "id": "user-001", "email": "admin@ecosyntech.com", "role": "admin" },
  "token": "eyJhbGciOiJIUzI1...",
  "refreshToken": "eyJhbGciOiJIUzI1..."
}

# Sử dụng token
curl -X GET http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1..."

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "refreshToken": "eyJhbGciOiJIUzI1..."
  }'
```

---

## Environment Variables

Tạo file `.env`:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./data/ecosyntech.db

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=1h
REFRESH_EXPIRES_IN=7d

# Farm Location (for weather)
FARM_LAT=10.7769
FARM_LON=106.7009

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

---

## Chạy Server

```bash
# Cài đặt
npm install

# Chạy migrations
npm run migrate

# Seed dữ liệu mẫu
npm run seed

# Chạy server
npm start

# Hoặc chạy dev
npm run dev
```

Truy cập: http://localhost:3000

---

**Tài liệu Version:** 1.0.0  
**Cập nhật:** 2026-05-02  
**EcoSynTech Local Core V5.1**