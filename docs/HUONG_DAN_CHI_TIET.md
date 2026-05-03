# HƯỚNG DẪN SỬ DỤNG ECOSYN TECH LOCAL CORE V5.1
## Dành cho người mới bắt đầu - Cầm tay chỉ việc

---

# PHẦN 1: CÀI ĐẶT HỆ THỐNG

## 1.1. Yêu cầu trước khi cài đặt

Trước khi bắt đầu, bạn cần chuẩn bị:

| Yêu cầu | Phiên bản tối thiểu | Cách kiểm tra |
|---------|-------------------|--------------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | Bất kỳ | `git --version` |

Nếu chưa cài đặt, tải tại: https://nodejs.org/

## 1.2. Tải và cài đặt code

```bash
# Mở Terminal (Mac/Linux) hoặc PowerShell (Windows)

# 1. Tạo thư mục làm việc
cd ~
mkdir ecosyntech
cd ecosyntech

# 2. Clone code từ GitHub
git clone https://github.com/ecosyntech68vn/EcoSynTech-Local-Core.git

# 3. Vào thư mục project
cd EcoSynTech-Local-Core

# 4. Cài đặt các thư viện cần thiết
npm install

# 5. Chạy migrations (tạo database)
npm run migrate

# 6. Seed dữ liệu mẫu (có sẵn một số dữ liệu demo)
npm run seed
```

**Nếu gặp lỗi ở bước 4**, thử cách sau:
```bash
# Xóa node_modules nếu có
rm -rf node_modules

# Cài lại với quyền admin (Windows mở Terminal as Administrator)
npm install --legacy-peer-deps
```

## 1.3. Cấu hình môi trường

```bash
# Tạo file .env từ file mẫu
cp .env.example .env
```

Mở file `.env` bằng text editor và chỉnh sửa:

```env
# Server
PORT=3000
NODE_ENV=development

# Database - Đường dẫn file SQLite
DB_PATH=./data/ecosyntech.db

# JWT - Secret key cho đăng nhập (thay đổi trong production)
JWT_SECRET=eco-secret-key-2026-change-in-production
JWT_EXPIRES_IN=24h
REFRESH_EXPIRES_IN=7d

# Vị trí farm (cho dự báo thời tiết)
FARM_LAT=10.7769
FARM_LON=106.7009

# Các cấu hình khác có thể để mặc định
```

## 1.4. Khởi động server

```bash
# Cách 1: Chạy bình thường
npm start

# Cách 2: Chạy developer mode (tự động restart khi sửa code)
npm run dev
```

Nếu thấy thông báo như sau là thành công:

```
Server running on http://localhost:3000
Database initialized successfully
```

**Mở trình duyệt** và truy cập: http://localhost:3000

---

# PHẦN 2: ĐĂNG NHẬP VÀ TẠO TÀI KHOẢN

## 2.1. Đăng ký tài khoản mới

Sau khi cài đặt, bạn cần tạo tài khoản để sử dụng:

```bash
# Thay đổi các giá trị email, password, name theo ý muốn
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@farm.com",
    "password": "MatKhau123@",
    "name": "Người Quản Lý"
  }'
```

**Response trả về:**
```json
{
  "user": {
    "id": "user-1746187200000",
    "email": "admin@farm.com",
    "name": "Người Quản Lý",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**QUAN TRỌNG:** Lưu lại `token` và `refreshToken` để sử dụng các API tiếp theo.

## 2.2. Đăng nhập (nếu đã có tài khoản)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@farm.com",
    "password": "MatKhau123@"
  }'
```

## 2.3. Cách sử dụng token

Tất cả API cần xác thực đều cần gửi kèm token:

