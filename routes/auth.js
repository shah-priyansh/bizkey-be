const express = require('express');
const { auth } = require('../middleware/auth');
const { login, me, changePassword, getMyArea } = require('../controllers/auth');

const router = express.Router();

router.post('/login', login);

router.post('/change-password', auth, changePassword);
router.get('/me', auth, me);

module.exports = router;
