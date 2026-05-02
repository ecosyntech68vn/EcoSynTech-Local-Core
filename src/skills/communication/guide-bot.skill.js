/**
 * EcoSynTech - Hướng Dẫn Bot Skill
 * 
 * Skill này cung cấp hướng dẫn từng bước cho khách hàng
 * Có thể tích hợp vào web chat hoặc chatbot
 * 
 * @module skills/communication/guide-bot.skill
 */

module.exports = {
  id: 'guide-bot',
  name: 'Hướng Dẫn Sử Dụng',
  description: 'Cung cấp hướng dẫn từng bước cho người dùng',
  version: '1.0.0',
  triggers: ['command:guide', 'message:giup', 'message:huongdan', 'message:hoi'],
  
  // Menu chính
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

  // Hướng dẫn đăng nhập
  dangnhap: {
    title: '📱 Hướng Dẫn Đăng Nhập',
    steps: [
      {
        step: 1,
        title: 'Truy cập hệ thống',
        content: 'Mở trình duyệt web và truy cập: http://localhost:3000'
      },
      {
        step: 2,
        title: 'Đăng ký (lần đầu)',
        content: 'Nhấn "Đăng ký", nhập email, password, tên → Nhấn "Đăng ký"'
      },
      {
        step: 3,
        title: 'Đăng nhập',
        content: 'Nhập email & password đã đăng ký → Nhấn "Đăng nhập"'
      },
      {
        step: 4,
        title: 'Lưu token',
        content: 'Sau khi đăng nhập, lưu lại token để sử dụng các API'
      }
    ],
    commands: ['menu', 'dangnhap']
  },

  // Hướng dẫn Dashboard
  dashboard: {
    title: '🏠 Hướng Dẫn Dashboard',
    steps: [
      {
        step: 1,
        title: 'Truy cập Dashboard',
        content: 'Vào menu → Dashboard hoặc truy cập /api/dashboard/overview'
      },
      {
        step: 2,
        title: 'Xem tổng quan',
        content: 'Bạn sẽ thấy: thiết bị, cây trồng, cảnh báo, thời tiết'
      },
      {
        step: 3,
        title: 'Xem chi tiết',
        content: 'Nhấn vào từng mục để xem chi tiết'
      },
      {
        step: 4,
        title: 'Làm mới',
        content: 'Nhấn F5 hoặc nút làm mới để cập nhật dữ liệu'
      }
    ],
    commands: ['menu', 'dashboard']
  },

  // Hướng dẫn Traceability
  traceability: {
    title: '📦 Hướng Dẫn Truy Xuất Nguồn Gốc',
    steps: [
      {
        step: 1,
        title: 'Tạo lô mới',
        content: 'Vào Traceability → Tạo lô → Nhập tên sản phẩm, số lượng, loại'
      },
      {
        step: 2,
        title: 'Lấy QR Code',
        content: 'Hệ thống tự tạo QR Code → Lưu về in dán sản phẩm'
      },
      {
        step: 3,
        title: 'Ghi nhận chăm sóc',
        content: 'Vào lô → Thêm giai đoạn → Ghi nhận tưới, bón phân...'
      },
      {
        step: 4,
        title: 'Thu hoạch',
        content: 'Khi thu hoạch → Đánh dấu thu hoạch → Nhập số lượng'
      },
      {
        step: 5,
        title: 'Xuất bán',
        content: 'Xuất bán → Đánh dấu xuất → Nhập thông tin người mua'
      }
    ],
    note: 'Khách hàng quét QR sẽ thấy toàn bộ quy trình sản xuất!',
    commands: ['menu', 'traceability', 'qr']
  },

  // Hướng dẫn Kho
  kho: {
    title: '📋 Hướng Dẫn Quản Lý Kho',
    steps: [
      {
        step: 1,
        title: 'Thêm vật tư',
        content: 'Vào Kho → Thêm mới → Nhập tên, loại, số lượng, đơn vị'
      },
      {
        step: 2,
        title: 'Cảnh báo tồn kho',
        content: 'Đặt mức tối thiểu → Hệ thống tự cảnh báo khi thấp'
      },
      {
        step: 3,
        title: 'Điều chỉnh số lượng',
        content: 'Nhập kho (+), Xuất kho (-) → Ghi lý do'
      },
      {
        step: 4,
        title: 'Chuyển kho',
        content: 'Chọn vật tư → Chuyển → Chọn farm đích'
      }
    ],
    commands: ['menu', 'kho', 'tonkho']
  },

  // Hướng dẫn Tài Chính
  taichinh: {
    title: '💰 Hướng Dẫn Tài Chính',
    steps: [
      {
        step: 1,
        title: 'Ghi nhận thu',
        content: 'Vào Tài chính → Thêm mới → Chọn "Thu" → Nhập số tiền, lý do'
      },
      {
        step: 2,
        title: 'Ghi nhận chi',
        content: 'Thêm mới → Chọn "Chi" → Nhập số tiền, lý do, loại chi phí'
      },
      {
        step: 3,
        title: 'Xem báo cáo',
        content: 'Vào Tài chính → Báo cáo → Xem lãi lỗ theo ngày/tháng'
      },
      {
        step: 4,
        title: 'Xuất báo cáo',
        content: 'Menu → Xuất Excel/PDF để in'
      }
    ],
    commands: ['menu', 'taichinh', 'thuchi']
  },

  // Hướng dẫn Nhân Sự
  nhansu: {
    title: '👷 Hướng Dẫn Quản Lý Nhân Sự',
    steps: [
      {
        step: 1,
        title: 'Thêm công nhân',
        content: 'Vào Nhân sự → Thêm công nhân → Nhập tên, số điện thoại, vị trí'
      },
      {
        step: 2,
        title: 'Tạo ca làm',
        content: 'Vào Ca làm → Tạo mới → Chọn công nhân, ngày, giờ, công việc'
      },
      {
        step: 3,
        title: 'Chấm công',
        content: 'Chấm công vào (giờ đến) + Chấm công ra (giờ về)'
      },
      {
        step: 4,
        title: 'Tính lương',
        content: 'Vào Lương → Chọn tháng → Xem tổng lương'
      }
    ],
    commands: ['menu', 'nhansu', 'congcu']
  },

  // Hướng dẫn Thiết Bị
  thietbi: {
    title: '🔧 Hướng Dẫn Quản Lý Thiết Bị',
    steps: [
      {
        step: 1,
        title: 'Thêm thiết bị',
        content: 'Vào Thiết bị → Thêm mới → Nhập tên, loại, serial'
      },
      {
        step: 2,
        title: 'Cập nhật trạng thái',
        content: 'Sử dụng → Đang bảo trì → Hỏng → Ngưng'
      },
      {
        step: 3,
        title: 'Tạo lịch bảo trì',
        content: 'Vào Bảo trì → Tạo lịch → Chọn ngày, loại bảo trì'
      },
      {
        step: 4,
        title: 'Ghi nhận bảo trì',
        content: 'Hoàn thành → Ghi chi phí, ghi chú'
      }
    ],
    commands: ['menu', 'thietbi', 'maymoc']
  },

  // Hướng dẫn IoT
  iot: {
    title: '📡 Hướng Dẫn Thiết Bị IoT',
    steps: [
      {
        step: 1,
        title: 'Th��m thiết bị',
        content: 'Vào Thiết bị IoT → Thêm cảm biến → Đặt tên, vùng'
      },
      {
        step: 2,
        title: 'Theo dõi dữ liệu',
        content: 'Nhấn vào thiết bị → Xem nhiệt độ, độ ẩm...'
      },
      {
        step: 3,
        title: 'Điều khiển',
        content: 'Nhấn Bật/Tắt → Quạt, Máy bơm, Đèn...'
      },
      {
        step: 4,
        title: 'Cài đặt tự động',
        content: 'Vào Tự động → Tạo rule → Điều kiện → Hành động'
      }
    ],
    commands: ['menu', 'iot', 'dieukhien']
  },

  // Lỗi thường gặp
  loi: {
    title: '⚠️ Lỗi Thường Gặp',
    issues: [
      {
        error: 'Không đăng nhập được',
        solution: 'Kiểm tra email/password. Nếu quên, liên hệ admin để reset.'
      },
      {
        error: 'Dữ liệu không hiển thị',
        solution: 'Nhấn F5 hoặc đăng nhập lại.'
      },
      {
        error: 'Token hết hạn',
        solution: 'Đăng nhập lại để lấy token mới.'
      },
      {
        error: 'App không kết nối',
        solution: 'Kiểm tra internet hoặc địa chỉ server.'
      },
      {
        error: 'QR không quét được',
        solution: 'Đảm bảo đường dẫn web đúng (http://IP:3000/trace/)'
      }
    ],
    commands: ['menu', 'loi', 'sai']
  },

  // Liên hệ
  lienhe: {
    title: '📞 Thông Tin Liên Hệ',
    content: '**Hỗ trợ kỹ thuật:**\n\n' +
      '📞 Điện thoại: 090XXXXXXX\n' +
      '💬 Zalo: Nhóm hỗ trợ\n' +
      '📧 Email: support@ecosyntech.com\n' +
      '🕐 Giờ làm việc: 7h - 18h (T2 - T7)\n\n' +
      'Khi liên hệ, vui lòng mô tả:\n' +
      '- Lỗi đang gặp\n' +
      '- Đã thao tác gì trước đó\n' +
      '- Chụp màn hình lỗi (nếu có)',
    commands: ['menu', 'lienhe']
  },

  // Xử lý message
  async handleMessage(ctx) {
    const message = (ctx.message || '').toLowerCase().trim();
    
    // Menu chính
    if (message === 'menu' || message === 'start' || message === 'help') {
      return this.showMainMenu(ctx);
    }
    
    // Xử lý từng chủ đề
    if (message.includes('dangnhap') || message.includes('đăng nhập')) {
      return this.showGuide(ctx, 'dangnhap');
    }
    if (message.includes('dashboard') || message.includes('tổng quan')) {
      return this.showGuide(ctx, 'dashboard');
    }
    if (message.includes('trace') || message.includes('qr') || message.includes('truy xuất')) {
      return this.showGuide(ctx, 'traceability');
    }
    if (message.includes('kho') || message.includes('tồn kho')) {
      return this.showGuide(ctx, 'kho');
    }
    if (message.includes('tai chinh') || message.includes('thu chi')) {
      return this.showGuide(ctx, 'taichinh');
    }
    if (message.includes('nhan su') || message.includes('công nhân')) {
      return this.showGuide(ctx, 'nhansu');
    }
    if (message.includes('thiet bi') || message.includes('máy móc')) {
      return this.showGuide(ctx, 'thietbi');
    }
    if (message.includes('iot') || message.includes('cảm biến')) {
      return this.showGuide(ctx, 'iot');
    }
    if (message.includes('loi') || message.includes('sai') || message.includes('lỗi')) {
      return this.showGuide(ctx, 'loi');
    }
    if (message.includes('lien he') || message.includes('liên hệ')) {
      return this.showGuide(ctx, 'lienhe');
    }
    
    // Mặc định hiển thị menu
    return this.showMainMenu(ctx);
  },

  // Hiển thị menu chính
  showMainMenu(ctx) {
    let response = this.mainMenu.welcome + '\n\n';
    for (const item of this.mainMenu.menu) {
      response += `${item.label}\n   ${item.description}\n\n`;
    }
    response += '\nGõ "stt" để chọn (ví dụ: 1, 2, 3...)';
    ctx.reply(response);
  },

  // Hiển thị hướng dẫn cụ thể
  showGuide(ctx, guideId) {
    const guide = this[guideId];
    if (!guide) {
      ctx.reply('Không tìm thấy hướng dẫn. Gõ "menu" để xem danh sách.');
      return;
    }

    let response = `📖 ${guide.title}\n\n`;
    
    if (guide.steps) {
      for (const step of guide.steps) {
        response += `Bước ${step.step}: ${step.title}\n`;
        response += `   ▶ ${step.content}\n\n`;
      }
    }
    
    if (guide.note) {
      response += `💡 ${guide.note}\n\n`;
    }
    
    if (guide.issues) {
      for (const issue of guide.issues) {
        response += `❌ ${issue.error}\n`;
        response += `   ✅ ${issue.solution}\n\n`;
      }
    }
    
    if (guide.content) {
      response += guide.content + '\n';
    }
    
    response += '\nGõ "menu" để xem danh mục khác';
    ctx.reply(response);
  },

  // Run skill
  async run(ctx) {
    return this.handleMessage(ctx);
  }
};