const express = require('express');

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const technicianDocumentUpload = require('../middlewares/technician-document-upload.middleware');

const router = express.Router();

router.post('/register', technicianDocumentUpload.single('documento'), authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/me', authMiddleware, authController.me);

module.exports = router;
