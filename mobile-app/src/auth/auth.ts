/**
 * EcoSynTech Mobile - Auth Module
 * Handles login, register, OAuth, OTP authentication
 */

class AuthModule {
  constructor() {
    this.isLoading = false;
    this.currentView = 'login';
  }

  init() {
    this.render();
    this.setupEventListeners();
    this.checkExistingSession();
  }

  checkExistingSession() {
    if (window.ecoApi.isAuthenticated()) {
      this.navigateToApp();
    }
  }

  render() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="auth-screen">
        <div class="auth-container">
          <div class="auth-header">
            <div class="auth-logo">🌾</div>
            <h1>EcoSynTech</h1>
            <p class="auth-subtitle">Smart Farming Platform</p>
          </div>

          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login">Đăng nhập</button>
            <button class="auth-tab" data-tab="register">Đăng ký</button>
          </div>

          <div class="auth-content">
            <!-- Login Form -->
            <div class="auth-form" id="login-form">
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="login-email" placeholder="nhap@email.com" autocomplete="email">
              </div>
              <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" id="login-password" placeholder="••••••••" autocomplete="current-password">
              </div>
              <button class="btn-primary" id="login-btn">Đăng nhập</button>
              
              <div class="auth-divider">
                <span>hoặc</span>
              </div>
              
              <div class="social-buttons">
                <button class="social-btn google" id="google-login">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Đăng nhập Google
                </button>
                <button class="social-btn facebook" id="facebook-login">
                  <svg viewBox="0 0 24 24" width="20" height="20">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Đăng nhập Facebook
                </button>
              </div>
              
              <div class="phone-login-link">
                <button id="show-phone-login">Đăng nhập bằng số điện thoại</button>
              </div>
            </div>

            <!-- Register Form -->
            <div class="auth-form hidden" id="register-form">
              <div class="form-group">
                <label>Họ và tên</label>
                <input type="text" id="register-name" placeholder="Nguyen Van A" autocomplete="name">
              </div>
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="register-email" placeholder="nhap@email.com" autocomplete="email">
              </div>
              <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" id="register-password" placeholder="••••••••" autocomplete="new-password">
              </div>
              <button class="btn-primary" id="register-btn">Đăng ký</button>
              
              <p class="auth-terms">
                Bằng việc đăng ký, bạn đồng ý với 
                <a href="#" onclick="return false;">Điều khoản</a> và 
                <a href="#" onclick="return false;">Chính sách bảo mật</a>
              </p>
            </div>

            <!-- Phone Login Form -->
            <div class="auth-form hidden" id="phone-form">
              <div class="form-group">
                <label>Số điện thoại</label>
                <input type="tel" id="phone-input" placeholder="0912345678" autocomplete="tel">
              </div>
              <button class="btn-primary" id="send-otp-btn">Gửi mã OTP</button>
              
              <div class="otp-input-section hidden" id="otp-section">
                <div class="form-group">
                  <label>Mã xác nhận</label>
                  <input type="text" id="otp-input" placeholder="123456" maxlength="6">
                </div>
                <div class="form-group" id="new-user-fields">
                  <div class="form-group">
                    <label>Họ và tên</label>
                    <input type="text" id="phone-name" placeholder="Nguyen Van A">
                  </div>
                  <div class="form-group">
                    <label>Mật khẩu</label>
                    <input type="password" id="phone-password" placeholder="••••••••">
                  </div>
                </div>
                <button class="btn-primary" id="verify-otp-btn">Xác nhận</button>
              </div>
              
              <div class="phone-login-link">
                <button id="show-email-login">← Quay lại đăng nhập</button>
              </div>
            </div>
          </div>