```bash
# Thay YOUR_TOKEN_HERE bằng token bạn nhận được ở trên
curl -X GET http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Cách ngắn hơn (sử dụng biến):**

```bash
# Đặt token vào biến (Linux/Mac)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Sử dụng
curl -X GET http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer $TOKEN"
```

---

# PHẦN 3: QUẢN LÝ TRANG TRẠI (FARMOS CORE)

Trước khi sử dụng các module khác, cần tạo thông tin trang trại.

## 3.1. Tạo tổ chức (Organization)

```bash
curl -X POST http://localhost:3000/api/farmos-core/organizations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Trang Trại EcoSynTech",
    "email": "lienhe@ecosyntech.com",
    "phone": "0912345678",
    "address": "Quận 9, TP Hồ Chí Minh"
  }'
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "org-abc123",
    "name": "Trang Trại EcoSynTech",
    "email": "lienhe@ecosyntech.com",
    "status": "active"
  }
}
```

## 3.2. Tạo trang trại (Farm)

```bash
curl -X POST http://localhost:3000/api/farms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "org-abc123",
    "name": "Farm Chính",
    "name_vi": "Trang Trại Chính",
    "location": "Khu vực A",
    "area_size": 5.0,
    "area_unit": "hectare"
  }'
```

**Lưu ý:** Copy `id` của farm (ví dụ: `farm-abc123`) để sử dụng cho các module tiếp theo.

---

# PHẦN 4: DASHBOARD - THEO DÕI TỔNG QUAN

Dashboard cho bạn nhìn thấy toàn bộ hoạt động của trang trại.

## 4.1. Xem tổng quan

```bash
curl -X GET http://localhost:3000/api/dashboard/overview \
  -H "Authorization: Bearer $TOKEN"
```

**Response mẫu:**
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
    "farms": 1,
    "devices": { "total": 0, "online": 0 },
    "crops": { "total": 0, "area": 0 },
    "sensors": {},
    "alerts": { "total": 0, "pending": 0 },
    "automation": { "rules": 0, "active": 0 }
  }
}
```

## 4.2. Xem danh sách cảnh báo

```bash
curl -X GET "http://localhost:3000/api/dashboard/alerts?limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

## 4.3. Xem thời tiết

```bash
curl -X GET "http://localhost:3000/api/dashboard/weather?lat=10.7769&lon=106.7009" \
  -H "Authorization: Bearer $TOKEN"
```

## 4.4. Xem hoạt động gần đây

```bash
curl -X GET http://localhost:3000/api/dashboard/activity \
  -H "Authorization: Bearer $TOKEN"
```

---

# PHẦN 5: QUẢN LÝ THIẾT BỊ - MÁY MÓC

## 5.1. Tạo danh mục thiết bị

Trước khi thêm thiết bị, tạo danh mục để phân loại:

```bash
curl -X POST http://localhost:3000/api/equipment/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "farm-abc123",
    "category_name": "Máy nông nghiệp",
    "category_name_vi": "Máy nông nghiệp",
    "category_type": "vehicle",
    "description": "Các loại máy móc phục vụ sản xuất"
  }'
```

## 5.2. Xem các loại thiết bị có sẵn

```bash
curl -X GET http://localhost:3000/api/equipment/types \
  -H "Authorization: Bearer $TOKEN"
```

**Kết quả:**
```json
{
  "ok": true,
  "data": {
    "tractor": { "label": "Máy kéo", "icon": "🚜" },
    "harvester": { "label": "Máy gặt đập", "icon": "🌾" },
    "sprayer": { "label": "Máy phun", "icon": "💨" },
    "irrigation_pump": { "label": "Máy bơm nước", "icon": "💧" },
    "seeder": { "label": "Máy gieo hạt", "icon": "🌱" },
    "plow": { "label": "Máy cày", "icon": "耕" },
    "generator": { "label": "Máy phát điện", "icon": "⚡" },
    "drone": { "label": "Máy bay nông nghiệp", "icon": "🛸" }
  }
}
```

## 5.3. Thêm thiết bị mới

```bash
curl -X POST http://localhost:3000/api/equipment \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "farm-abc123",
    "category_id": "cat-abc123",
    "equipment_code": "TRACTOR-001",
    "equipment_name": "Máy kéo Kubota L3608",
    "equipment_name_vi": "Máy kéo Kubota L3608",
    "equipment_type": "tractor",
    "status": "available",
    "purchase_date": "2025-06-15",
    "purchase_price": 350000000,
    "depreciation_rate": 10,
    "serial_number": "KUB-2025-001",
    "location": "Nhà kho A"
  }'
