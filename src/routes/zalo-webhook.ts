/**
 * EcoSynTech - Zalo Webhook Handler
 * 
 * Webhook để nhận tin nhắn từ Zalo và phản hồi tự động
 * 
 * Cài đặt:
 * 1. Tạo OA Zalo tại https://oa.zalo.me
 * 2. Cấu hình webhook URL trỏ đến server này
 * 3. Điền webhook vào Zalo Developer Console
 * 
 * @route POST /webhook/zalo
 */

import express from('express');
import router = express.Router();

// Danh sách tin nhắn tự động
import AUTO_REPLIES = {
  // Menu chính
  'menu': {
    message: `📋 DANH MỤC HỖ TRỢ\n\n` +
      `1️⃣  📱 Đăng nhập\n` +
      `2️⃣  🏠 Dashboard\n` +
      `3️⃣  📦 Traceability\n` +
      `4️⃣  📋 Kho\n` +
      `5️⃣  💰 Tài chính\n` +
      `6️⃣  👷 Nhân sự\n` +
      `7️⃣  🔧 Thiết bị\n` +
      `8️⃣  📡 IoT\n` +
      `9️⃣  ⚠️ Lỗi thường gặp\n` +
      `📞 Liên hệ\n\n` +
      `Nhập số (1-9) hoặc từ khóa để xem hướng dẫn`,
    keywords: ['menu', 'start', 'help', 'giup', '?']
  },

  // Đăng nhập
  '1': {
    message: `📱 HƯỚNG DẪN ĐĂNG NHẬP\n\n` +
      `1️⃣ Truy cập: http://localhost:3000\n` +
      `2️⃣ Chọn "Đăng ký" (lần đầu)\n` +
      `3️⃣ Nhập: email, password, tên\n` +
      `4️⃣ Đăng nhập với thông tin đã tạo\n\n` +
      `💡 Lưu ý: Token có hiệu lực 24h\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Dashboard
  '2': {
    message: `🏠 HƯỚNG DẪN DASHBOARD\n\n` +
      `Vào Dashboard để xem:\n` +
      `✅ Tổng quan trang trại\n` +
      `✅ Số lượng thiết bị, cây trồng\n` +
      `✅ Cảnh báo\n` +
      `✅ Thời tiết\n\n` +
      `💡 Nhấn F5 để làm mới\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Traceability
  '3': {
    message: `📦 TRUY XUẤT NGUỒN GỐC\n\n` +
      `1️⃣ Tạo lô mới\n` + 
      `2️⃣ Hệ thống tạo QR Code\n` +
      `3️⃣ In QR dán sản phẩm\n` +
      `4️⃣ Khách quét QR xem info\n\n` +
      `💡 QR giúp khách tin tưởng sản phẩm!\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Kho
  '4': {
    message: `📋 QUẢN LÝ KHO\n\n` +
      `Thêm vật tư: Kho → Thêm mới\n` +
      `Xem tồn kho: Kho → Danh sách\n` +
      `Cảnh báo: Đặt mức tối thiểu\n` +
      `Nhập/Xuất: Điều chỉnh số lượng\n\n` +
      `💡 Hệ tự cảnh báo khi sắp hết\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Tài chính
  '5': {
    message: `💰 QUẢN LÝ TÀI CHÍNH\n\n` +
      `Ghi thu: Tài chính → Thu → Nhập tiền\n` +
      `Ghi chi: Tài chính → Chi → Nhập tiền\n` +
      `Xem báo cáo: Tài chính → Báo cáo\n\n` +
      `💡 Xem lãi lỗ theo ngày/tháng\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Nhân sự
  '6': {
    message: `👷 QUẢN LÝ NHÂN SỰ\n\n` +
      `Thêm CN: Nhân sự → Thêm\n` +
      `Tạo ca: Ca làm → Tạo mới\n` +
      `Chấm công: Chấm công → Vào/Ra\n` +
      `Tính lương: Lương → Chọn tháng\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Thiết bị
  '7': {
    message: `🔧 QUẢN LÝ THIẾT BỊ\n\n` +
      `Thêm thiết bị: Thiết bị → Thêm\n` +
      `Tạo bảo trì: Bảo trì → Tạo lịch\n` +
      `Ghi nhận: Hoàn thành → Nhập chi phí\n\n` +
      `Gõ "menu" để quay lại`
  },

  // IoT
  '8': {
    message: `📡 THIẾT BỊ IOT\n\n` +
      `Thêm cảm biến: Thiết bị IoT → Thêm\n` +
      `Xem dữ liệu: Nhấn vào thiết bị\n` +
      `Điều khiển: Bật/Tắt relay\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Lỗi
  '9': {
    message: `⚠️ LỖI THƯỜNG GẶP\n\n` +
      `❌ Không đăng nhập → Kiểm tra email/password\n` +
      `❌ Dữ liệu không hiển thị → Nhấn F5\n` +
      `❌ Token hết hạn → Đăng nhập lại\n` +
      `❌ App không kết nối → Kiểm tra internet\n\n` +
      `Liên hệ: 090XXXXXXX nếu không khắc phục được\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Liên hệ
  'lienhe': {
    message: `📞 LIÊN HỆ HỖ TRỢ\n\n` +
      `📞 Điện thoại: 090XXXXXXX\n` +
      `💬 Zalo: Nhóm hỗ trợ\n` +
      `📧 Email: support@ecosyntech.com\n` +
      `🕐 Thứ 2 - Thứ 7: 7h-18h\n\n` +
      `Gõ "menu" để quay lại`
  },

  // Xin chào
  'xin chao': {
    message: `👋 Xin chào! \n\n` +
      `Tôi là bot hỗ trợ EcoSynTech.\n\n` +
      `Nhập "menu" để xem danh mục hỗ trợ.\n\n` +
      `Hoặc nhập số (1-9) để xem hướng dẫn cụ thể.`
  },

  'hello': {
    message: `👋 Hello! \n\n` +
      `I'm the EcoSynTech support bot.\n\n` +
      `Type "menu" to see available options.`
  }
};

// Xử lý webhook từ Zalo
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    
    // Log để debug
    console.log('[Zalo Webhook] Received:', JSON.stringify(body));
    
    // Kiểm tra message type
    if (body.object === 'message') {
      const message = body.message;
      const userId = message.from.uid;
      const text = (message.text || '').toLowerCase().trim();
      
      // Tìm câu trả lời phù hợp
      let replyMessage = getReplyMessage(text);
      
      // Gửi phản hồi
      if (replyMessage) {
        await sendZaloMessage(userId, replyMessage);
      }
    }
    
    // Trả về 200 cho Zalo
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Zalo Webhook] Error:', error);
    res.status(200).json({ ok: true }); // Vẫn trả 200 để Zalo không retry
  }
});

