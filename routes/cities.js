const express = require('express');
const router = express.Router();
const {
  getAllCities,
  getCitiesByState,
} = require('../controllers/city');

// Public routes
router.get('/', getAllCities);
router.get('/state/:stateId', getCitiesByState);

module.exports = router;