```

**Giải thích các trường:**
| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `farm_id` | ✅ | ID trang trại |
| `equipment_code` | ✅ | Mã thiết bị (tự đặt) |
| `equipment_name` | ✅ | Tên thiết bị |
| `equipment_type` | ✅ | Loại: tractor, harvester, sprayer, irrigation_pump... |
| `status` | ✅ | Trạng thái: available, active, under_maintenance, broken |
| `purchase_date` | | Ngày mua |
| `purchase_price` | | Giá mua (VNĐ) |
| `serial_number` | | Số serial |
| `location` | | Vị trí hiện tại |

## 5.4. Xem danh sách thiết bị

```bash
curl -X GET "http://localhost:3000/api/equipment/?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

## 5.5. Cập nhật trạng thái thiết bị

```bash
curl -X PUT http://localhost:3000/api/equipment/equip-abc123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_use",
    "notes": "Đang sử dụng cày đất khu B2"
  }'
```

## 5.6. Tạo lịch bảo trì

```bash
curl -X POST http://localhost:3000/api/equipment/maintenance/schedules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_id": "equip-abc123",
    "farm_id": "farm-abc123",
    "maintenance_type": "preventive",
    "description": "Thay dầu định kỳ",
    "schedule_date": "2026-06-15",
    "interval_days": 90,
    "estimated_cost": 1500000
  }'
```

## 5.7. Ghi nhận bảo trì hoàn thành

```bash
curl -X POST http://localhost:3000/api/equipment/maintenance/logs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_id": "equip-abc123",
    "maintenance_schedule_id": "sched-abc123",
    "farm_id": "farm-abc123",
    "maintenance_type": "preventive",
    "description": "Thay dầu máy, vệ sinh lọc gió",
    "actual_date": "2026-05-01",
    "actual_cost": 1400000,
    "status": "completed",
    "next_maintenance_date": "2026-08-01"
  }'
```

## 5.8. Phân công thiết bị cho công nhân

```bash
curl -X POST http://localhost:3000/api/equipment/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "equipment_id": "equip-abc123",
    "worker_id": "worker-abc123",
    "farm_id": "farm-abc123",
    "assignment_date": "2026-05-02",
    "task": "Cày đất khu B2",
    "expected_hours": 8
  }'
```

## 5.9. Xem thống kê thiết bị

```bash
curl -X GET "http://localhost:3000/api/equipment/stats?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

---

# PHẦN 6: QUẢN LÝ TỒN KHO

## 6.1. Các loại vật tư

| Mã | Tiếng Việt |
|----|-----------|
| `fertilizer` | Phân bón |
| `pesticide` | Thuốc BVTV |
| `seed` | Hạt giống |
| `fuel` | Nhiên liệu |
| `tools` | Dụng cụ |
| `packaging` | Vật liệu đóng gói |
| `other` | Khác |

## 6.2. Thêm vật tư mới

```bash
curl -X POST http://localhost:3000/api/inventory \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Phân hữu cơ Compost",
    "category": "fertilizer",
    "unit": "kg",
    "quantity": 500,
    "min_quantity": 100,
    "cost_per_unit": 5000,
    "supplier": "Công ty Phân Bón Xanh",
    "farm_id": "farm-abc123",
    "expiry_date": "2027-12-31"
  }'
```

**Giải thích:**
| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `name` | ✅ | Tên vật tư |
| `category` | ✅ | Loại: fertilizer, pesticide, seed... |
| `unit` | ✅ | Đơn vị: kg, lit, cái, bao... |
| `quantity` | ✅ | Số lượng hiện tại |
| `min_quantity` | | Mức tồn kho tối thiểu (báo khi thấp hơn) |
| `cost_per_unit` | | Giá / 1 đơn vị |
| `expiry_date` | | Ngày hết hạn |

## 6.3. Xem danh sách vật tư

```bash
curl -X GET "http://localhost:3000/api/inventory/?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

## 6.4. Xem vật tư sắp hết hàng

```bash
curl -X GET "http://localhost:3000/api/inventory/?farm_id=farm-abc123&low_stock=true" \
  -H "Authorization: Bearer $TOKEN"
```

## 6.5. Điều chỉnh số lượng (nhập/thêm hoặc xuất/sử dụng)

