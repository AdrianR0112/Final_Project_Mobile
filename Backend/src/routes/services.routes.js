const express = require('express');

const servicesController = require('../controllers/services.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');
const serviceRequestPhotoUpload = require('../middlewares/service-request-photo-upload.middleware');

const router = express.Router();

router.get('/open', authMiddleware, roleMiddleware('tecnico'), servicesController.getOpenServiceRequests);
router.get('/open/:id', authMiddleware, roleMiddleware('tecnico'), servicesController.getOpenServiceRequestById);
router.get('/assigned', authMiddleware, roleMiddleware('tecnico'), servicesController.getMyAssignedServiceRequests);
router.get('/assigned/:id', authMiddleware, roleMiddleware('tecnico'), servicesController.getMyAssignedServiceRequestById);
router.patch('/:id/accept', authMiddleware, roleMiddleware('tecnico'), servicesController.acceptServiceRequest);
router.patch('/:id/initial-quote', authMiddleware, roleMiddleware('tecnico'), servicesController.sendInitialQuote);
router.patch('/:id/status', authMiddleware, roleMiddleware('tecnico'), servicesController.updateMyAssignedServiceStatus);

router.get('/types', authMiddleware, roleMiddleware('cliente', 'tecnico'), servicesController.listServiceTypes);
router.get('/history', authMiddleware, roleMiddleware('cliente', 'tecnico'), servicesController.getMyServiceHistory);
router.get('/history/:id', authMiddleware, roleMiddleware('cliente', 'tecnico'), servicesController.getMyServiceHistoryById);
router.post('/request', authMiddleware, roleMiddleware('cliente'), serviceRequestPhotoUpload.array('fotos', 5), servicesController.requestService);
router.get('/me', authMiddleware, roleMiddleware('cliente'), servicesController.getMyServiceRequests);
router.get('/me/:id', authMiddleware, roleMiddleware('cliente'), servicesController.getMyServiceRequestById);
router.patch('/:id/accept-initial-quote', authMiddleware, roleMiddleware('cliente'), servicesController.acceptInitialQuote);
router.patch('/:id/reject-initial-quote', authMiddleware, roleMiddleware('cliente'), servicesController.rejectInitialQuote);
router.patch('/:id/cancel', authMiddleware, roleMiddleware('cliente', 'tecnico'), servicesController.cancelMyServiceRequest);

module.exports = router;
