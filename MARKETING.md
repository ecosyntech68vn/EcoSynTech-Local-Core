# 🌱 ECOSYNTECH FARM OS
## Nền Tảng Nông Nghiệp Thông Minh Toàn Diện

---

## 🚀 GIỚI THIỆU

**ECOSYNTECH FARM OS** là hệ thống IoT nông nghiệp thông minh do **EcoSynTech Global** phát triển - giải pháp end-to-end cho mọi quy mô trồng trọt, từ vườn mini 5m² đến trang trại 50 hecta.

> **🚀 Slogan:** *"Cắm là chạy - Nông nghiệp thông minh cho mọi người"*

### 🎯 Điểm khác biệt

| Đặc điểm | ECOSYNTECH | Giải pháp khác |
|----------|-----------|----------------|
| **Setup** | Cắm USB/WiFi là chạy | Cần kỹ sư IT |
| **Giao diện** | Tiếng Việt | Tiếng Anh |
| **Giá** | Free → Pro | 5-10 triệu/tháng |
| **Blockchain** | Aptos (optional) | Không có |
| **QR Traceability** | Tự động từ gieo trồng | Thủ công |
| **AI Advisory** | Tích hợp miễn phí | Phụ phí |

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ECOSYNTECH ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐          ┌────────────────────┐      ┌────────────┐ │
│  │   FIRMWARE     │          │    BACKEND API     │      │   MOBILE   │ │
│  │   ESP32        │◄────────►│    (Node.js)       │◄─────►│   APP      │ │
│  │   V8.5.0       │   HTTPS  │    V2.3.2          │      │   Web UI   │ │
│  │                │          │                    │      │            │ │
│  │ • 8 Relay      │          │ • 58 Skills        │      │ • Dashboard│ │
│  │ • Sensor array │          │ • QR Traceability  │      │ • Controls │ │
│  │ • OLED Display │          │ • Blockchain        │      │ • Alerts   │ │
│  │ • MQTT/WiFi    │          │ • i18n (VI/EN/ZH)  │      │ • Reports  │ │
│  └────────────────┘          └─────────┬──────────┘      └────────────┘ │
│                                        │                                    │
│                                        ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                    GAS (Google Apps Script) V9.5                    │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │ │
│  │  │ Advisory │ │ Smart    │ │ Telegram │ │    QR    │ │  Aptos   │   │ │
│  │  │   AI     │ │ Control  │ │   Bot    │ │ Renderer │ │Blockchain│   │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │ │
│  │                                                                       │ │
│  │  ┌──────────────────────────────────────────────────────────────┐   │ │
│  │  │              GOOGLE SHEETS (Database)                        │   │ │
│  │  │  BatchInfo │ Batchsheet │ Devices │ Alerts │ Blockchain_Log   │   │ │
│  │  └──────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 SẢN PHẨM & THIẾT BỊ

### 1. Firmware ESP32 V8.5.0
- **CPU:** ESP32 dual-core 240MHz
- **WiFi:** 802.11 b/g/n
- **Bluetooth:** BLE 4.2
- **I/O:** 8 relay, 12 sensor ports
- **Display:** OLED 0.96"
- **Storage:** 4MB Flash

### 2. Tính năng Firmware
```
✓ Auto-connect WiFi
✓ Auto-post data every 10 min (configurable)
✓ Deep sleep mode (tiết kiệm pin)
✓ OTA firmware update
✓ HMAC-SHA256 security
✓ Local display + button control
✓ MQTT + HTTP fallback
```

### 3. PCB V6.3 - Mainboard
- PCB thiết kế chuyên dụng
- 8 kênh relay 10A
- 12 cổng sensor (DS18B20, DHT22, Soil, pH, EC...)
- Nguồn 12V/5V stable
- Case nhựa ABS bảo vệ

---

## 💡 TÍNH NĂNG NỔI BẬT

### 🌟 QR Code Traceability - Truy xuất nguồn gốc

