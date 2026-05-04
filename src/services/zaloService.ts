/**
 * Zalo Service - Send alerts via Zalo Official Account API
 * TypeScript version
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

export interface ZaloMessage {
  recipient: {
    user_id: string;
  };
  message: {
    text: string;
  };
}

export interface ZaloVoiceMessage {
  recipient: {
    user_id: string;
  };
  message: {
    attachment: {
      type: 'audio';
      payload: {
        url: string;
        duration: number;
      };
    };
  };
}

export interface ZaloImageMessage {
  recipient: {
    user_id: string;
  };
  message: {
    attachment: {
      type: 'image';
      payload: {
        url: string;
      };
    };
    caption?: string;
  };
}

export class ZaloService {
  private accessToken: string;
  private oaId: string;
  private apiUrl = 'https://openapi.zalo.me/v3/oa/message';

  constructor(accessToken: string, oaId: string) {
    this.accessToken = accessToken;
    this.oaId = oaId;
  }

  async sendText(userId: string, message: string): Promise<any> {
    if (!this.accessToken || !this.oaId) {
      console.log('[Zalo] Missing config, skip sending');
      return null;
    }

    try {
      const response = await axios.post(
        this.apiUrl + '/text',
        {
          recipient: { user_id: userId },
          message: { text: message }
        } as ZaloMessage,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            'Access-Token': this.accessToken
          }
        }
      );
      console.log(`[Zalo] Sent text to ${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('[Zalo] Send text error:', error.response?.data || error.message);
      return null;
    }
  }

  async sendVoice(userId: string, voiceUrl: string, duration = 15): Promise<any> {
    if (!this.accessToken || !this.oaId) {
      console.log('[Zalo] Missing config, skip sending');
      return null;
    }

    try {
      const response = await axios.post(
        this.apiUrl + '/voice',
        {
          recipient: { user_id: userId },
          message: {
            attachment: {
              type: 'audio',
              payload: {
                url: voiceUrl,
                duration
              }
            }
          }
        } as ZaloVoiceMessage,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            'Access-Token': this.accessToken
          }
        }
      );
      console.log(`[Zalo] Sent voice to ${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('[Zalo] Send voice error:', error.response?.data || error.message);
      return null;
    }
  }

  async sendImage(userId: string, imageUrl: string, caption?: string): Promise<any> {
    if (!this.accessToken || !this.oaId) {
      console.log('[Zalo] Missing config, skip sending');
      return null;
    }

    try {
      const response = await axios.post(
        this.apiUrl + '/image',
        {
          recipient: { user_id: userId },
          message: {
            attachment: {
              type: 'image',
              payload: {
                url: imageUrl
              }
            },
            caption
          }
        } as ZaloImageMessage,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            'Access-Token': this.accessToken
          }
        }
      );
      console.log(`[Zalo] Sent image to ${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('[Zalo] Send image error:', error.response?.data || error.message);
      return null;
    }
  }

  async sendTemplate(userId: string, templateId: string, templateData: Record<string, any>): Promise<any> {
    if (!this.accessToken || !this.oaId) {
      console.log('[Zalo] Missing config, skip sending');
      return null;
    }

    try {
      const response = await axios.post(
        this.apiUrl + '/template',
        {
          recipient: { user_id: userId },
          message: {
            template_id: templateId,
            template_data: templateData
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
            'Access-Token': this.accessToken
          }
        }
      );
      console.log(`[Zalo] Sent template to ${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('[Zalo] Send template error:', error.response?.data || error.message);
      return null;
    }
  }

  static create(accessToken: string, oaId: string): ZaloService {
    return new ZaloService(accessToken, oaId);
  }
}

export default ZaloService;