```bash
# Thêm vào kho (nhập thêm)
curl -X POST http://localhost:3000/api/inventory/inv-abc123/adjust \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adjustment": 100,
    "reason": "Nhập thêm phân bón",
    "adjusted_by": "admin"
  }'

# Xuất kho (sử dụng)
curl -X POST http://localhost:3000/api/inventory/inv-abc123/adjust \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "adjustment": -50,
    "reason": "Xuất bón cây",
    "adjusted_by": "worker-001"
  }'
```

## 6.6. Chuyển kho giữa các trang trại

```bash
curl -X POST http://localhost:3000/api/inventory/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": "inv-abc123",
    "from_farm": "farm-abc123",
    "to_farm": "farm-xyz789",
    "quantity": 100,
    "reason": "Chuyển cho chi nhánh",
    "transfer_date": "2026-05-02"
  }'
```

## 6.7. Cập nhật thông tin vật tư

```bash
curl -X PUT http://localhost:3000/api/inventory/inv-abc123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "min_quantity": 150,
    "cost_per_unit": 5500
  }'
```

## 6.8. Xem cảnh báo tồn kho

```bash
curl -X GET "http://localhost:3000/api/dashboard/inventory-alerts?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

---

# PHẦN 7: QUẢN LÝ TÀI CHÍNH

## 7.1. Các loại giao dịch

| Type | Mô tả |
|------|-------|
| `income` | Thu tiền |
| `expense` | Chi tiền |

## 7.2. Các danh mục thu

| Category | Tiếng Việt |
|----------|-----------|
| `sales` | Doanh số bán hàng |
| `service` | Dịch vụ |
| `subsidy` | Trợ cấp |
| `other_income` | Thu khác |

## 7.3. Các danh mục chi

| Category | Tiếng Việt |
|----------|-----------|
| `labor` | Tiền công |
| `materials` | Vật tư |
| `equipment` | Thiết bị |
| `fuel` | Nhiên liệu |
| `utilities` | Điện nước |
| `maintenance` | Bảo trì |
| `marketing` | Marketing |
| `administrative` | Hành chính |
| `other_expense` | Chi khác |

## 7.4. Ghi nhận thu tiền (bán hàng)

```bash
curl -X POST http://localhost:3000/api/finance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "category": "sales",
    "amount": 15000000,
    "description": "Bán rau Muống - Lô BATCH-001",
    "farm_id": "farm-abc123",
    "date": "2026-05-01",
    "payment_method": "bank_transfer",
    "reference_id": "ORDER-001"
  }'
```

## 7.5. Ghi nhận chi tiền

```bash
# Chi tiền công
curl -X POST http://localhost:3000/api/finance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "category": "labor",
    "amount": 6000000,
    "description": "Tiền công tháng 4/2026 - 3 công nhân",
    "farm_id": "farm-abc123",
    "date": "2026-05-01",
    "payment_method": "cash"
  }'

# Chi mua vật tư
curl -X POST http://localhost:3000/api/finance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "category": "materials",
    "amount": 2500000,
    "description": "Mua phân bón hữu cơ",
    "farm_id": "farm-abc123",
    "date": "2026-05-02",
    "payment_method": "bank_transfer"
  }'

# Chi nhiên liệu
curl -X POST http://localhost:3000/api/finance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "category": "fuel",
    "amount": 1200000,
    "description": "Dầu DO máy kéo",
    "farm_id": "farm-abc123",
    "date": "2026-05-02",
    "payment_method": "cash"
  }'

# Chi điện nước
curl -X POST http://localhost:3000/api/finance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "category": "utilities",
    "amount": 3500000,
    "description": "Tiền điện tháng 4/2026",
    "farm_id": "farm-abc123",
    "date": "2026-05-01",
    "payment_method": "bank_transfer"
  }'
```

## 7.6. Xem danh sách giao dịch

```bash
curl -X GET "http://localhost:3000/api/finance/?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

## 7.7. Xem tài chính theo khoảng thời gian

```bash
# Xem tháng này
curl -X GET "http://localhost:3000/api/finance/?farm_id=farm-abc123&start_date=2026-05-01&end_date=2026-05-31" \
  -H "Authorization: Bearer $TOKEN"
```

