# Quy trình đảm bảo liên tục kinh doanh (Business Continuity SOP)

**Last Updated:** 2026-05-01  
**Version:** 1.0.0

---

## 1. Mục đích

Đảm bảo hệ thống EcoSynTech FarmOS có thể tiếp tục hoạt động và khôi phục nhanh chóng sau sự cố.

## 2. Phạm vi

- Hệ thống API server
- Cơ sở dữ liệu
- Hạ tầng IoT
- Dịch vụ AI

## 3. Chiến lược phục hồi

### 3.1 RTO (Recovery Time Objective)

| Dịch vụ | RTO |
|---------|-----|
| API Server | 1 giờ |
| Database | 4 giờ |
| IoT Layer | 2 giờ |
| AI Services | 4 giờ |

### 3.2 RPO (Recovery Point Objective)

| Dịch vụ | RPO |
|---------|-----|
| Database | 15 phút |
| Config | 1 giờ |
| Logs | 24 giờ |

## 4. Kế hoạch dự phòng

### 4.1 Backup

- **Tự động**: Hàng ngày lúc 00:00 UTC
- **Manual**: Trước mỗi deployment
- **Offsite**: Lưu trữ trên cloud (AWS S3)

### 4.2 Redundancy

- Load balancer cho API
- Database replication
- Multiple ESP32 gateways

### 4.3 Failover

1. Auto-fail khi primary down
2. DNS switch cho external services
3. SMS notification cho operations team

## 5. Kiểm tra

| Loại | Tần suất | Người thực hiện |
|------|----------|-----------------|
| Backup test | Hàng tuần | DevOps |
| DR drill | Hàng quý | Security Team |
| Full simulation | Hàng năm | All teams |

## 6. Sau sự cố

1. **Post-mortem**: Phân tích nguyên nhân trong 48h
2. **Fix**: Triển khai biện pháp cải thiện
3. **Update**: Cập nhật SOP nếu cần
4. **Train**: Đào tạo team về lessons learned

---

**Document Owner:** Operations Team  
**Next Review:** 2026-11-01