const express = require('express');

const notificationsController = require('../controllers/notifications.controller');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(roleMiddleware('cliente', 'tecnico', 'admin'));

router.get('/me', notificationsController.getMyNotifications);
router.get('/me/unread', notificationsController.getMyUnreadNotificationsCount);
router.patch('/me/read-all', notificationsController.markAllMyNotificationsAsRead);
router.patch('/:id/read', notificationsController.markNotificationAsRead);

module.exports = router;