## 7.8. Xem tổng kết tài chính

```bash
curl -X GET "http://localhost:3000/api/finance/summary?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "total_income": 15000000,
    "total_expense": 9700000,
    "net_profit": 5300000,
    "profit_margin": 35.3
  }
}
```

## 7.9. Xem KPIs tài chính

```bash
curl -X GET "http://localhost:3000/api/dashboard/finance-kpis?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

---

# PHẦN 8: QUẢN LÝ NHÂN SỰ

## 8.1. Các vị trí công việc

| Code | Tiếng Việt |
|------|-----------|
| `nong_cong` | Nông công |
| `ky_thuat_vien` | Kỹ thuật viên |
| `quan_ly` | Quản lý |
| `bao_ve` | Bảo vệ |
| `lao_cong` | Lao công |

## 8.2. Cấp độ kỹ năng

| Code | Mô tả |
|------|-------|
| `level_1` | Mới vào |
| `level_2` | Có kinh nghiệm |
| `level_3` | Kinh nghiệm cao |
| `level_4` | Thợ lành nghề |

## 8.3. Thêm công nhân mới

```bash
curl -X POST http://localhost:3000/api/labor/workers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "farm-abc123",
    "name": "Nguyễn Văn An",
    "phone": "0912345678",
    "position": "nong_cong",
    "skill_level": "level_2",
    "start_date": "2026-04-01",
    "wage_type": "daily",
    "wage_amount": 200000
  }'
```

## 8.4. Xem danh sách công nhân

```bash
curl -X GET "http://localhost:3000/api/labor/workers?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

## 8.5. Cập nhật thông tin công nhân

```bash
curl -X PUT http://localhost:3000/api/labor/workers/worker-abc123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "position": "ky_thuat_vien",
    "skill_level": "level_3",
    "status": "active"
  }'
```

## 8.6. Tạo ca làm việc

```bash
curl -X POST http://localhost:3000/api/labor/shifts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": "worker-abc123",
    "farm_id": "farm-abc123",
    "date": "2026-05-02",
    "shift_type": "morning",
    "start_time": "06:00",
    "end_time": "14:00",
    "task": "Tưới nước khu A1"
  }'
```

## 8.7. Chấm công (vào ca)

```bash
curl -X POST http://localhost:3000/api/labor/attendance \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": "worker-abc123",
    "farm_id": "farm-abc123",
    "date": "2026-05-02",
    "check_in": "06:05",
    "shift_type": "morning"
  }'
```

## 8.8. Chấm công (ra ca)

```bash
curl -X PUT http://localhost:3000/api/labor/attendance/att-abc123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "check_out": "14:10",
    "status": "completed",
    "overtime_hours": 1
  }'
```

## 8.9. Xem lịch sử chấm công

```bash
curl -X GET "http://localhost:3000/api/labor/attendance?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

## 8.10. Tính lương

```bash
curl -X GET "http://localhost:3000/api/labor/wages?worker_id=worker-abc123&month=2026-05" \
  -H "Authorization: Bearer $TOKEN"
```

---

# PHẦN 9: QUẢN LÝ CÂY TRỒNG

## 9.1. Xem danh sách cây trồng

```bash
curl -X GET http://localhost:3000/api/crops/crops \
  -H "Authorization: Bearer $TOKEN"
```

## 9.2. Tạo lịch trồng mới

```bash
curl -X POST http://localhost:3000/api/crops/plantings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farm_id": "farm-abc123",
    "crop_id": "crop-abc123",
    "area": 1.5,
    "planting_date": "2026-04-01",
    "expected_harvest": "2026-06-01",
    "method": "hydroponic",
    "notes": "Trồng thủy canh NFT"
  }'
```

## 9.3. Xem danh sách trồng

```bash
curl -X GET "http://localhost:3000/api/crops/plantings?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

## 9.4. Cập nhật trạng thái trồng

```bash
curl -X PUT http://localhost:3000/api/crops/plantings/planting-abc123 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "harvested",
    "actual_harvest_date": "2026-05-28",
    "harvest_quantity": 450
  }'
```

---

# PHẦN 10: TRUY XUẤT NGUỒN GỐC (TRACEABILITY)

