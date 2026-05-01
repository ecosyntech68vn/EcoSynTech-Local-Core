# Đăng ký rủi ro (Risk Register)

**Last Updated:** 2026-05-01  
**Version:** 1.0.0

---

## Tổng quan

Tài liệu theo dõi các rủi ro đã xác định và biện pháp xử lý cho hệ thống EcoSynTech FarmOS.

## Danh sách rủi ro

| ID | Rủi ro | Mức độ | Xác suất | Biện pháp xử lý | Trạng thái |
|----|--------|--------|----------|-----------------|------------|
| R001 | Tấn công DDoS | Cao | Trung bình | WAF, rate limiting, CDN | Đang theo dõi |
| R002 | Rò rỉ dữ liệu | Cao | Thấp | Encryption, DLP middleware | Giảm thiểu |
| R003 | Thiết bị IoT bị xâm nhập | Trung bình | Trung bình | ESP32 secure baseline, mTLS | Giảm thiểu |
| R004 | Mất dữ liệu | Cao | Thấp | Backup tự động, DR plan | Giảm thiểu |
| R005 | AI đưa ra quyết định sai | Trung bình | Thấp | Human-in-loop, logging | Chấp nhận |
| R006 | Nhà cung cấp bị compromise | Trung bình | Thấp | Vendor security assessment | Giảm thiểu |
| R007 | Tuân thủ ISO không đạt | Cao | Thấp | Gap analysis, remediation | Đang theo dõi |

## Quy trình quản lý rủi ro

1. **Nhận diện**: Phân tích threats, vulnerabilities
2. **Đánh giá**: Tính risk score (impact x likelihood)
3. **Xử lý**: Mitigate, transfer, accept, avoid
4. **Giám sát**: Theo dõi và cập nhật liên tục
5. **Báo cáo**: Review hàng quý với management

## Thang đánh giá

| Mức độ | Mô tả |
|--------|-------|
| Cao | Cần hành động ngay |
| Trung bình | Cần kế hoạch xử lý |
| Thấp | Giám sát định kỳ |

---

**Document Owner:** Security Team  
**Next Review:** 2026-11-01