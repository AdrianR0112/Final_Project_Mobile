const express = require('express');

const adminController = require('../controllers/admin.controller');
const adminExtendedController = require('../controllers/admin-extended.controller');

const router = express.Router();

router.get('/dashboard', adminController.getDashboard);

router.get('/users', adminController.listUsers);
router.get('/users/:userId', adminController.getUserById);
router.patch('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.patch('/users/:userId/status', adminController.updateUserStatus);

router.get('/services', adminController.listServices);
router.get('/services/:serviceId', adminController.getServiceById);
router.patch('/services/:serviceId/assign', adminController.assignTechnicianToService);

router.get('/technicians', adminController.listTechnicians);
router.patch('/technicians/:technicianId/profile', adminController.updateTechnicianProfile);
router.patch('/technicians/:technicianId/approval', adminController.updateTechnicianApproval);
router.delete('/technicians/:technicianId/profile', adminController.deleteTechnicianProfile);

router.get('/ratings', adminController.listRatings);
router.patch('/ratings/:ratingId/visibility', adminController.updateRatingVisibility);

router.get('/reports', adminExtendedController.getReportsSummary);
router.get('/coverage-zones', adminExtendedController.listCoverageZones);
router.post('/coverage-zones', adminExtendedController.createCoverageZone);
router.patch('/coverage-zones/:zoneId', adminExtendedController.updateCoverageZone);
router.get('/system-config', adminExtendedController.listSystemConfig);
router.put('/system-config', adminExtendedController.upsertSystemConfig);

module.exports = router;
