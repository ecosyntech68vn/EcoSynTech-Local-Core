/**
 * EcoSynTech Mobile - API Service
 * Handles all API communications with the backend
 */

import API_BASE = (window.Capacitor && window.Capacitor.isNativePlatform)
  ? 'http://10.0.2.2:3000'
  : (window.location.origin || 'http://localhost:3000');

import WS_URL = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + (window.location.hostname || 'localhost') + ':3000/ws';

class ApiService {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    this.init();
  }

  init() {
    this.token = localStorage.getItem('eco_token');
    this.refreshToken = localStorage.getItem('eco_refresh_token');
    const userData = localStorage.getItem('eco_user');
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (e) {}
    }
  }

  setAuth(token, refreshToken, user) {
    this.token = token;
    this.refreshToken = refreshToken;
    this.user = user;
    localStorage.setItem('eco_token', token || '');
    localStorage.setItem('eco_refresh_token', refreshToken || '');
    localStorage.setItem('eco_user', JSON.stringify(user || {}));
  }

  clearAuth() {
    this.token = null;
    this.refreshToken = null;
    this.user = null;
    localStorage.removeItem('eco_token');
    localStorage.removeItem('eco_refresh_token');
    localStorage.removeItem('eco_user');
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  async request(endpoint, options = {}) {
    const url = API_BASE + endpoint;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          const refreshed = await this.refreshSession();
          if (refreshed) {
            return this.request(endpoint, options);
          }
          this.clearAuth();
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        throw new Error(data.error || 'Request failed');
      }

      return data;
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async refreshSession() {
    if (!this.refreshToken || !this.user?.id) return false;

    try {
      const data = await this.request('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({
          userId: this.user.id,
          refreshToken: this.refreshToken
        })
      });

      if (data.ok && data.token) {
        this.setAuth(data.token, data.refreshToken, this.user);
        return true;
      }
    } catch (e) {
      console.error('Refresh failed:', e);
    }
    return false;
  }

  // Auth endpoints
  async login(email, password) {
    const data = await this.request('/api/auth/mobile/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.ok) {
      this.setAuth(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async register(email, password, name) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    if (data.ok) {
      this.setAuth(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async loginWithGoogle(accessToken) {
    const data = await this.request('/api/auth/google/mobile', {
      method: 'POST',
      body: JSON.stringify({ accessToken })
    });
    if (data.ok) {
      this.setAuth(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async loginWithFacebook(accessToken) {
    const data = await this.request('/api/auth/facebook/mobile', {
      method: 'POST',
      body: JSON.stringify({ accessToken })
    });
    if (data.ok) {
      this.setAuth(data.token, data.refreshToken, data.user);
    }
    return data;
  }

  async sendOTP(phone) {
    return this.request('/api/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  }

  async verifyOTP(phone, code, name = null, password = null) {
    return this.request('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, name, password })
    });
  }

  // Data endpoints
  async getSensors() {
    return this.request('/api/sensors.json');
  }

  async getDevices() {
    return this.request('/api/devices.json');
  }

  async getAlerts() {
    return this.request('/api/alerts.json');
  }

  async getDashboard() {
    return this.request('/api/dashboard/overview');
  }

  async toggleDevice(deviceId) {
    return this.request(`/api/devices/${deviceId}/cmd`, {
      method: 'POST',
      body: JSON.stringify({ action: 'toggle' })
    });
  }

  async getCrops() {
    return this.request('/api/crops');
  }

  async getFinance() {
    return this.request('/api/finance/summary');
  }

  async logout() {
    this.clearAuth();
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  getUser() {
    return this.user;
  }
}

window.ecoApi = new ApiService();
module.exports = window.ecoApi;