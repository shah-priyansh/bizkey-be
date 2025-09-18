const express = require('express');
const router = express.Router();
const {
  getAllStates,
  getStateById,
} = require('../controllers/state');

// Public routes
router.get('/', getAllStates);
router.get('/:id', getStateById);

module.exports = router;
