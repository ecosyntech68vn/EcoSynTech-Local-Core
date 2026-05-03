# Hướng Dẫn Build APK EcoSynTech Mobile App

## Yêu Cầu

| Phần mềm | Phiên bản | Link tải |
|-----------|-----------|----------|
| Node.js | 18+ | https://nodejs.org |
| Java JDK | 17 (LTS) | https://adoptium.net |
| Android Studio | Latest | https://developer.android.com/studio |

## Các Bước Build

### Bước 1: Cài đặt môi trường

```bash
# Trên Windows (chạy PowerShell as Administrator)
# Cài đặt chocolatey
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -Tls12; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Cài đặt Java và Gradle
choco install openjdk17 -y

# Cài đặt Android Studio từ https://developer.android.com/studio
```

### Bước 2: Cấu hình Android SDK

```bash
# Đặt biến môi trường (thêm vào System Properties → Environment Variables)
ANDROID_HOME=C:\Users\YOUR_NAME\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\YOUR_NAME\AppData\Local\Android\Sdk

# Thêm vào PATH:
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\cmdline-tools\latest\bin
```

### Bước 3: Clone và Build

```bash
# Clone repo
git clone https://github.com/ecosyntech68vn/EcoSynTech-Local-Core.git
cd EcoSynTech-Local-Core

# Di chuyển vào thư mục mobile-app
cd mobile-app

# Cài đặt dependencies
npm install

# Build Debug APK
npm run build:debug

# Build Release APK
npm run build
```

### Bước 4: APK Output

Sau khi build thành công, APK sẽ nằm ở:
- **Debug**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release**: `android/app/build/outputs/apk/release/app-release.apk`

## Cấu Hình APK

### Đổi tên app

Sửa file `capacitor.config.json`:

```json
{
  "appId": "com.ecosyntech.yourcompany",
  "appName": "Tên App Của Bạn",
  ...
}
```

### Icon app

1. Tạo icon 1024x1024 px
2. Đặt vào thư mục `android/app/src/main/res/mipmap-xxxhdpi/`
3. Hoặc dùng tool: https://apetools.web.app

### Splash Screen

Sửa trong `capacitor.config.json`:

```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "backgroundColor": "#219465",
      "androidScaleType": "CENTER_CROP"
    }
  }
}
```

## Cài Đặt APK Vào Điện Thoại

### Cách 1: Qua USB
```bash
adb install app-debug.apk
```

### Cách 2: Qua file
- Gửi file APK qua email/Zalo
- Mở file và cài đặt
- **Lưu ý**: Bật "Cho phép cài đặt từ nguồn không rõ" trong cài đặt điện thoại

### Cách 3: Qua Google Drive
- Upload APK lên Google Drive
- Mở trên điện thoại và cài đặt

## Troubleshooting

### Lỗi: Java not found
```bash
# Kiểm tra Java
java -version

# Nếu lỗi, cài đặt lại Java JDK 17
```

### Lỗi: ANDROID_HOME not set
```bash
# Trên Windows
setx ANDROID_HOME "C:\path\to\android\sdk"
# Khởi động lại terminal
```

### Lỗi: Gradle permission denied
```bash
# Linux/Mac
chmod +x ./gradlew
```

### Lỗi: SDK version not found
```bash
# Mở Android Studio → SDK Manager
# Cài đặt:
# - Android SDK Platform 33
# - Android SDK Build Tools
# - Android SDK Platform Tools
```

## Cấu Hình Server URL

Trong app, vào **Cài đặt** và nhập:
- Local: `http://192.168.X.X:3000` (thay X.X bằng IP máy tính)
- Server: `https://your-server.com`

## Video Hướng Dẫn

Xem video hướng dẫn chi tiết tại:
[Link video - sẽ cập nhật]

---

**Liên hệ hỗ trợ**: support@ecosyntech.com
**Version**: 1.0 | **Ngày cập nhật**: 2026-05-02
