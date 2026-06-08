const paymentModel = require('../models/payment.model');
const { getAccessibleServiceById } = require('../models/service-access.util');
const serviceModel = require('../models/service.model');
const technicianModel = require('../models/technician.model');
const notificationModel = require('../models/notification.model');
const { emitServiceUpdate } = require('../sockets/io');

const buildPayment = (payment) => ({
	id: payment.id,
	serviceId: payment.servicio_id,
	stateId: payment.estado_pago_id,
	state: payment.estado_pago,
	method: payment.metodo_pago,
	amount: payment.monto,
	currency: payment.moneda,
	reference: payment.referencia_transaccion,
	receiptUrl: payment.comprobante_url,
	notes: payment.notas,
	recordedBy: payment.registrado_por,
	paidAt: payment.pagado_en,
	createdAt: payment.fecha_registro,
	recorder: payment.registrado_por_nombre || payment.registrado_por_apellido || payment.registrado_por_correo ? {
		name: payment.registrado_por_nombre,
		lastName: payment.registrado_por_apellido,
		email: payment.registrado_por_correo,
	} : undefined,
});

const listPaymentStates = async (_req, res) => {
	try {
		const states = await paymentModel.listStates();
		return res.status(200).json({ paymentStates: states });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar estados de pago', error: error.message });
	}
};

const listServicePayments = async (req, res) => {
	try {
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'serviceId invalido' });
		const service = await getAccessibleServiceById(serviceId, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const payments = await paymentModel.listByServiceId(serviceId);
		return res.status(200).json({ payments: payments.map(buildPayment) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar pagos del servicio', error: error.message });
	}
};

const createServicePayment = async (req, res) => {
	try {
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'serviceId invalido' });
		if (req.user?.role === 'tecnico') return res.status(403).json({ message: 'El pago debe ser registrado por el cliente o un administrador' });
		const service = await getAccessibleServiceById(serviceId, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const fullService = await serviceModel.getServiceById(serviceId);
		if (!fullService) return res.status(404).json({ message: 'Servicio no encontrado' });
		if (fullService.estado !== 'pendiente_pago') return res.status(409).json({ message: `No se puede registrar el pago cuando el servicio esta en ${fullService.estado}` });
		const receiptUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/payment-receipts/${req.file.filename}` : null;
		const { metodoPago, monto } = req.body || {};
		if (!metodoPago || monto === undefined) return res.status(400).json({ message: 'metodoPago y monto son obligatorios' });
		if (['transferencia', 'tarjeta', 'otro'].includes(String(metodoPago).toLowerCase()) && !receiptUrl) {
			return res.status(400).json({ message: 'Debes adjuntar el comprobante de pago para este metodo' });
		}
		const paidState = await paymentModel.getStateByName('pagado');
		if (!paidState) return res.status(500).json({ message: 'No se encontro el estado de pago pagado' });

		const payment = await paymentModel.createForService(serviceId, req.user.id, {
			...(req.body || {}),
			comprobanteUrl: receiptUrl,
			estadoPagoId: paidState.id,
			pagadoEn: req.body?.pagadoEn || new Date().toISOString(),
		});
		const updatedService = await serviceModel.markServiceAsPaid(serviceId);
		if (updatedService?.invalidTransition) {
			return res.status(409).json({ message: `No se puede registrar el pago cuando el servicio esta en ${updatedService.currentState}` });
		}
		if (updatedService?.tecnico_id) {
			await notificationModel.createNotification({
				usuarioId: updatedService.tecnico_id,
				servicioId: updatedService.id,
				titulo: 'Pago enviado por el cliente',
				mensaje: 'El cliente registro el pago. Debes validarlo para finalizar el servicio.',
			});
		}

		emitServiceUpdate(updatedService, { reason: 'payment_registered' });

		return res.status(201).json({
			message: 'Pago registrado correctamente. Queda pendiente la validacion del tecnico.',
			payment: buildPayment(payment),
			serviceRequest: updatedService,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al registrar pago', error: error.message });
	}
};

const updatePayment = async (req, res) => {
	try {
		const paymentId = Number(req.params.paymentId);
		if (!Number.isInteger(paymentId) || paymentId <= 0) return res.status(400).json({ message: 'paymentId invalido' });
		const payment = await paymentModel.getById(paymentId);
		if (!payment) return res.status(404).json({ message: 'Pago no encontrado' });
		const service = await getAccessibleServiceById(payment.servicio_id, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const updated = await paymentModel.updateById(paymentId, req.body || {});
		return res.status(200).json({ message: 'Pago actualizado correctamente', payment: buildPayment(updated) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar pago', error: error.message });
	}
};

module.exports = { listPaymentStates, listServicePayments, createServicePayment, updatePayment };
