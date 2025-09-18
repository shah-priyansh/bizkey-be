const express = require('express');
const { body, param } = require('express-validator');
const {
  sendOTP,
  verifyOTP,
  resendOTP,
  getOTPStatus
} = require('../controllers/otp');

const router = express.Router();

router.post('/send', [
  body('clientId')
    .notEmpty()
    .withMessage('Client ID is required')
    .isMongoId()
    .withMessage('Invalid client ID')
], sendOTP);

router.post('/verify', [
  body('clientId')
    .notEmpty()
    .withMessage('Client ID is required')
    .isMongoId()
    .withMessage('Invalid client ID'),
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
], verifyOTP);

router.post('/resend', [
  body('clientId')
    .notEmpty()
    .withMessage('Client ID is required')
    .isMongoId()
    .withMessage('Invalid client ID')
], resendOTP);

module.exports = router;
