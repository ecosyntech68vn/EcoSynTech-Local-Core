/**
 * New Features Tests
 * 
 * Tests for features added recently: guide-bot, zalo-webhook
 */

// Test guide-bot skill file exists and has required structure
describe('New Features', () => {
  test('guide-bot skill file should exist', () => {
    expect(() => {
      require('../src/skills/communication/guide-bot.skill');
    }).not.toThrow();
  });

  test('zalo-webhook route file should exist', () => {
    expect(() => {
      require('../src/routes/zalo-webhook');
    }).not.toThrow();
  });

  test('customer guide doc should exist', () => {
    const fs = require('fs');
    const path = require('path');
    const docsPath = path.join(__dirname, '../docs/HUONG_DAN_KHACH_HANG.md');
    expect(fs.existsSync(docsPath)).toBe(true);
  });

  test('detailed guide doc should exist', () => {
    const fs = require('fs');
    const path = require('path');
    const docsPath = path.join(__dirname, '../docs/HUONG_DAN_CHI_TIET.md');
    expect(fs.existsSync(docsPath)).toBe(true);
  });
});