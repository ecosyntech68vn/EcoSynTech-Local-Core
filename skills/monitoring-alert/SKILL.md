# EcoSynTech Monitoring & Alert Skill

## Mô tả
Skill giám sát và cảnh báo tự động cho hệ thống IoT nông nghiệp.

## Tính năng

### 1. Giám sát theo thời gian thực
- Theo dõi sensor readings từ ESP32 devices
- Phát hiện outliers (Z-score > 3)
- Phát hiện spikes (thay đổi > 50%)
- Theo dõi trạng thái thiết bị (online/offline)

### 2. Hệ thống cảnh báo
- **Telegram**: Gửi cảnh báo qua Telegram Bot
- **Zalo**: Gửi cảnh báo qua Zalo OA
- **Cooldown**: Tránh spam cảnh báo (5 phút/cùng loại)

### 3. Alert Types
| Loại | Severity | Mô tả |
|------|----------|-------|
| SENSOR_OUTLIER | warning | Giá trị bất thường |
| SENSOR_SPIKE | warning | Thay đổi đột ngột |
| SENSOR_INVALID | error | Giá trị không hợp lệ |
| DEVICE_OFFLINE | critical | Thiết bị mất kết nối |
| RULE_TRIGGERED | info | Rule được kích hoạt |
| LOGIN_LOCKOUT | critical | Tài khoản bị khóa |

## Cấu hình

### Environment Variables

```bash
# Bật/tắt alerts
ALERT_ENABLED=true

# Telegram
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Zalo
ZALO_ENABLED=true
ZALO_ACCESS_TOKEN=your_zalo_access_token_here
ZALO_USER_ID=your_user_id_here
```

### Cách lấy Telegram Bot Token
1. Mở Telegram và tìm @BotFather
2. Gửi `/newbot` để tạo bot mới
3. Copy token được cấp

### Cách lấy Telegram Chat ID
1. Thêm bot vào group hoặc chat với bot
2. Truy cập: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Copy `chat.id` từ response

### Cách lấy Zalo OA Access Token
1. Đăng ký Zalo Official Account
2. Truy cập Zalo OA Dashboard
3. Tạo app và lấy access token

## API Endpoints

```bash
# Test alert configuration
POST /api/alerts/notification/test

# Gửi alert thủ công
POST /api/alerts/notification/send
{
  "alertType": "SYSTEM_ERROR",
  "data": { "message": "Custom message" }
}

# Lấy lịch sử alert
GET /api/alerts/notification/history?limit=10

# Lấy thống kê alert
GET /api/alerts/notification/stats
```

## Tích hợp tự động

### Khi phát hiện outliers:
- Alert tự động gửi qua Telegram/Zalo
- Log vào `data_quality_log` table

### Khi thiết bị offline:
- Alert gửi ngay lập tức
- Cooldown 5 phút để tránh spam

## Ví dụ Alert Message

```
🔴 *EcoSynTech Alert*
━━━━━━━━━━━━━━━━━━━━━
🔔 SENSOR_OUTLIER
🕐 28/04/2026 14:30:00

📡 Thiết bị: ESP32-001
🌡️ Cảm biến: temperature
📊 Giá trị: 85.23
📈 Z-score: 4.52

━━━━━━━━━━━━━━━━━━━━━
```