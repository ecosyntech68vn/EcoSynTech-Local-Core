const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ZaloService {
  constructor(accessToken, oaId) {
    this.accessToken = accessToken;
    this.oaId = oaId;
    this.apiUrl = 'https://openapi.zalo.me/v3/oa/message';
  }

  async sendText(userId, message) {
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
        },
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
    } catch (error) {
      console.error('[Zalo] Send text error:', error.response?.data || error.message);
      return null;
    }
  }

  async sendVoice(userId, voiceUrl, duration = 15) {
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
                duration: duration
              }
            }
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
      console.log(`[Zalo] Sent voice to ${userId}`);
      return response.data;
    } catch (error) {
      console.error('[Zalo] Send voice error:', error.response?.data || error.message);
      return null;
    }
  }

  async sendImage(userId, imageUrl, caption) {
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
            caption: caption
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
      console.log(`[Zalo] Sent image to ${userId}`);
      return response.data;
    } catch (error) {
      console.error('[Zalo] Send image error:', error.response?.data || error.message);
      return null;
    }
  }

  async sendTemplate(userId, templateId, templateData) {
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
    } catch (error) {
      console.error('[Zalo] Send template error:', error.response?.data || error.message);
      return null;
    }
  }

  static create(accessToken, oaId) {
    return new ZaloService(accessToken, oaId);
  }
}

module.exports = ZaloService;