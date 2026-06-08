const express = require('express');

const warrantiesController = require('../controllers/warranties.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(roleMiddleware('cliente', 'tecnico', 'admin'));
router.get('/services/:serviceId', warrantiesController.getServiceWarranty);
router.post('/services/:serviceId', warrantiesController.createServiceWarranty);
router.patch('/:warrantyId', warrantiesController.updateWarranty);

module.exports = router;
