const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  generateSignedUrl,
  generateAudioPlaybackUrl,
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  getFeedbackStats,
  getFeedbackByClient
} = require('../controllers/feedback');
const feedbackValidation = require('../validations/feedback');

router.post('/signed-url', auth, feedbackValidation.generateSignedUrlValidation, generateSignedUrl);

router.get('/:feedbackId/audio-url', auth, generateAudioPlaybackUrl);

router.post('/', auth, feedbackValidation.createFeedbackValidation, createFeedback);

router.get('/', auth, getAllFeedback);

router.get('/client', auth, getFeedbackByClient);

router.get('/stats', auth, getFeedbackStats);

router.get('/:id', auth, getFeedbackById);

router.put('/:id', auth, feedbackValidation.updateFeedbackValidation, updateFeedback);

router.delete('/:id', auth, deleteFeedback);

module.exports = router;
