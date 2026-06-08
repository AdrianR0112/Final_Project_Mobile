const express = require('express');

const ratingsController = require('../controllers/ratings.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(roleMiddleware('cliente', 'tecnico'));

router.post('/services/:serviceId', ratingsController.rateMyService);
router.get('/services/:serviceId', ratingsController.getMyRatingByServiceId);
router.get('/me', ratingsController.getMyRatings);
router.get('/technicians/:technicianId', ratingsController.getTechnicianRatings);

module.exports = router;
