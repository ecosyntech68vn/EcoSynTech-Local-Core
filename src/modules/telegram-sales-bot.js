const salesModule = require('./sales-integration');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

const PRODUCTS = {
  basic: { name: 'Gói Cơ Bản', price: 5800000, desc: '5 cảm biến + Gateway' },
  standard: { name: 'Gói Tiêu Chuẩn', price: 9800000, desc: '10 cảm biến + AI' },
  premium: { name: 'Gói Nâng Cao', price: 18000000, desc: '20 cảm biến + Blockchain' }
};

module.exports = {
  version: '2.3.2',
  
  handleUpdate: async function(update) {
    if (update.message) {
      return this.handleMessage(update.message);
    }
    if (update.callback_query) {
      return this.handleCallback(update.callback_query);
    }
    return null;
  },
  
  handleMessage: async function(message) {
    const text = message.text || '';
    const chatId = message.chat.id;
    const from = message.from;
    
    const userKey = 'tg_' + chatId;
    
    if (text === '/start' || text === '👋 Bắt đầu') {
      return this.sendWelcome(chatId, from);
    }
    
    if (text === '📦 Sản phẩm' || text === '/products') {
      return this.sendProducts(chatId);
    }
    
    if (text === '💰 Báo giá' || text === '/quote') {
      return this.sendQuoteRequest(chatId);
    }
    
    if (text === '📊 ROI' || text === '/roi') {
      return this.sendROIInfo(chatId);
    }
    
    if (text === '📞 Liên hệ' || text === '/contact') {
      return this.sendContact(chatId);
    }
    
    if (text.startsWith('Mua ') || text.includes('đặt')) {
      return this.processOrder(chatId, text, userKey);
    }
    
    const response = await salesModule.processChat({
      message: text,
      customerId: userKey,
      sessionId: userKey
    });
    
    return this.sendMessage(chatId, response.message || response.text || 'Cảm ơn bạn! Vui lòng chọn menu bên dưới 👇');
  },
  
  handleCallback: async function(callback) {
    const chatId = callback.message.chat.id;
    const data = callback.data;
    
    if (data.startsWith('buy_')) {
      const productId = data.replace('buy_', '');
      return this.processOrder(chatId, 'Mua ' + productId, 'tg_' + chatId);
    }
    
    if (data === 'products') return this.sendProducts(chatId);
    if (data === 'quote') return this.sendQuoteRequest(chatId);
    if (data === 'roi') return this.sendROIInfo(chatId);
    if (data === 'contact') return this.sendContact(chatId);
    
    return this.answerCallback(callback.id);
  },
  
  sendWelcome: function(chatId, user) {
    const firstName = user.first_name || '';
    const text = `🌱 *Chào ${firstName}!*\n\n` +
      '_EcoSynTech_ - Nền Tảng Nông Nghiệp Thông Minh 4.0\n' +
      'Sứ mệnh: Giúp nông dân Việt Nam ứng dụng IoT để tăng năng suất, giảm chi phí\n\n' +
      '━━━━━━━━━━━━━━━━━━\n\n' +
      '*Sứ mệnh:*\n' + 
      '» Đưa công nghệ IoT đến mọi trang trại Việt Nam\n' +
      '» Giảm 40% chi phí nước, 30% phân bón\n' +
      '» Tăng 50% năng suất cây trồng\n\n' +
      '*Giá trị cốt lõi:*\n' +
      '» 🧡 Khách hàng là trung tâm\n' +
      '» 💡 Đổi mới liên tục\n' +
      '» 🤝 Đồng hành dài hạn\n' +
      '» 🌿 Bền vững\n\n' +
      '━━━━━━━━━━━━━━━━━━\n\n' +
      'Chọn menu bên dưới để tiếp tục 👇';
    
    return this.sendInlineKeyboard(chatId, text, [
      [{ text: '📦 Xem sản phẩm', callback_data: 'products' }],
      [{ text: '💰 Báo gi��', callback_data: 'quote' }],
      [{ text: '📊 Tính ROI', callback_data: 'roi' }],
      [{ text: '📞 Liên hệ', callback_data: 'contact' }]
    ]);
  },
  
  sendProducts: function(chatId) {
    let text = '📦 *SẢN PHẨM ECO SYNTECH*\n\n';
    
    Object.values(PRODUCTS).forEach((p, i) => {
      text += `${i + 1}. *${p.name}* - ${this.formatPrice(p.price)}\n`;
      text += `   ${p.desc}\n\n`;
    });
    
    text += '━━━━━━━━━━━━━━━━━━\n';
    text += 'Liên hệ để được tư vấn miễn phí!\n';
    
    return this.sendInlineKeyboard(chatId, text, [
      [{ text: '🛒 Mua Gói Cơ Bản', callback_data: 'buy_basic' }],
      [{ text: '🛒 Mua Gói Tiêu Chuẩn', callback_data: 'buy_standard' }],
      [{ text: '🛒 Mua Gói Nâng Cao', callback_data: 'buy_premium' }],
      [{ text: '📊 Tính ROI', callback_data: 'roi' }]
    ]);
  },
  
  sendQuoteRequest: function(chatId) {
    const text = '💰 *YÊU CẦU BÁO GIÁ*\n\n' +
      'Vui lòng cung cấp:\n' +
      '1. Diện tích trang trại (m²) \n' +
      '2. Loại cây trồng\n' +
      '3. Số lượng cảm biến mong muốn\n\n' +
      '_Ví dụ:_\n' +
      '» 1000m², trồng rau, 5 cảm biến';
    
    return this.sendMessage(chatId, text);
  },
  
  sendROIInfo: function(chatId) {
    const text = [
      '*ROI - HIEU QUA DAU TU*',
      '*Goi Co Ban (5.8M):*',
      'Dau tu: 5.8M VND',
      'Doanh thu nam: ~90M VND',
      'Loi nhuan: 84M VND',
      'ROI: 1449%',
      'Thu hoi: ~1 thang',
      '*Goi Tieu Chuan (9.8M):*',
      'ROI: 818%',
      'Thu hoi: ~1.5 thang',
      '_Tinh toan dua tren 1000m² trong rau_'
    ].join('\n');
    
    return this.sendInlineKeyboard(chatId, text, [
      [{ text: '📦 Xem chi tiết sản phẩm', callback_data: 'products' }],
      [{ text: '💰 Yêu cầu báo giá', callback_data: 'quote' }]
    ]);
  },
  
  sendContact: function(chatId) {
    const text = [
      '*LIEN HE ECO SYNTECH*',
      '',
      '*Cong ty TNHH EcoSynTech Global*',
      'Dia chi: [Dia chi cong ty]',
      'Hotline: 1900 xxxx',
      'Email: info@ecosyntech.vn',
      'Website: ecosyntech.vn',
      '*Gio lam viec:*',
      'Thu 2 - Thu 7: 8h00 - 18h00',
      '_Doi tu van san sang ho tro 24/7!_'
    ].join('\n');
    
    return this.sendMessage(chatId, text);
  },
  
  processOrder: async function(chatId, text, userKey) {
    const productId = text.toLowerCase().includes('co ban') ? 'basic' :
      text.toLowerCase().includes('tieu chuan') ? 'standard' : 'premium';
    
    const product = PRODUCTS[productId];
    
    const quoteResult = await salesModule.processQuote({
      packageId: productId,
      farmSize: 1000,
      cropType: 'vegetables',
      lead: {}
    });
    
    const orderText = [
      '*XAC NHAN DON HANG*',
      '',
      'San pham: ' + product.name,
      'Gia: ' + this.formatPrice(product.price),
      'Ma don: ' + quoteResult.quote.id,
      '━━━━━━━━━━━━━━━━━━',
      'THANH TOAN:',
      'Ngan hang: [Ten ngan hang]',
      'So tai khoan: [So TK]',
      'Chu TK: Cong ty TNHH EcoSynTech Global',
      'Noi dung: ' + quoteResult.quote.id,
      'Sau khi chuyen khoan, vui long gui xac nhan!'
    ].join('\n');
    
    return this.sendInlineKeyboard(chatId, orderText, [
      [{ text: '✅ Đã chuyển khoản', callback_data: 'paid_' + productId }],
      [{ text: '❌ Hủy đơn', callback_data: 'cancel' }]
    ]);
  },
  
  sendMessage: function(chatId, text, parseMode = 'Markdown') {
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    };
  },
  
  sendInlineKeyboard: function(chatId, text, keyboard, parseMode = 'Markdown') {
    return {
      method: 'sendMessage',
      chat_id: chatId,
      text: text,
      parse_mode: parseMode,
      reply_markup: {
        inline_keyboard: keyboard
      }
    };
  },
  
  answerCallback: function(callbackId, text = 'OK') {
    return {
      method: 'answerCallbackQuery',
      callback_query_id: callbackId,
      text: text
    };
  },
  
  formatPrice: function(vnd) {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(vnd);
  }
};