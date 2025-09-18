const twilio = require('twilio');

class WhatsAppService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID, // Your Account SID
      process.env.TWILIO_AUTH_TOKEN // Your Auth Token
    );

    this.whatsappFrom = 'whatsapp:+14155238886'; // Twilio sandbox number
  }
  async sendOTP(to, otp, clientName = 'Valued Customer') {
    try {
      const whatsappTo = this.formatPhoneNumber(to);

      const message = this.createOTPMessage(otp, clientName);
      console.log(message);

      const response = await this.client.messages.create({
        body: message,
        from: this.whatsappFrom,
        to: whatsappTo
      });

      console.log(`WhatsApp OTP sent successfully:`, {
        messageSid: response.sid,
        to: whatsappTo,
        clientName: clientName
      });

      return {
        success: true,
        messageSid: response.sid,
        status: response.status
      };

    } catch (error) {
      console.error('WhatsApp OTP send error:', error);

      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  /**
   * Format phone number for WhatsApp
   * @param {string} phone - Phone number
   * @returns {string} - Formatted WhatsApp number
   */
  formatPhoneNumber(phone) {
    let cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }

    // Add WhatsApp prefix
    return `whatsapp:+${cleanPhone}`;
  }

  /**
   * Create OTP message template
   * @param {string} otp - 6-digit OTP
   * @param {string} clientName - Client name
   * @returns {string} - Formatted message
   */
  createOTPMessage(otp, clientName) {
    return `🔐 *OTP Verification*

Hello ${clientName}! 👋

Your OTP for verification is: *${otp}*

⏰ This OTP is valid for 5 minutes only.

🚫 Please do not share this OTP with anyone.

Thank you for choosing our services! 🙏

---
*This is an automated message. Please do not reply.*`;
  }

  /**
   * Send custom WhatsApp message
   * @param {string} to - Recipient's phone number
   * @param {string} message - Custom message
   * @returns {Promise<Object>} - Twilio response
   */
  async sendCustomMessage(to, message) {
    try {
      const whatsappTo = this.formatPhoneNumber(to);

      const response = await this.client.messages.create({
        body: message,
        from: this.whatsappFrom,
        to: whatsappTo
      });

      return {
        success: true,
        messageSid: response.sid,
        status: response.status
      };

    } catch (error) {
      console.error('WhatsApp custom message error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check WhatsApp message status
   * @param {string} messageSid - Twilio message SID
   * @returns {Promise<Object>} - Message status
   */
  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();

      return {
        success: true,
        status: message.status,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated
      };

    } catch (error) {
      console.error('WhatsApp message status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new WhatsAppService();
