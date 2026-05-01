# Kiến trúc hệ thống EcoSynTech FarmOS

**Version:** 1.0.0  
**Last Updated:** 2026-05-01

---

## Tổng quan kiến trúc

EcoSynTech FarmOS sử dụng kiến trúc hai phiên bản:

### EcoSynTech Lite
- Dành cho hộ nông dân nhỏ, HTX quy mô nhỏ
- Tối ưu RAM 1-2GB, không cần AI/LLM bên ngoài
- Chạy offline-first với SMS fallback
- Giao diện tiếng Việt ưu tiên

### EcoSynTech Pro
- Dành cho HTX lớn, doanh nghiệp nông nghiệp
- Tích hợp đầy đủ SmartAutomationEngine với 9 AI Agents
- Hỗ trợ tối đa 100 thiết bị ESP32
- Đầy đủ tính năng báo cáo và phân tích

## Thành phần chính

| Thành phần | Mô tả |
|------------|-------|
| API Server | Node.js/Express với middleware bảo mật |
| Database | SQLite với prepared statement caching |
| IoT Layer | ESP32 integration với secure baseline |
| AI Engine | SmartAutomationEngine với context learning |
| Monitoring | Health check, telemetry, alerting |

## ISO 27001:2022 Compliance

- A.8.24: Key Rotation Service (auto-rotate 90 days)
- A.8.9: ESP32 Secure Baseline Config
- A.8.12: Data Leakage Prevention Middleware

---

**Document Owner:** Engineering Team  
**Next Review:** 2026-11-01