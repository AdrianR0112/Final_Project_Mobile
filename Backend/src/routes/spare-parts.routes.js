const express = require('express');

const sparePartsController = require('../controllers/spare-parts.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(roleMiddleware('cliente', 'tecnico', 'admin'));
router.get('/services/:serviceId', sparePartsController.listServiceParts);
router.post('/services/:serviceId', sparePartsController.createServicePart);
router.patch('/:partId', sparePartsController.updateServicePart);
router.delete('/:partId', sparePartsController.deleteServicePart);

module.exports = router;
