const express = require('express');

const usersController = require('../controllers/users.controller');
const profilePhotoUpload = require('../middlewares/profile-photo-upload.middleware');

const router = express.Router();

router.get('/me', usersController.getMyProfile);
router.patch('/me', usersController.updateMyProfile);
router.patch('/me/password', usersController.changeMyPassword);
router.post('/me/photo', profilePhotoUpload.single('foto'), usersController.uploadProfilePhoto);

module.exports = router;