// Lấy tin nhắn phản hồi
function getReplyMessage(text) {
  // Kiểm tra exact match
  if (AUTO_REPLIES[text]) {
    return AUTO_REPLIES[text].message;
  }
  
  // Kiểm tra keywords
  for (const [key, value] of Object.entries(AUTO_REPLIES)) {
    if (value.keywords && value.keywords.some(k => text.includes(k))) {
      return value.message;
    }
  }
  
  // Kiểm tra số
  if (text === '1' || text === '2' || text === '3' || text === '4' || 
      text === '5' || text === '6' || text === '7' || text === '8' || text === '9') {
    return AUTO_REPLIES[text]?.message;
  }
  
  // Mặc định
  return AUTO_REPLIES['menu'].message;
}

// Gửi tin nhắn đến Zalo
async function sendZaloMessage(userId, message) {
  try {
    const ZALO_TOKEN = process.env.ZALO_TOKEN;
    const ZALO_OA_ID = process.env.ZALO_OA_ID;
    
    if (!ZALO_TOKEN || !ZALO_OA_ID) {
      console.log('[Zalo] Missing config, skip sending');
      return;
    }
    
    const axios from('axios');
    await axios.post(
      'https://openapi.zalo.me/v3/oa/message/text',
      {
        recipient: { user_id: userId },
        message: { text: message }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ZALO_TOKEN}`,
          'Access-Token': process.env.ZALO_ACCESS_TOKEN
        }
      }
    );
    
    console.log(`[Zalo] Sent to ${userId}: ${message.substring(0, 50)}...`);
  } catch (error) {
    console.error('[Zalo] Send error:', error.response?.data || error.message);
  }
}

// Endpoint để test
router.get('/test', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Zalo Webhook is running',
    menu: Object.keys(AUTO_REPLIES)
  });
});

module.exports = router;