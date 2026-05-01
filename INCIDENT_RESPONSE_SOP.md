# Quy trình xử lý sự cố an ninh (Incident Response SOP)

**Last Updated:** 2026-05-01  
**Version:** 1.0.0

---

## 1. Mục đích

Quy trình này hướng dẫn cách phát hiện, báo cáo, và xử lý các sự cố an ninh trong hệ thống EcoSynTech FarmOS.

## 2. Phạm vi

Áp dụng cho:
- Tấn công mạng (DDoS, SQL injection, XSS)
- Rò rỉ dữ liệu
- Xâm nhập hệ thống
- Malware/virus
- Mất mát thiết bị

## 3. Giai đoạn xử lý

### 3.1 Phát hiện (Detection)

| Hoạt động | Mô tả |
|-----------|-------|
| Monitoring | Alert từ hệ thống giám sát |
| User report | Báo cáo từ người dùng |
| SIEM | Phát hiện bất thường |

### 3.2 Phân loại (Classification)

| Mức độ | Thời gian phản hồi | Ví dụ |
|--------|-------------------|-------|
| Critical | 15 phút | Data breach, system compromise |
| High | 1 giờ | DDoS attack, malware |
| Medium | 4 giờ | Suspicious activity, failed login |
| Low | 24 giờ | Policy violation |

### 3.3 Phản hồi (Response)

1. **Isolate**: Cách ly hệ thống bị ảnh hưởng
2. **Contain**: Ngăn chặn lan rộng
3. **Eradicate**: Loại bỏ nguyên nhân
4. **Recover**: Khôi phục hệ thống
5. **Review**: Rút kinh nghiệm

### 3.4 Báo cáo (Reporting)

- Báo cáo nội bộ: Trong 24h
- Báo cáo quản lý: Trong 48h
- Báo cáo pháp lý: Theo quy định PDP

## 4. Liên hệ khẩn cấp

| Vai trò | Liên hệ |
|---------|---------|
| Security Lead | security@ecosyntech.vn |
| CTO | cto@ecosyntech.vn |
| Legal | legal@ecosyntech.vn |

## 5. Biểu mẫu báo cáo sự cố

```
[Incident Report]
- ID: INC-YYYY-MM-DD-XXX
- Ngày phát hiện: 
- Người phát hiện:
- Mức độ:
- Mô tả:
- Hành động đã thực hiện:
- Kết quả:
```

---

**Document Owner:** Security Team  
**Next Review:** 2026-11-01