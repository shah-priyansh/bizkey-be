const { validationResult } = require('express-validator');
const Otp = require('../models/Otp');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const whatsappService = require('../services/whatsappService');

const sendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { clientId } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.phone) {
      return res.status(400).json({
        success: false,
        message: 'Client does not have a phone number'
      });
    }

    const otpCode = Otp.generateOTP();

    await Otp.updateMany(
      { client: clientId, isUsed: false },
      { isUsed: true }
    );

    const otp = new Otp({
      client: clientId,
      otp: otpCode,
      phone: client.phone
    });

    await otp.save();

    // Skip WhatsApp sending for testing purposes
    // const whatsappResult = await whatsappService.sendOTP(
    //   client.phone,
    //   otpCode,
    //   client.name
    // );

    // Create notification/audit log
    if (req.user) {
      const notification = new Notification({
        type: 'otp_sent',
        salesman: req.user._id,
        client: client._id,
        clientName: client.name,
        clientPhone: client.phone,
        salesmanName: `${req.user.firstName} ${req.user.lastName}`,
        message: `OTP sent to ${client.name} (${client.phone})`,
        status: 'success',
        otpId: otp._id,
        deliveryMethod: 'Testing Mode (No WhatsApp)'
      });
      await notification.save();
    }

    console.log(`OTP generated for testing: ${client.name} (${client.phone}): ${otpCode}`);

    res.json({
      success: true,
      message: 'OTP generated successfully (Testing mode - WhatsApp disabled)',
      data: {
        clientId: client._id,
        clientName: client.name,
        phone: client.phone,
        expiresIn: '5 minutes',
        expiresAt: otp.expiresAt,
        deliveryMethod: 'Testing Mode',
        otp: otpCode // Include OTP in response for testing
      }
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { clientId, otp } = req.body;

    const otpRecord = await Otp.findOne({
      client: clientId,
      otp: otp,
      isUsed: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (!otpRecord.isValid()) {
      otpRecord.isUsed = true;
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: 'OTP has expired or exceeded maximum attempts'
      });
    }

    otpRecord.attempts += 1;

    if (otpRecord.otp !== otp) {
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        attemptsLeft: 3 - otpRecord.attempts
      });
    }

    otpRecord.isUsed = true;
    await otpRecord.save();

    const client = await Client.findById(clientId);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        clientId: client._id,
        clientName: client.name,
        phone: client.phone,
        verifiedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const resendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { clientId } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.phone) {
      return res.status(400).json({
        success: false,
        message: 'Client does not have a phone number'
      });
    }

    const existingOTP = await Otp.findOne({
      client: clientId,
      isUsed: false
    }).sort({ createdAt: -1 });

    if (existingOTP && existingOTP.isValid()) {
      const timeSinceLastOTP = new Date() - existingOTP.createdAt;
      const minInterval = 30 * 1000; // 30 seconds

      if (timeSinceLastOTP < minInterval) {
        const waitTime = Math.ceil((minInterval - timeSinceLastOTP) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting another OTP`
        });
      }
    }

    const otpCode = Otp.generateOTP();

    await Otp.updateMany(
      { client: clientId, isUsed: false },
      { isUsed: true }
    );

    const otp = new Otp({
      client: clientId,
      otp: otpCode,
      phone: client.phone
    });

    await otp.save();

    // Skip WhatsApp sending for testing purposes
    // const whatsappResult = await whatsappService.sendOTP(
    //   client.phone,
    //   otpCode,
    //   client.name
    // );

    // Create notification/audit log for resend
    if (req.user) {
      const notification = new Notification({
        type: 'otp_resent',
        salesman: req.user._id,
        client: client._id,
        clientName: client.name,
        clientPhone: client.phone,
        salesmanName: `${req.user.firstName} ${req.user.lastName}`,
        message: `OTP resent to ${client.name} (${client.phone})`,
        status: 'success',
        otpId: otp._id,
        deliveryMethod: 'Testing Mode (No WhatsApp)'
      });
      await notification.save();
    }

    console.log(`OTP regenerated for testing: ${client.name} (${client.phone}): ${otpCode}`);

    res.json({
      success: true,
      message: 'OTP regenerated successfully (Testing mode - WhatsApp disabled)',
      data: {
        clientId: client._id,
        clientName: client.name,
        phone: client.phone,
        expiresIn: '5 minutes',
        expiresAt: otp.expiresAt,
        deliveryMethod: 'Testing Mode',
        otp: otpCode // Include OTP in response for testing
      }
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get OTP status for client
// @access  Public
const getOTPStatus = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Find the most recent OTP for this client
    const otpRecord = await Otp.findOne({
      client: clientId
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.json({
        success: true,
        data: {
          hasActiveOTP: false,
          message: 'No OTP found'
        }
      });
    }

    const isValid = otpRecord.isValid();
    const timeLeft = Math.max(0, Math.floor((otpRecord.expiresAt - new Date()) / 1000));

    res.json({
      success: true,
      data: {
        hasActiveOTP: isValid,
        isUsed: otpRecord.isUsed,
        attempts: otpRecord.attempts,
        timeLeft: timeLeft,
        expiresAt: otpRecord.expiresAt
      }
    });

  } catch (error) {
    console.error('Get OTP status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  resendOTP,
  getOTPStatus,
};
