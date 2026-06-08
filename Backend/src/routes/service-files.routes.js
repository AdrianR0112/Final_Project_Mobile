const express = require('express');

const serviceFilesController = require('../controllers/service-files.controller');
const roleMiddleware = require('../middlewares/role.middleware');
const serviceFileUpload = require('../middlewares/service-file-upload.middleware');

const router = express.Router();

router.use(roleMiddleware('cliente', 'tecnico', 'admin'));
router.get('/services/:serviceId', serviceFilesController.listServiceFiles);
router.post('/services/:serviceId', serviceFileUpload.single('archivo'), serviceFilesController.createServiceFile);
router.delete('/:fileId', serviceFilesController.deleteServiceFile);

module.exports = router;
