const express = require('express');

const chatController = require('../controllers/chat.controller');
const chatAttachmentUpload = require('../middlewares/chat-attachment-upload.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(roleMiddleware('cliente', 'tecnico'));

router.get('/unread', chatController.getUnreadMessagesCount);
router.get('/services/:serviceId/messages', chatController.getServiceMessages);
router.post('/services/:serviceId/messages', chatAttachmentUpload.single('archivo'), chatController.sendServiceMessage);
router.patch('/services/:serviceId/read', chatController.markServiceMessagesAsRead);

module.exports = router;
