/**
 * Guide Bot Skill Tests
 * 
 * @test-module skills/communication/guide-bot.skill
 */

const guideBot = require('../src/skills/communication/guide-bot.skill');

describe('Guide Bot Skill', () => {
  describe('Module Exports', () => {
    test('should export required properties', () => {
      expect(guideBot.id).toBe('guide-bot');
      expect(guideBot.name).toBe('Hướng Dẫn Sử Dụng');
      expect(guideBot.description).toBeDefined();
      expect(guideBot.triggers).toBeInstanceOf(Array);
    });

    test('should have mainMenu', () => {
      expect(guideBot.mainMenu).toBeDefined();
      expect(guideBot.mainMenu.menu).toBeInstanceOf(Array);
      expect(guideBot.mainMenu.menu.length).toBeGreaterThan(0);
    });
  });

  describe('Menu Items', () => {
    test('should have all required menu items', () => {
      const menuIds = guideBot.mainMenu.menu.map(m => m.id);
      expect(menuIds).toContain('dangnhap');
      expect(menuIds).toContain('dashboard');
      expect(menuIds).toContain('traceability');
      expect(menuIds).toContain('kho');
      expect(menuIds).toContain('taichinh');
      expect(menuIds).toContain('nhansu');
      expect(menuIds).toContain('thietbi');
      expect(menuIds).toContain('iot');
      expect(menuIds).toContain('loi');
    });
  });

  describe('Guide Content', () => {
    test('should have dangnhap guide', () => {
      expect(guideBot.dangnhap).toBeDefined();
      expect(guideBot.dangnhap.title).toContain('Đăng Nhập');
      expect(guideBot.dangnhap.steps).toBeInstanceOf(Array);
      expect(guideBot.dangnhap.steps.length).toBeGreaterThan(0);
    });

    test('should have traceability guide', () => {
      expect(guideBot.traceability).toBeDefined();
      expect(guideBot.traceability.title).toContain('Truy Xuất');
      expect(guideBot.traceability.steps).toBeInstanceOf(Array);
    });

    test('should have kho guide', () => {
      expect(guideBot.kho).toBeDefined();
      expect(guideBot.kho.steps).toBeInstanceOf(Array);
    });

    test('should have taichinh guide', () => {
      expect(guideBot.taichinh).toBeDefined();
      expect(guideBot.taichinh.steps).toBeInstanceOf(Array);
    });

    test('should have nhansu guide', () => {
      expect(guideBot.nhansu).toBeDefined();
      expect(guideBot.nhansu.steps).toBeInstanceOf(Array);
    });

    test('should have thietbi guide', () => {
      expect(guideBot.thietbi).toBeDefined();
      expect(guideBot.thietbi.steps).toBeInstanceOf(Array);
    });

    test('should have iot guide', () => {
      expect(guideBot.iot).toBeDefined();
      expect(guideBot.iot.steps).toBeInstanceOf(Array);
    });

    test('should have loi guide with issues', () => {
      expect(guideBot.loi).toBeDefined();
      expect(guideBot.loi.issues).toBeInstanceOf(Array);
      expect(guideBot.loi.issues.length).toBeGreaterThan(0);
    });

    test('should have lienhe guide', () => {
      expect(guideBot.lienhe).toBeDefined();
      expect(guideBot.lienhe.content).toBeDefined();
    });
  });

  describe('Step Content', () => {
    test('dangnhap steps should have required fields', () => {
      const step = guideBot.dangnhap.steps[0];
      expect(step.step).toBe(1);
      expect(step.title).toBeDefined();
      expect(step.content).toBeDefined();
      expect(typeof step.content).toBe('string');
    });

    test('traceability should cover full workflow', () => {
      const stepTitles = guideBot.traceability.steps.map(s => s.title);
      expect(stepTitles).toContain(expect.stringContaining('Tạo lô'));
      expect(stepTitles).toContain(expect.stringContaining('Thu hoạch'));
      expect(stepTitles).toContain(expect.stringContaining('Xuất bán'));
    });
  });
});