# Chính sách an ninh thông tin (ISMS Policy)

**Last Updated:** 2026-05-01  
**Version:** 1.0.0

---

## 1. Mục tiêu

Chính sách này thiết lập khung quản lý an ninh thông tin cho EcoSynTech FarmOS, đảm bảo:

- Bảo vệ dữ liệu khách hàng và hệ thống
- Tuân thủ ISO 27001:2022 và quy định PDP/Vietnam
- Liên tục cải thiện an ninh

## 2. Phạm vi

Áp dụng cho:
- Tất cả nhân viên và đối tác
- Hệ thống FarmOS (API, Database, IoT)
- Dữ liệu và quy trình xử lý

## 3. Trách nhiệm

| Vai trò | Trách nhiệm |
|---------|-------------|
| CTO | Giám sát triển khai ISMS |
| Security Team | Đánh giá rủi ro, xử lý sự cố |
| Dev Team | Phát triển bảo mật, code review |
| Operations | Giám sát hệ thống, backup |

## 4. Điều khiển an ninh

### 4.1 Kiểm soát truy cập

- Xác thực đa yếu tố (MFA)
- Phân quyền theo vai trò (RBAC)
- Review quyền hàng quý

### 4.2 Mã hóa

- AES-256 cho dữ liệu nhạy cảm
- TLS 1.3 cho truyền thông
- Key rotation 90 ngày

### 4.3 Giám sát

- Logging tất cả truy cập
- Alert real-time cho sự cố
- Audit trail cho compliance

## 5. Đào tạo

Tất cả nhân viên phải hoàn thành:
- Đào tạo an ninh cơ bản hàng năm
- Training nhận diện phishing
- Workshop ISO 27001 awareness

## 6. Đánh giá và cải tiến

- Đánh giá nội bộ: Hàng quý
- Đánh giá bên ngoài: Hàng năm
- Review chính sách: 6 tháng/lần

---

**Document Owner:** Security Team  
**Next Review:** 2026-11-01