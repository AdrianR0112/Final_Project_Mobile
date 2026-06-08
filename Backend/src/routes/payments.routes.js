const express = require('express');

const paymentsController = require('../controllers/payments.controller');
const paymentReceiptUpload = require('../middlewares/payment-receipt-upload.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(roleMiddleware('cliente', 'tecnico', 'admin'));
router.get('/states', paymentsController.listPaymentStates);
router.get('/services/:serviceId', paymentsController.listServicePayments);
router.post('/services/:serviceId', paymentReceiptUpload.single('comprobante'), paymentsController.createServicePayment);
router.patch('/:paymentId', paymentsController.updatePayment);

module.exports = router;
