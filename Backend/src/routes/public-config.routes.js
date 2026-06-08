const express = require('express');

const publicConfigController = require('../controllers/public-config.controller');

const router = express.Router();

router.get('/contact', publicConfigController.getPublicContactConfig);
router.get('/coverage-zones', publicConfigController.getPublicCoverageZones);

module.exports = router;
