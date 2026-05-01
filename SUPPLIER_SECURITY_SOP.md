# Quy trình quản lý an ninh nhà cung cấp (Supplier Security SOP)

**Last Updated:** 2026-05-01  
**Version:** 1.0.0

---

## 1. Mục đích

Đảm bảo tất cả nhà cung cấp và đối tác của EcoSynTech FarmOS tuân thủ các yêu cầu an ninh tối thiểu.

## 2. Phạm vi

- Nhà cung cấp cloud (AWS, Azure)
- Nhà cung cấp IoT hardware
- Đối tác tích hợp API
- Nhà cung cấp AI/ML

## 3. Quy trình đánh giá

### 3.1 Đánh giá trước hợp tác

| Bước | Hoạt động |
|------|-----------|
| 1 | Thu thập thông tin nhà cung cấp |
| 2 | Đánh giá security questionnaire |
| 3 | Review certifications (ISO 27001, SOC2) |
| 4 | Kiểm tra data center location |
| 5 | Phê duyệt bởi Security Team |

### 3.2 Tiêu chí đánh giá

| Tiêu chí | Yêu cầu tối thiểu |
|----------|-------------------|
| ISO 27001 | Khuyến nghị |
| Data encryption | AES-256 |
| Access control | RBAC, MFA |
| Backup | Daily automated |
| SLA | 99.9% uptime |

### 3.3 Đánh giá định kỳ

- **Hàng năm**: Review toàn diện
- **Hàng quý**: Check compliance status
- **Khi có sự cố**: Emergency review

## 4. Hợp đồng

Mọi nhà cung cấp phải ký:
- NDA (Non-Disclosure Agreement)
- Data Processing Agreement (DPA)
- Security Requirements Addendum

## 5. Giám sát

| Hoạt động | Tần suất |
|-----------|----------|
| Security metrics review | Hàng tháng |
| Incident notification | Realtime |
| Audit report submission | Hàng năm |

## 6. Khi vi phạm

1. Thông báo trong 24h
2. Đánh giá impact
3. Yêu cầu remediation trong 30 ngày
4. Suspend hoặc terminate nếu không đạt

---

**Document Owner:** Procurement Team  
**Next Review:** 2026-11-01