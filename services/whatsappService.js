const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

class WhatsAppService {
  constructor() {
    // Ensure environment variables are loaded
    if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.error('WhatsApp environment variables not found. Please check your .env file.');
    }

    this.apiUrl = process.env.WHATSAPP_URL || 'https://graph.facebook.com/v22.0';
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  /**
   * Generate random 6-digit OTP
   * @returns {string} - 6-digit OTP
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Format phone number to E.164 format
   * @param {string} phone - Phone number
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleanPhone = phone.replace(/\D/g, '');

    // If number is 10 digits, add India country code (91)
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    return cleanPhone;
  }

  /**
   * Send OTP via WhatsApp Business API
   * @param {string} to - Recipient phone number (without +)
   * @param {string} otp - 6-digit OTP
   * @param {string} clientName - Client name
   * @returns {Promise<Object>} - Response object
   */
  async sendOTP(to, otp, clientName = 'Valued Customer') {
    try {
      this.token = process.env.WHATSAPP_TOKEN;
      this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      if (!this.token || !this.phoneNumberId) {
        throw new Error('WhatsApp credentials not configured. Please set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID');
      }

      const formattedPhone = this.formatPhoneNumber(to);
      const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'auth_template';


      const requestPayload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }]
            },
            {
              type: 'button',
              sub_type: 'url',
              index: '0',
              parameters: [
                { type: 'text', text: otp }
              ]
            }
          ]
        }
      };


      console.log('WhatsApp API Request:', JSON.stringify(requestPayload, null, 2));

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        messageSid: response.data.messages[0]?.id,
        status: 'sent',
        phoneNumber: formattedPhone,
      };
    } catch (error) {
      console.error('WhatsApp API Error:', error.response?.data || error.message);

      return {
        success: false,
        error: error.response?.data || error.message,
        code: error.response?.status,
      };
    }
  }

  /**
   * Send custom WhatsApp message
   * @param {string} to - Recipient phone number
   * @param {string} message - Custom message
   * @returns {Promise<Object>} - Response object
   */
  async sendCustomMessage(to, message) {
    try {
      if (!this.token || !this.phoneNumberId) {
        throw new Error('WhatsApp credentials not configured');
      }

      const formattedPhone = this.formatPhoneNumber(to);

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        messageSid: response.data.messages[0]?.id,
        status: 'sent',
      };
    } catch (error) {
      console.error('WhatsApp custom message error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Check WhatsApp message status
   * @param {string} messageId - WhatsApp message ID
   * @returns {Promise<Object>} - Message status
   */
  async getMessageStatus(messageId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );

      return {
        success: true,
        status: response.data.status,
        data: response.data,
      };
    } catch (error) {
      console.error('WhatsApp message status error:', error);
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }
}

module.exports = new WhatsAppService();
