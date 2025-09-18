const express = require('express');
const { body } = require('express-validator');
const { adminAuth, auth } = require('../middleware/auth');
const {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  assignSalesman,
  toggleClientStatus
} = require('../controllers/client');

const router = express.Router();
router.post('/', [
  adminAuth,
  body('name').notEmpty().withMessage('Client name is required'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('area').notEmpty().withMessage('Area is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('company').optional().trim(),
  body('address.street').optional().trim(),
  body('address.city').optional().trim(),
  body('address.state').optional().trim(),
  body('address.zipCode').optional().trim(),
  body('notes').optional().trim()
], createClient);

router.get('/',auth, getClients);

router.get('/:id', getClientById);

router.put('/:id', 
  body('name').optional().notEmpty().withMessage('Client name cannot be empty'),
  body('phone').optional().notEmpty().withMessage('Phone number cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('status').optional().isIn(['active', 'inactive', 'prospect', 'customer']).withMessage('Invalid status')
, updateClient);

router.delete('/:id', adminAuth, deleteClient);

router.post('/:id/assign-salesman', [
  adminAuth,
  body('salesmanId').notEmpty().withMessage('Salesman ID is required')
], assignSalesman);

router.patch('/:id/toggle-status', adminAuth, toggleClientStatus);

module.exports = router;
