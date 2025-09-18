const express = require('express');
const { adminAuth } = require('../middleware/auth');
const areaController = require('../controllers/area');
const areaValidation = require('../validations/area');

const router = express.Router();

router.use(adminAuth);


router.post('/', 
  areaValidation.createAreaValidation,
  areaController.createArea
);


router.get('/', 
  areaValidation.getAreasValidation,
  areaController.getAllAreas
);

router.put('/:id', 
  areaValidation.updateAreaValidation,
  areaController.updateArea
);

router.patch('/:id/toggle-status', 
  areaValidation.toggleStatusValidation,
  areaController.toggleAreaStatus
);
router.delete('/:id', 
  areaValidation.areaIdValidation,
  areaController.deleteArea
);

module.exports = router;
