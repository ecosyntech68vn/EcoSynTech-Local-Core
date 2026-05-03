interface ZaloEvent {
  message?: string;
  userId?: string;
  from?: string;
}

interface ChatRequest {
  message: string;
  customerId: string;
  sessionId: string;
}

interface ChatResponse {
  message?: string;
  text?: string;
}

interface ZaloResponse {
  type: string;
  message: string;
}

interface QuickReply {
  label: string;
  action: string;
}

const salesModule = require('./sales-integration');

const module = {
  version: '2.3.2',
  
  handleWebhook: async function(event: ZaloEvent): Promise<ZaloResponse> {
    const message = event.message || '';
    const userId = event.userId || event.from || '';
    
    const response = await salesModule.processChat({
      message: message,
      customerId: userId,
      sessionId: 'zalo-' + userId
    }) as ChatResponse;
    
    return this.formatZaloResponse(response);
  },
  
  formatZaloResponse: function(response: string | ChatResponse): ZaloResponse {
    if (typeof response === 'string') {
      return {
        type: 'text',
        message: response
      };
    }
    
    return {
      type: 'text',
      message: response.message || response.text || 'Cam on! Em se tro loI ngay.'
    };
  },
  
  getQuickReplies: function(): QuickReply[] {
    return [
      { label: 'Xem san pham', action: 'products' },
      { label: 'Tinh ROI', action: 'roi' },
      { label: 'Lien he', action: 'contact' },
      { label: 'Huong dan', action: 'help' }
    ];
  },

  sendMessage: async function(userId: string, message: string): Promise<ZaloResponse> {
    return {
      type: 'text',
      message: message
    };
  }
};

export = module;