**Tự động từ khi gieo trồng:**
```
📱 Tạo lô → 🎫 QR Code tự động
       ↓
🌱 Gieo trồng → 📝 Thêm stage (gieo, chăm sóc)
       ↓
💧 Tưới nước → 📊 Auto log từ sensor
       ↓
🌾 Thu hoạch → ⛓️ Hash lên Aptos (nếu bật)
       ↓
📦 Đóng gói → 🖨️ In QR label
       ↓
🚚 Xuất bán → 🔍 Scan verify
       ↓
✅ Khách hàng → 📱 Xem toàn bộ journey
```

**Cho nông dân:** Không cần hiểu blockchain - hệ thống tự động!

### 🤖 AI Advisory Engine

**Tự động phân tích & cảnh báo:**
| Sensor | Threshold | Action |
|--------|-----------|--------|
| Nhiệt độ > 38°C | Cảnh báo nóng | Telegram alert |
| Độ ẩm < 45% | Cảnh báo khô | Gợi ý tưới |
| Độ ẩm đất < 30% | Auto bật máy bơm | Rule trigger |
| pH < 5.5 / > 7.5 | Cảnh báo pH | Alert + khuyến nghị |
| Battery < 3.5V | Cảnh báo pin | Alert |

**AI dự đoán:**
- 📈 Ngày thu hoạch tối ưu
- 🦟 Nguy cơ sâu bệnh
- 💧 Lịch tưới tối ưu

### 🔗 Smart Control Engine

**Tự động điều khiển:**
```javascript
// Ví dụ rule
{
  name: "Tưới khi đất khô",
  condition: "soil_moisture < 30",
  action: "relay1_on",
  duration: 300,      // 5 phút
  cooldown: 1800,     // 30 phút
  hysteresis: 5      // tránh on/off liên tục
}
```

**Hỗ trợ:**
- ✅ Hysteresis (tránh rung)
- ✅ Cooldown (chống spam)
- ✅ Reset action (tắt sau X phút)
- ✅ Manual override

### 📱 Telegram Bot

```
/start      - Khởi động bot
/status     - Trạng thái hệ thống  
/sensors    - Dữ liệu cảm biến mới nhất
/alerts     - Cảnh báo đang hoạt động
/batches    - Danh sách lô hàng
/devices    - Thiết bị đang hoạt động
/rules      - Quy tắc đang chạy
/help       - Trợ giúp
```

### ⛓️ Aptos Blockchain

- **Ghi hash** khi thu hoạch, xuất bán, chứng nhận
- **Toggle** bật/tắt (mặc định: tắt)
- **Mainnet** + Testnet support
- **Batch 7 ngày** - tránh spam

---

## 👥 ĐỐI TƯỢNG KHÁCH HÀNG

### 🎯 Mục tiêu chính

| Đối tượng | Vấn đề | Giải pháp ECOSYNTECH |
|-----------|--------|---------------------|
| **Nông dân truyền thống** | Thiếu kiến thức IT | "Cắm là chạy", tiếng Việt |
| **Homesteader** | Không có thời gian | Auto tưới, auto báo |
| **Thủy canh (Hydro)** | Khó kiểm soát pH/EC | Monitor tự động, cảnh báo |
| **Aquaponic** | Chất lượng nước | Sensor NH3, NO2, auto điều chỉnh |
| **Nhà kính** | Quản lý vi khí hậu | Điều khiển đèn, quạt, tưới |
| **Trang trại lớn** | Nhiều zone | Multi-farm, central control |
| **HTX/Doanh nghiệp** | Cần chứng nhận | QR + Blockchain xuất khẩu |

### 💰 Phân khúc giá

| Gói | Giá | Phù hợp | Tính năng |
|-----|------|---------|-----------|
| **Free** | 0đ | Thử nghiệm | 3 sensor, 1 device, no blockchain |
| **Basic** | 99k/tháng | Nông dân/homesteader | 10 sensor, 5 device, QR code |
| **Pro** | 299k/tháng | Thủy canh/aquaponic | Unlimited, auto control, AI |
| **Business** | Liên hệ | Doanh nghiệp/HTX | Multi-farm, blockchain, API |

---

## 🔧 THÔNG SỐ KỸ THUẬT