Đây là tính năng quan trọng để chứng minh nguồn gốc sản phẩm, đạt chuẩn GAP, Organic.

## 10.1. Tạo lô sản phẩm mới

```bash
curl -X POST http://localhost:3000/api/traceability/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Rau Muống Hữu Cơ",
    "product_type": "vegetable",
    "quantity": 500,
    "unit": "kg",
    "farm_name": "Trang Trại EcoSynTech",
    "zone": "A1",
    "seed_variety": "Muống ta",
    "planting_date": "2026-04-01",
    "expected_harvest": "2026-05-15"
  }'
```

**Response:**
```json
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
```

**QUAN TR���NG:** Lưu lại `batch_code` và `qr_code` để in ra dán trên sản phẩm!

## 10.2. Thêm giai đoạn chăm sóc

```bash
curl -X POST http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/stage \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stage_name": "Tưới nước buổi sáng",
    "stage_type": "growing",
    "description": "Tưới phun sương 30 phút",
    "performed_by": "Nguyễn Văn An",
    "location": "Khu A1",
    "inputs_used": [
      { "name": "Nước sạch", "quantity": "200L" }
    ]
  }'
```

## 10.3. Các loại giai đoạn

| Type | Tiếng Việt |
|------|-----------|
| `preparation` | Chuẩn bị đất |
| `planting` | Gieo trồng |
| `growing` | Chăm sóc |
| `harvesting` | Thu hoạch |
| `processing` | Chế biến |
| `packaging` | Đóng gói |
| `storage` | Bảo quản |
| `transport` | Vận chuyển |

## 10.4. Đánh dấu thu hoạch

```bash
curl -X POST http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/harvest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "harvest_quantity": 480,
    "harvest_notes": "Chất lượng tốt, lá xanh mượt"
  }'
```

## 10.5. Đánh dấu xuất bán

```bash
curl -X POST http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_name": "Công ty TNHH Fresh Mart",
    "buyer_contact": "contact@freshmart.vn",
    "export_price": 35000,
    "export_unit": "kg"
  }'
```

## 10.6. Khách hàng xem thông tin (quét QR)

```bash
# API công khai - không cần token
curl -X GET http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4
```

**Response (cho khách hàng):**
```json
{
  "success": true,
  "batch": {
    "batch_code": "BATCH-A1B2-C3D4",
    "product_name": "Rau Muống Hữu Cơ",
    "product_type": "vegetable",
    "farm_name": "Trang Trại EcoSynTech",
    "zone": "A1",
    "seed_variety": "Muống ta",
    "planting_date": "2026-04-01",
    "harvest_date": "2026-05-15",
    "status": "exported"
  },
  "stages": [
    { "stage_name": "Gieo trồng", "stage_type": "planting" },
    { "stage_name": "Tưới nước", "stage_type": "growing" }
  ],
  "trace_url": "https://ecosyntech.com/trace/BATCH-A1B2-C3D4"
}
```

## 10.7. Lấy QR code để in

```bash
# PNG (để in)
curl -X GET "http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/qr" \
  -H "Content-Type: application/json"

# SVG (vector - in chất lượng cao)
curl -X GET "http://localhost:3000/api/traceability/batch/BATCH-A1B2-C3D4/qr?format=svg"
```

---

# PHẦN 11: THIẾT BỊ IoT

## 11.1. Thêm thiết bị

```bash
curl -X POST http://localhost:3000/api/devices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cảm biến A1-01",
    "type": "sensor",
    "subtype": "temperature_humidity",
    "farm_id": "farm-abc123",
    "zone": "A1",
    "location": "Nhà kính A1"
  }'
```

## 11.2. Xem danh sách thiết bị

```bash
curl -X GET "http://localhost:3000/api/devices/?farm_id=farm-abc123" \
  -H "Authorization: Bearer $TOKEN"
```

## 11.3. Điều khiển thiết bị

```bash
# Bật relay
curl -X POST http://localhost:3000/api/devices/device-abc123/action \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "relay_on",
    "relay": 1
  }'

# Tắt relay
curl -X POST http://localhost:3000/api/devices/device-abc123/action \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "relay_off",
    "relay": 1
  }'

# Bật quạt
curl -X POST http://localhost:3000/api/devices/device-abc123/action \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "fan_on"}'

# Bật máy bơm
curl -X POST http://localhost:3000/api/devices/device-abc123/action \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "pump_on"}'
```

