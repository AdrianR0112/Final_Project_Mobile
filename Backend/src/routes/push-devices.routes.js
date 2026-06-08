const express = require('express');

const pushDevicesController = require('../controllers/push-devices.controller');

const router = express.Router();

router.get('/me', pushDevicesController.listMyPushDevices);
router.post('/me', pushDevicesController.registerMyPushDevice);
router.patch('/:deviceId', pushDevicesController.updateMyPushDevice);
router.delete('/:deviceId', pushDevicesController.deleteMyPushDevice);

module.exports = router;
