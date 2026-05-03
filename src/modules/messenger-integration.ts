const salesModule = require('./sales-integration');

interface MessengerEvent {
  message?: {
    text?: string;
    quick_reply?: {
      payload: string;
    };
  };
  sender?: {
    id: string;
  };
}

interface QuickReplyResponse {
  text?: string;
  attachment?: {
    type: string;
    payload: {
      template_type: string;
      elements: unknown[];
    };
  };
}

interface MessengerResponse {
  recipient: { id: string };
  message: QuickReplyResponse;
}

const module = {
  version: '2.3.2',
  
  verifyWebhook: function(mode: string, token: string): boolean {
    return mode === 'subscribe' && token === process.env.MESSENGER_VERIFY_TOKEN;
  },
  
  handleMessage: async function(event: MessengerEvent): Promise<MessengerResponse | null> {
    const message = event.message?.text || '';
    const senderId = event.sender?.id;
    
    if (!senderId) return null;
    
    if (event.message?.quick_reply) {
      return this.handleQuickReply(event.message.quick_reply.payload, senderId);
    }
    
    const response = await salesModule.processChat({
      message: message,
      customerId: senderId,
      sessionId: 'messenger-' + senderId
    });
    
    return this.formatMessengerResponse(response, senderId);
  },
  
  handleQuickReply: async function(payload: string, senderId: string): Promise<MessengerResponse> {
    const responses: Record<string, QuickReplyResponse> = {
      'view_products': {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: this.getProductCards()
          }
        }
      },
      'calculate_roi': {
        text: 'Hay cho biet dien tich trang trai (m2) va loai cay trong cua ban?'
      }
    };
    
    const response = responses[payload] || { text: 'Camon!' };
    return {
      recipient: { id: senderId },
      message: response
    };
  },

  formatMessengerResponse: function(response: unknown, senderId: string): MessengerResponse {
    return {
      recipient: { id: senderId },
      message: {
        text: (response as { message?: string })?.message || 'Camon!'
      }
    };
  },

  getProductCards: function(): unknown[] {
    return [
      {
        title: 'IoT Sensor Pack',
        subtitle: 'Bao gom cam bien nhiet do, do am, anh sang',
        buttons: [
          { type: 'web_url', url: 'https://ecosyntech.com', title: 'Xem chi tiet' }
        ]
      }
    ];
  }
};

export = module;