          <div class="auth-error" id="auth-error"></div>
          <div class="auth-loading hidden" id="auth-loading">
            <div class="spinner"></div>
            <p>Đang xử lý...</p>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
    });

    // Login
    document.getElementById('login-btn')?.addEventListener('click', () => this.handleLogin());
    document.getElementById('login-password')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });

    // Register
    document.getElementById('register-btn')?.addEventListener('click', () => this.handleRegister());

    // Google
    document.getElementById('google-login')?.addEventListener('click', () => this.handleGoogleLogin());

    // Facebook
    document.getElementById('facebook-login')?.addEventListener('click', () => this.handleFacebookLogin());

    // Phone login
    document.getElementById('show-phone-login')?.addEventListener('click', () => this.showPhoneForm());
    document.getElementById('show-email-login')?.addEventListener('click', () => this.showLoginForm());
    document.getElementById('send-otp-btn')?.addEventListener('click', () => this.handleSendOTP());
    document.getElementById('verify-otp-btn')?.addEventListener('click', () => this.handleVerifyOTP());

    // URL params handling (OAuth callback)
    this.handleOAuthCallback();
  }

  switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    document.getElementById('login-form')?.classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form')?.classList.toggle('hidden', tab !== 'register');
    this.currentView = tab;
  }

  showPhoneForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('phone-form').classList.remove('hidden');
  }

  showLoginForm() {
    document.getElementById('phone-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
  }

  showError(message) {
    const errorEl = document.getElementById('auth-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.remove('hidden');
      setTimeout(() => errorEl.classList.add('hidden'), 5000);
    }
  }

  showLoading(show = true) {
    const loadingEl = document.getElementById('auth-loading');
    if (loadingEl) {
      loadingEl.classList.toggle('hidden', !show);
    }
  }

  async handleLogin() {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;

    if (!email || !password) {
      this.showError('Vui lòng nhập email và mật khẩu');
      return;
    }

    this.showLoading(true);
    try {
      const result = await window.ecoApi.login(email, password);
      if (result.ok) {
        this.navigateToApp();
      } else {
        this.showError(result.error || 'Đăng nhập thất bại');
      }
    } catch (error) {
      this.showError(error.message || 'Lỗi kết nối');
    } finally {
      this.showLoading(false);
    }
  }

  async handleRegister() {
    const name = document.getElementById('register-name')?.value?.trim();
    const email = document.getElementById('register-email')?.value?.trim();
    const password = document.getElementById('register-password')?.value;

    if (!name || !email || !password) {
      this.showError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password.length < 6) {
      this.showError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    this.showLoading(true);
    try {
      const result = await window.ecoApi.register(email, password, name);
      if (result.ok) {
        this.navigateToApp();
      } else {
        this.showError(result.error || 'Đăng ký thất bại');
      }
    } catch (error) {
      this.showError(error.message || 'Lỗi kết nối');
    } finally {
      this.showLoading(false);
    }
  }

  async handleGoogleLogin() {
    try {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: window.GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (response.credential) {
              await this.processGoogleToken(response.credential);
            }
          }
        });
        window.google.accounts.id.prompt();
      } else {
        const result = await window.ecoApi.request('/api/auth/google');
        if (result.ok && result.authUrl) {
          window.location.href = result.authUrl;
        } else {
          this.showError('Google OAuth chưa được cấu hình');
        }
      }
    } catch (error) {
      this.showError('Lỗi đăng nhập Google: ' + error.message);
    }
  }

  async processGoogleToken(accessToken) {
    this.showLoading(true);
    try {
      const result = await window.ecoApi.loginWithGoogle(accessToken);
      if (result.ok) {
        this.navigateToApp();
      } else {
        this.showError(result.error || 'Đăng nhập Google thất bại');
      }
    } catch (error) {
      this.showError('Lỗi xác thực Google');
    } finally {
      this.showLoading(false);
    }
  }

  async handleFacebookLogin() {
    try {
      if (window.FB) {
        window.FB.login(async (response) => {
          if (response.authResponse?.accessToken) {
            await this.processFacebookToken(response.authResponse.accessToken);
          }
        }, { scope: 'public_profile,email' });
      } else {
        const result = await window.ecoApi.request('/api/auth/facebook');
        if (result.ok && result.authUrl) {
          window.location.href = result.authUrl;
        } else {
          this.showError('Facebook OAuth chưa được cấu hình');
        }
      }
    } catch (error) {
      this.showError('Lỗi đăng nhập Facebook: ' + error.message);
    }
  }

  async processFacebookToken(accessToken) {
    this.showLoading(true);
    try {
      const result = await window.ecoApi.loginWithFacebook(accessToken);
      if (result.ok) {
        this.navigateToApp();
      } else {
        this.showError(result.error || 'Đăng nhập Facebook thất bại');
      }
    } catch (error) {
      this.showError('Lỗi xác thực Facebook');
    } finally {
      this.showLoading(false);
    }
  }

  async handleSendOTP() {
    const phone = document.getElementById('phone-input')?.value?.trim();

    if (!phone || phone.length < 10) {
      this.showError('Vui lòng nhập số điện thoại hợp lệ');
      return;
    }

    this.showLoading(true);
    try {
      const result = await window.ecoApi.sendOTP(phone);
      if (result.ok) {
        document.getElementById('otp-section').classList.remove('hidden');
        document.getElementById('send-otp-btn').classList.add('hidden');
        this.showError('Mã OTP đã được gửi (mã giả lập: 123456)');
      } else {
        this.showError(result.error || 'Gửi OTP thất bại');
      }
    } catch (error) {
      this.showError('Lỗi kết nối: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async handleVerifyOTP() {
    const phone = document.getElementById('phone-input')?.value?.trim();
    const code = document.getElementById('otp-input')?.value?.trim();
    const name = document.getElementById('phone-name')?.value?.trim();
    const password = document.getElementById('phone-password')?.value;

    if (!phone || !code) {
      this.showError('Vui lòng nhập số điện thoại và mã OTP');
      return;
    }

    this.showLoading(true);
    try {
      const result = await window.ecoApi.verifyOTP(phone, code, name, password);
      if (result.ok) {
        window.ecoApi.setAuth(result.token, result.refreshToken, result.user);
        this.navigateToApp();
      } else {
        this.showError(result.error || 'Xác thực thất bại');
      }
    } catch (error) {
      this.showError('Lỗi kết nối: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('auth') && params.get('token')) {
      const token = params.get('token');
      const refreshToken = params.get('refresh');
      const userStr = params.get('user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(decodeURIComponent(userStr));
          window.ecoApi.setAuth(token, refreshToken, user);
          window.history.replaceState({}, document.title, '/mobile.html');
          this.navigateToApp();
        } catch (e) {
          console.error('OAuth callback error:', e);
        }
      }
    }

    const error = params.get('error');
    if (error) {
      const message = params.get('message') || 'Authentication failed';
      this.showError(message.replace(/_/g, ' '));
      window.history.replaceState({}, document.title, '/mobile.html');
    }
  }

  navigateToApp() {
    window.location.href = '/mobile.html?page=dashboard';
  }
}

window.authModule = new AuthModule();
module.exports = window.authModule;