### Firmware ESP32 V8.5.0
| Thông số | Giá trị |
|----------|---------|
| MCU | ESP32 dual-core 240MHz |
| Flash | 4MB |
| RAM | 512KB |
| WiFi | 802.11 b/g/n 2.4GHz |
| Bluetooth | BLE 4.2 |
| Relay | 8 kênh (10A/kênh) |
| Sensor Ports | 12 ports |
| Display | OLED 0.96" 128x64 |
| Power | 12V DC |
| Size | 120x80mm |

### Backend API V2.3.2
| Thông số | Giá trị |
|----------|---------|
| Platform | Node.js + Express |
| Database | SQLite (sql.js) |
| Skills | 58 automated |
| API | REST + WebSocket |
| Security | JWT, RBAC, Rate Limit |
| i18n | VI, EN, ZH |
| RAM tối thiểu | 512MB |
| Compatible | Windows 7+ |

---

## 📊 SO SÁNH

| Tính năng | ECOSYNTECH | Giải pháp A | Giải pháp B |
|-----------|-----------|-------------|-------------|
| **Skills tự động** | 58+ | 5-10 | 2-5 |
| **QR Traceability** | ✅ Tự động | ❌ | Thủ công |
| **Blockchain** | Aptos | ❌ | ❌ |
| **AI Advisory** | ✅ Miễn phí | Phụ phí | Phụ phí |
| **Telegram Bot** | ✅ | ❌ | ✅ |
| **Giá/min** | 99k | 300k+ | 200k+ |
| **RAM tối thiểu** | 512MB | 2GB | 1GB |

---

## 🛠️ SETUP "CẮM LÀ CHẠY"

### Bước 1: Kết nối thiết bị
```
🔌 Cấp nguồn 12V
📡 Kết nối WiFi (SSID/Password)
🔗 Kết nối sensor (cắm là nhận)
```

### Bước 2: Cấu hình
```
📱 Truy cập web dashboard
➡️ Thêm thiết bị
➡️ Đặt tên zone
➡️ Thiết lập ngưỡng
```

### Bước 3: Bắt đầu
```
🚀 Auto start
📊 Xem dashboard
🔔 Nhận Telegram alerts
📦 Tạo QR đầu tiên
```

**Thời gian setup:** 5 phút!

---

## 📈 CASE STUDIES

### 🥬 Vườn rau thủy canh 20m²
- **Vấn đề:** Khó kiểm soát pH, EC
- **Giải pháp:** Basic + 6 sensor
- **Kết quả:** pH ổn định 5.8-6.2, giảm 50% thất bại

### 🐟 Farm cá rồng Aquaponic 50m²
- **Vấn đề:** Chất lượng nước
- **Giải pháp:** Pro + sensor NH3/NO2/pH
- **Kết quả:** Tự động báo, giảm 80% tỷ lệ chết

### 🌾 Trang trại 5 hecta
- **Vấn đề:** Quản lý nhiều zone
- **Giải pháp:** Business + multi-farm
- **Kết quả:** Central control, QR xuất khẩu

---

## 📞 LIÊN HỆ

**EcoSynTech Global**

- 🌐 Website: [sẽ cập nhật]
- 📧 Email: [sẽ cập nhật]
- 📱 Hotline: [sẽ cập nhật]
- 💬 Zalo: [sẽ cập nhật]

---

## 📝 VERSION LOG

| Version | Ngày | Nội dung |
|---------|------|----------|
| **V2.3.2** | 2026-04-17 | 58 skills, QR traceability, Aptos blockchain |
| **GAS V9.5** | 2026-04-16 | AI Advisory, Smart Control, Telegram Bot |
| **Firmware V8.5.0** | 2026-04-10 | ESP32 production ready |

---

## 🏷️ THƯƠNG HIỆU

**ECOSYNTECH FARM OS**  
*"Nông nghiệp thông minh - Cho nông dân, cho mọi người"*

🌱🚀 **"Cắm là chạy!"** 🚀🌱

---

*© 2026 EcoSynTech Global. All rights reserved.*