const express = require('express');

const techniciansController = require('../controllers/technicians.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.get('/specialties', techniciansController.listSpecialties);

router.use(authMiddleware);

router.get('/me', roleMiddleware('tecnico'), techniciansController.getMyTechnicianProfile);
router.patch('/me', roleMiddleware('tecnico'), techniciansController.updateMyTechnicianProfile);
router.patch('/me/location', roleMiddleware('tecnico'), techniciansController.updateMyTechnicianLocation);
router.patch('/me/specialties', roleMiddleware('tecnico'), techniciansController.updateMyTechnicianSpecialties);
router.get('/available', roleMiddleware('cliente', 'tecnico'), techniciansController.listAvailableTechnicians);

module.exports = router;
