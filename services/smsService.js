const twilio = require('twilio');

class SMSService {
    constructor() {
        this.client = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        this.smsFrom = process.env.TWILIO_SMS_FROM || process.env.TWILIO_PHONE_NUMBER;
    }

    async sendOTP(to, otp, clientName = 'Valued Customer') {
        try {
            const smsTo = this.formatPhoneNumber(to);
            const smsFrom = this.smsFrom;

            const message = this.createOTPMessage(otp, clientName);

            const response = await this.client.messages.create({
                body: message,
                from: smsFrom,
                to: smsTo
            });

            console.log(`SMS OTP sent successfully:`, {
                messageSid: response.sid,
                to: smsTo,
                clientName: clientName
            });

            return {
                success: true,
                messageSid: response.sid,
                status: response.status
            };

        } catch (error) {
            console.error('SMS OTP send error:', error);

            return {
                success: false,
                error: error.message,
                code: error.code
            };
        }
    }

    formatPhoneNumber(phone) {
        let cleanPhone = phone.replace(/\D/g, '');

        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }

        return `+${cleanPhone}`;
    }

    createOTPMessage(otp, clientName) {
        return `OTP Verification

Hello ${clientName}!

Your OTP for verification is: ${otp}

This OTP is valid for 5 minutes only.

Please do not share this OTP with anyone.

Thank you for choosing our services!

---
This is an automated message. Please do not reply.`;
    }
}

module.exports = new SMSService();
