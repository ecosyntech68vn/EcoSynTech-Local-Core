#!/bin/bash
# EcoSynTech Mobile APK Build Script
# Frugal Innovation - Minimal steps to APK

set -e

echo "🏗️ Building EcoSynTech Mobile APK..."

# Check prerequisites
command -v npx >/dev/null 2>&1 || { echo "❌ npm required"; exit 1; }

# Sync capacitor
echo "📦 Syncing Capacitor..."
npx cap sync android

# Build debug APK
echo "🔨 Building debug APK..."
cd android
./gradlew assembleDebug

# Output
echo "✅ APK built successfully!"
echo "📱 APK location: android/app/build/outputs/apk/debug/app-debug.apk"

# Copy to root for easy access
cp android/app/build/outputs/apk/debug/app-debug.apk ../ecosyntech-mobile.apk
echo "📄 Copied to: ecosyntech-mobile.apk"