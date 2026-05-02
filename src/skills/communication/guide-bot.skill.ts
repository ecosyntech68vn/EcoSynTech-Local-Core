/**
 * EcoSynTech - Hướng Dẫn Bot Skill
 * 
 * Skill này cung cấp hướng dẫn từng bước cho khách hàng
 * Có thể tích hợp vào web chat hoặc chatbot
 * 
 * @module skills/communication/guide-bot.skill
 */

export interface MenuItem {
  id: string;
  label: string;
  description: string;
}

export interface GuideStep {
  step: number;
  title: string;
  content: string;
}

export interface GuideSection {
  title: string;
  steps: GuideStep[];
  commands: string[];
  [key: string]: unknown;
}

export interface GuideBotSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: string[];
  mainMenu: {
    welcome: string;
    menu: MenuItem[];
  };
  run: (ctx: unknown) => unknown;
}

const guideBotSkill: GuideBotSkill = {
  id: 'guide-bot',
  name: 'Hướng Dẫn Sử Dụng',
  description: 'Cung cấp hướng dẫn từng bước cho người dùng',
  version: '1.0.0',
  triggers: ['command:guide', 'message:giup', 'message:huongdan', 'message:hoi'],
  
  mainMenu: {
    welcome: 'Xin chào! 👋\n\nTôi là bot hướng dẫn EcoSynTech.\n\nBạn cần hỗ trợ gì?\n\nChọn chủ đề:',
    menu: [
      { id: 'dangnhap', label: '📱 Đăng nhập', description: 'Đăng ký, đăng nhập hệ thống' },
      { id: 'dashboard', label: '🏠 Dashboard', description: 'Xem tổng quan trang trại' },
      { id: 'traceability', label: '📦 Traceability', description: 'Tạo QR code, truy xuất nguồn gốc' },
      { id: 'kho', label: '📋 Quản lý Kho', description: 'Vật tư, tồn kho' },
      { id: 'taichinh', label: '💰 Tài Chính', description: 'Ghi thu chi, báo cáo' },
      { id: 'nhansu', label: '👷 Nhân Sự', description: 'Công nhân, chấm công' },
      { id: 'thietbi', label: '🔧 Thiết Bị', description: 'Máy móc, bảo trì' },
      { id: 'iot', label: '📡 Thiết Bị IoT', description: 'Điều khiển cảm biến' },
      { id: 'loi', label: '⚠️ Lỗi Thường Gặp', description: 'Cách khắc phục lỗi' },
      { id: 'lienhe', label: '📞 Liên Hệ', description: 'Liên hệ hỗ trợ' }
    ]
  },

  run: function(ctx: unknown): unknown {
    const event = (ctx as { event?: { type?: string; data?: unknown } })?.event;
    const message = (event?.data as { message?: string })?.message?.toLowerCase() || '';
    
    if (message.includes('menu') || message.includes('menu')) {
      return { response: this.mainMenu.welcome + '\n\n' + this.mainMenu.menu.map(m => `${m.label}\n${m.description}`).join('\n\n') };
    }
    
    return { response: this.mainMenu.welcome };
  }
};

export default guideBotSkill;