/**
 * EcoSynTech Mobile - Main App Module
 * Contains all page rendering and business logic
 */

class AppModule {
  constructor() {
    this.sensorData = {};
    this.deviceData = {};
    this.alertData = [];
    this.cropData = [];
    this.lastRefresh = null;
    this.refreshInterval = null;
  }

  init() {
    this.loadInitialData();
    this.startAutoRefresh();
  }

  async loadInitialData() {
    await this.refreshData();
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => this.refreshData(), 30000);
  }

  async refreshData() {
    try {
      const [sensors, devices, alerts] = await Promise.all([
        window.ecoApi.getSensors().catch(() => ({})),
        window.ecoApi.getDevices().catch(() => ({})),
        window.ecoApi.getAlerts().catch(() => [])
      ]);

      this.sensorData = this.flattenSensorData(sensors);
      this.deviceData = devices;
      this.alertData = alerts;
      this.lastRefresh = new Date();

      this.updateConnectionStatus(true);
      this.cacheData();
    } catch (error) {
      console.error('Data refresh error:', error);
      this.updateConnectionStatus(false);
      this.loadCachedData();
    }
  }

  flattenSensorData(data) {
    if (!data) return {};
    if (Array.isArray(data)) {
      const result = {};
      data.forEach(s => { result[s.type] = { value: s.value, unit: s.unit }; });
      return result;
    }
    return data;
  }

  cacheData() {
    const data = {
      sensors: this.sensorData,
      devices: this.deviceData,
      alerts: this.alertData,
      timestamp: Date.now()
    };
    localStorage.setItem('eco_app_data', JSON.stringify(data));
  }

  loadCachedData() {
    try {
      const cached = JSON.parse(localStorage.getItem('eco_app_data'));
      if (cached) {
        this.sensorData = cached.sensors || {};
        this.deviceData = cached.devices || {};
        this.alertData = cached.alerts || [];
      }
    } catch (e) {}
  }

  updateConnectionStatus(online) {
    const dot = document.getElementById('connectionStatus');
    if (dot) {
      dot.classList.toggle('offline', !online);
      dot.title = online ? 'Online' : 'Offline';
    }
  }

  getTimeString() {
    return this.lastRefresh ? 'Cập nhật: ' + this.lastRefresh.toLocaleTimeString('vi-VN') : '';
  }

  // ==================== DASHBOARD ====================
  renderDashboard() {
    const content = document.getElementById('appContent');
    const timeStr = this.getTimeString();

    const sensors = [
      { key: 'soil_moisture', label: 'Độ ẩm đất', icon: '🌱', unit: '%' },
      { key: 'temperature', label: 'Nhiệt độ', icon: '🌡️', unit: '°C' },
      { key: 'humidity', label: 'Độ ẩm', icon: '💨', unit: '%' },
      { key: 'light', label: 'Ánh sáng', icon: '☀️', unit: 'lux' }
    ];

    const sensorsHTML = sensors.map(s => {
      const val = this.sensorData[s.key]?.value ?? '--';
      return `
        <div class="card" style="cursor:pointer" onclick="appRouter.showPage('sensors')">
          <div class="card-header">
            <span class="card-icon">${s.icon}</span>
            <span class="card-title">${s.label}</span>
          </div>
          <div class="card-value">${val}<span class="card-unit">${s.unit}</span></div>
        </div>
      `;
    }).join('');

    const alertsSummary = this.alertData.slice(0, 3).map(a => `
      <div class="alert-item ${a.severity === 'critical' ? 'critical' : ''}">
        <div class="alert-icon">${a.severity === 'critical' ? '🔴' : '⚠️'}</div>
        <div class="alert-content">
          <div class="alert-title">${a.message || a.title || 'Cảnh báo'}</div>
          <div class="alert-time">${a.timestamp || ''}</div>
        </div>
      </div>
    `).join('') || '<div class="empty-state"><p>Không có cảnh báo mới</p></div>';

    content.innerHTML = `
      <div class="greeting">
        <div class="greeting-title">Xin chào! 👋</div>
        <div class="greeting-subtitle">Đây là trang trại của bạn hôm nay</div>
        <div class="last-update">${timeStr}</div>
      </div>

      <div class="section">
        <div class="metric-grid" style="margin-bottom: 16px;">
          <div class="metric">
            <div class="metric-value">${Object.keys(this.deviceData).length || 0}</div>
            <div class="metric-label">Thiết bị</div>
          </div>
          <div class="metric">
            <div class="metric-value">${this.alertData.length || 0}</div>
            <div class="metric-label">Cảnh báo</div>
          </div>
        </div>
        <div class="grid" style="grid-template-columns: repeat(2, 1fr); gap: 12px;">
          ${sensorsHTML}
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">Điều khiển nhanh</span>
        </div>
        <div class="quick-actions">
          <div class="action-btn ${this.deviceData.pump?.status === 'on' ? 'active' : ''}" id="act-pump" onclick="appModule.toggleDevice('pump')">
            <div class="action-btn-icon">💦</div>
            <div class="action-btn-label">Bơm nước</div>
          </div>
          <div class="action-btn ${this.deviceData.fan?.status === 'on' ? 'active' : ''}" id="act-fan" onclick="appModule.toggleDevice('fan')">
            <div class="action-btn-icon">🌀</div>
            <div class="action-btn-label">Quạt</div>
          </div>
          <div class="action-btn ${this.deviceData.light?.status === 'on' ? 'active' : ''}" id="act-light" onclick="appModule.toggleDevice('light')">
            <div class="action-btn-icon">💡</div>
            <div class="action-btn-label">Đèn</div>
          </div>
          <div class="action-btn" onclick="appModule.refreshData()">
            <div class="action-btn-icon">🔄</div>
            <div class="action-btn-label">Làm mới</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">Cảnh báo (${this.alertData.length})</span>
          <span class="section-action" onclick="appRouter.showPage('alerts')">Xem tất cả →</span>
        </div>
        ${alertsSummary}
      </div>
    `;
  }

  // ==================== SENSORS ====================
  renderSensors() {
    const content = document.getElementById('appContent');
    const timeStr = this.getTimeString();

    const sensors = [
      { key: 'soil_moisture', label: 'Độ ẩm đất', icon: '🌱', unit: '%', min: 0, max: 100 },
      { key: 'temperature', label: 'Nhiệt độ', icon: '🌡️', unit: '°C', min: -40, max: 80 },
      { key: 'humidity', label: 'Độ ẩm không khí', icon: '💨', unit: '%', min: 0, max: 100 },
      { key: 'light', label: 'Cường độ sáng', icon: '☀️', unit: 'lux', min: 0, max: 100000 },
      { key: 'soil_temp', label: 'Nhiệt độ đất', icon: '🌍', unit: '°C', min: -40, max: 80 },
      { key: 'ph', label: 'Độ pH đất', icon: '🧪', unit: '', min: 0, max: 14 }
    ];

    const sensorsHTML = sensors.map(s => {
      const val = this.sensorData[s.key]?.value ?? '--';
      const status = this.sensorData[s.key] ? 'online' : 'offline';
      const percent = this.sensorData[s.key] ? Math.min(100, Math.max(0, ((val - s.min) / (s.max - s.min)) * 100)) : 0;
      
      return `
        <div class="card">
          <div class="device-item" style="border: none; padding: 0;">
            <div class="device-info">
              <div class="device-icon">${s.icon}</div>
              <div>
                <div class="device-name">${s.label}</div>
                <div class="device-status ${status}">${status === 'online' ? 'Online • ' + val + s.unit : 'Offline'}</div>
              </div>
            </div>
            <div style="width: 60px; height: 60px; position: relative;">
              <svg viewBox="0 0 36 36" style="transform: rotate(-90deg);">
                <circle cx="18" cy="18" r="16" fill="none" stroke="#e0e0e0" stroke-width="3"/>
                <circle cx="18" cy="18" r="16" fill="none" stroke="${status === 'online' ? '#4CAF50' : '#f44336'}" stroke-width="3"
                  stroke-dasharray="${percent}, 100" stroke-linecap="round"/>
              </svg>
              <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">
                ${Math.round(percent)}%
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div class="greeting">
        <div class="greeting-title">Cảm biến</div>
        <div class="greeting-subtitle">${Object.keys(this.sensorData).length} thiết bị đang hoạt động</div>
        <div class="last-update">${timeStr}</div>
      </div>
      <div class="section">${sensorsHTML}</div>
    `;
  }

  // ==================== DEVICES ====================
  renderDevices() {
    const content = document.getElementById('appContent');
    const timeStr = this.getTimeString();

    const devices = [
      { key: 'pump', label: 'Máy bơm nước', icon: '💦' },
      { key: 'fan', label: 'Quạt làm mát', icon: '🌀' },
      { key: 'light', label: 'Đèn grow light', icon: '💡' },
      { key: 'valve', label: 'Van nước tự động', icon: '🎯' }
    ];

    const devicesHTML = devices.map(d => {
      const dev = this.deviceData[d.key];
      const isOn = dev?.status === 'on' || dev?.value === 1;
      
      return `
        <div class="card">
          <div class="device-item" style="border: none; padding: 0;">
            <div class="device-info">
              <div class="device-icon">${d.icon}</div>
              <div>
                <div class="device-name">${d.label}</div>
                <div class="device-status">${isOn ? 'Đang bật' : 'Tắt'}</div>
              </div>
            </div>
            <button class="device-toggle ${isOn ? 'active' : ''}" onclick="appModule.toggleDevice('${d.key}')"></button>
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div class="greeting">
        <div class="greeting-title">Thiết bị</div>
        <div class="greeting-subtitle">Điều khiển thiết bị</div>
        <div class="last-update">${timeStr}</div>
      </div>
      <div class="section">${devicesHTML}</div>
    `;
  }

  async toggleDevice(deviceId) {
    const btn = document.getElementById('act-' + deviceId);
    if (btn) btn.classList.add('active');
    showToast('Đang xử lý...');

    try {
      const result = await window.ecoApi.toggleDevice(deviceId);
      if (result.ok || result.value !== undefined) {
        const isOn = result.value === 1 || result.success;
        if (btn) btn.classList.toggle('active', isOn);
        
        // Update local state
        if (!this.deviceData[deviceId]) this.deviceData[deviceId] = {};
        this.deviceData[deviceId].status = isOn ? 'on' : 'off';
        
        showToast(isOn ? 'Đã bật!' : 'Đã tắt!', 'success');
        this.cacheData();
      }
    } catch (error) {
      showToast('Lỗi: ' + error.message, 'error');
    } finally {
      if (btn) btn.classList.remove('active');
    }
  }

  // ==================== ALERTS ====================
  renderAlerts() {
    const content = document.getElementById('appContent');

    const alertsHTML = this.alertData.length ? this.alertData.map(a => `
      <div class="alert-item ${a.severity === 'critical' ? 'critical' : ''}">
        <div class="alert-icon">${a.severity === 'critical' ? '🔴' : '⚠️'}</div>
        <div class="alert-content">
          <div class="alert-title">${a.message || a.title || 'Cảnh báo'}</div>
          <div class="alert-time">${a.timestamp || ''}</div>
        </div>
      </div>
    `).join('') : '<div class="empty-state"><div class="empty-state-icon">✅</div><p>Không có cảnh báo nào</p></div>';

    content.innerHTML = `
      <div class="greeting">
        <div class="greeting-title">Cảnh báo</div>
        <div class="greeting-subtitle">${this.alertData.length} cảnh báo</div>
      </div>
      <div class="section">${alertsHTML}</div>
    `;
  }

  // ==================== CROPS ====================
  async renderCrops() {
    const content = document.getElementById('appContent');
    content.innerHTML = '<div class="loading">Đang tải...</div>';

    try {
      const data = await window.ecoApi.getCrops();
      this.cropData = data.data || [];
      
      const cropsHTML = this.cropData.length ? this.cropData.map(c => `
        <div class="card">
          <div class="device-item" style="border: none; padding: 0;">
            <div class="device-info">
              <div class="device-icon">🌿</div>
              <div>
                <div class="device-name">${c.name || c.crop_name}</div>
                <div class="device-status">${c.status || 'active'} • ${c.area || 0} ha</div>
              </div>
            </div>
          </div>
        </div>
      `).join('') : '<div class="empty-state"><div class="empty-state-icon">🌱</div><p>Chưa có cây trồng</p></div>';

      content.innerHTML = `
        <div class="greeting">
          <div class="greeting-title">Cây trồng</div>
          <div class="greeting-subtitle">${this.cropData.length} cây trồng</div>
        </div>
        <div class="section">${cropsHTML}</div>
      `;
    } catch (error) {
      content.innerHTML = `
        <div class="greeting">
          <div class="greeting-title">Cây trồng</div>
        </div>
        <div class="section">
          <div class="empty-state">
            <div class="empty-state-icon">🌱</div>
            <p>Chưa có cây trồng</p>
          </div>
        </div>
      `;
    }
  }

  // ==================== FINANCE ====================
  renderFinance() {
    const content = document.getElementById('appContent');
    
    content.innerHTML = `
      <div class="greeting">
        <div class="greeting-title">Chi phí đầu tư</div>
        <div class="greeting-subtitle">Tính toán ROI</div>
      </div>
      
      <div class="section">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Chi phí ban đầu</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <span>Thiết bị cảm biến</span>
            <span style="font-weight: 500;">2,500,000 VNĐ</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <span>Gateway</span>
            <span style="font-weight: 500;">2,000,000 VNĐ</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <span>Cài đặt & Training</span>
            <span style="font-weight: 500;">800,000 VNĐ</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; font-weight: 600;">
            <span>Tổng đầu tư</span>
            <span style="color: var(--primary);">5,300,000 VNĐ</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Vận hành hàng năm</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <span>Cloud/năm</span>
            <span style="font-weight: 500;">1,200,000 VNĐ</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <span>Bảo trì/năm</span>
            <span style="font-weight: 500;">2,400,000 VNĐ</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; font-weight: 600;">
            <span>Tổng vận hành/năm</span>
            <span style="color: var(--warning);">3,600,000 VNĐ</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="card" style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);">
          <div class="card-header">
            <span class="card-title">Ước tính ROI</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <span>Doanh thu ước tính/năm</span>
            <span style="font-weight: 600; color: var(--success);">90,000,000 VNĐ</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border);">
            <span>Lợi nhuận ròng</span>
            <span style="font-weight: 600; color: var(--success);">86,400,000 VNĐ</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0;">
            <span>ROI</span>
            <span style="font-size: 24px; font-weight: 700; color: var(--primary);">1630%</span>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== SETTINGS ====================
  renderSettings() {
    const user = window.ecoApi.getUser() || {};
    const currentLang = localStorage.getItem('language') || 'vi';
    const currentTheme = localStorage.getItem('theme') || 'light';

    const content = document.getElementById('appContent');
    
    content.innerHTML = `
      <div class="greeting">
        <div class="greeting-title">Cài đặt</div>
        <div class="greeting-subtitle">${user.name || 'User'}</div>
      </div>

      <div class="section">
        <div class="card">
          <div class="device-item" style="border: none; padding: 0;">
            <div class="device-info">
              <div class="user-avatar" style="width: 48px; height: 48px; font-size: 20px;">${user.name?.[0] || 'U'}</div>
              <div>
                <div class="device-name">${user.name || 'User'}</div>
                <div class="device-status">${user.email || user.phone || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="device-item" style="border: none; cursor: pointer;" onclick="document.getElementById('lang-select').focus()">
            <div class="device-info">
              <div class="device-icon">🌐</div>
              <div class="device-name">Ngôn ngữ</div>
            </div>
            <select id="lang-select" style="border: none; background: transparent; font-size: 14px;" onchange="appModule.setLanguage(this.value)">
              <option value="vi" ${currentLang === 'vi' ? 'selected' : ''}>🇻🇳 Tiếng Việt</option>
              <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇬🇧 English</option>
              <option value="zh" ${currentLang === 'zh' ? 'selected' : ''}>🇨🇳 中文</option>
            </select>
          </div>
        </div>

        <div class="card">
          <div class="device-item" style="border: none; cursor: pointer;" onclick="document.getElementById('theme-select').focus()">
            <div class="device-info">
              <div class="device-icon">🎨</div>
              <div class="device-name">Giao diện</div>
            </div>
            <select id="theme-select" style="border: none; background: transparent; font-size: 14px;" onchange="appModule.setTheme(this.value)">
              <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>☀️ Sáng</option>
              <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>🌙 Tối</option>
            </select>
          </div>
        </div>

        <div class="card">
          <div class="device-item" style="border: none; cursor: pointer;" onclick="appModule.clearCache()">
            <div class="device-info">
              <div class="device-icon">🗑️</div>
              <div class="device-name">Xóa cache</div>
            </div>
            <span style="color: var(--text-muted);">→</span>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="device-item" style="border: none;">
            <div class="device-info">
              <div class="device-icon">ℹ️</div>
              <div class="device-name">Thông tin</div>
            </div>
          </div>
          <div style="padding: 12px; color: var(--text-secondary); font-size: 13px;">
            <p>Phiên bản: 1.2.0</p>
            <p style="margin-top: 8px;">EcoSynTech FarmOS PRO</p>
            <p>© 2026 EcoSynTech Global</p>
          </div>
        </div>
      </div>
    `;
  }

  setLanguage(lang) {
    localStorage.setItem('language', lang);
    showToast('Đã đổi ngôn ngữ', 'success');
  }

  setTheme(theme) {
    localStorage.setItem('theme', theme);
    showToast('Đã đổi giao diện', 'success');
  }

  clearCache() {
    localStorage.removeItem('eco_app_data');
    localStorage.removeItem('eco_user');
    showToast('Đã xóa cache', 'success');
  }

  // ==================== VOICE COMMAND ====================
  processVoice(query) {
    query = query.toLowerCase();
    let response = 'Tôi không hiểu.';
    let action = null;

    if (query.includes('bật') && query.includes('bơm')) {
      this.toggleDevice('pump');
      response = 'Đã bật máy bơm!';
      action = 'dashboard';
    } else if (query.includes('tắt') && query.includes('bơm')) {
      this.toggleDevice('pump');
      response = 'Đã tắt máy bơm!';
      action = 'dashboard';
    } else if (query.includes('bật') && query.includes('quạt')) {
      this.toggleDevice('fan');
      response = 'Đã bật quạt!';
    } else if (query.includes('tắt') && query.includes('quạt')) {
      this.toggleDevice('fan');
      response = 'Đã tắt quạt!';
    } else if (query.includes('nhiệt độ') || query.includes('nhiệt')) {
      const temp = this.sensorData.temperature?.value;
      response = temp ? 'Nhiệt độ hiện tại là ' + temp + ' độ C.' : 'Không có dữ liệu nhiệt độ.';
    } else if (query.includes('ẩm') || query.includes('độ ẩm')) {
      const hum = this.sensorData.soil_moisture?.value;
      response = hum ? 'Độ ẩm đất là ' + hum + ' phần trăm.' : 'Không có dữ liệu.';
    } else if (query.includes('cảnh báo')) {
      response = 'Có ' + this.alertData.length + ' cảnh báo.';
      action = 'alerts';
    } else if (query.includes('làm mới') || query.includes('refresh')) {
      this.refreshData();
      response = 'Đã cập nhật dữ liệu!';
    } else if (query.includes('trang chủ') || query.includes('dashboard')) {
      action = 'dashboard';
      response = 'Đang chuyển về trang chủ...';
    }

    showToast(response, action ? 'success' : '');
    if (action) {
      setTimeout(() => appRouter.showPage(action), 1000);
    }
  }

  setupEventListeners() {
    // Already set up in onclick handlers
  }
}

// Initialize
window.appModule = new AppModule();

// Start app after auth
document.addEventListener('DOMContentLoaded', () => {
  if (window.ecoApi.isAuthenticated()) {
    window.appModule.init();
  }
});