## 11.4. Xem dữ liệu cảm biến

```bash
curl -X GET "http://localhost:3000/api/devices/device-abc123/telemetry" \
  -H "Authorization: Bearer $TOKEN"
```

## 11.5. Cập nhật firmware (OTA)

```bash
curl -X POST http://localhost:3000/api/ota/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "device-abc123"
  }'
```

---

# PHẦN 12: BẢO MẬT

## 12.1. Tạo API key cho thiết bị

```bash
curl -X POST http://localhost:3000/api/security/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ESP32-A1-Sensor",
    "deviceId": "device-abc123",
    "permissions": ["telemetry:write"],
    "expires_at": "2027-12-31"
  }'
```

**QUAN TRỌNG:** Lưu lại `key` ngay lập tức - sẽ không hiển thị lại!

## 12.2. Thêm IP vào whitelist

```bash
curl -X POST http://localhost:3000/api/security/ip-whitelist \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.100",
    "description": "Server AI",
    "expires_at": "2027-12-31"
  }'
```

## 12.3. Xem nhật ký audit

```bash
curl -X GET "http://localhost:3000/api/security/audit-log?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

## 12.4. Xem phiên đang hoạt động

```bash
curl -X GET http://localhost:3000/api/security/sessions \
  -H "Authorization: Bearer $TOKEN"
```

## 12.5. Đóng phiên

```bash
curl -X DELETE http://localhost:3000/api/security/sessions/session-abc123 \
  -H "Authorization: Bearer $TOKEN"
```

## 12.6. Quét bảo mật

```bash
curl -X GET http://localhost:3000/api/security/security-scan \
  -H "Authorization: Bearer $TOKEN"
```

---

# PHẦN 13: CÁC LỖI THƯỜNG GẶP

## 13.1. "Invalid credentials"

**Nguyên nhân:** Sai email hoặc password

**Giải pháp:** Kiểm tra lại thông tin đăng nhập

## 13.2. "Access token required"

**Nguyên nhân:** Chưa gửi token

**Giải pháp:** Thêm `-H "Authorization: Bearer YOUR_TOKEN"`

## 13.3. "Invalid or expired access token"

**Nguyên nhân:** Token hết hạn

**Giải pháp:** Gọi API refresh để lấy token mới:
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 13.4. "Farm not found"

**Nguyên nhần:** Sai farm_id

**Giải pháp:** Xem danh sách farm:
```bash
curl -X GET http://localhost:3000/api/farms \
  -H "Authorization: Bearer $TOKEN"
```

---

# PHẦN 14: CHECKLIST NHANH

Đây là các bước cơ bản để bắt đầu sử dụng:

## Ngày 1: Cài đặt
- [ ] Cài đặt Node.js
- [ ] Clone và cài đặt code
- [ ] Tạo database (npm run migrate)
- [ ] Chạy server (npm start)
- [ ] Đăng ký tài khoản admin

## Ngày 2: Thiết lập cơ bản
- [ ] Tạo organization
- [ ] Tạo farm
- [ ] Thêm thiết bị máy móc
- [ ] Thêm công nhân

## Ngày 3: Vận hành
- [ ] Thêm vật tư vào kho
- [ ] Ghi nhận giao dịch tài chính
- [ ] Tạo ca làm và chấm công

## Ngày 4: Sản xuất
- [ ] Tạo lô truy xuất nguồn gốc
- [ ] Thêm giai đoạn chăm sóc
- [ ] Đánh dấu thu hoạch

## Hàng ngày:
- [ ] Xem dashboard
- [ ] Kiểm tra cảnh báo
- [ ] Ghi chép công việc

---

# LIÊN HỆ HỖ TRỢ

Nếu gặp khó khăn:
- Email: support@ecosyntech.com
- Điện thoại: 1900 xxxx
- Website: https://ecosyntech.com

**Tài liệu Version:** 2.0.0  
**Cập nhật:** 2026-05-02  
**EcoSynTech Local Core V5.1**