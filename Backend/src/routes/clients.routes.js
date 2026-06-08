const express = require('express');

const clientsController = require('../controllers/clients.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);
router.use(roleMiddleware('cliente'));

router.get('/me', clientsController.getMyClientProfile);
router.patch('/me', clientsController.updateMyClientProfile);

module.exports = router;
