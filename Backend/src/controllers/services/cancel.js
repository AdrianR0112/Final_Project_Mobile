const serviceModel = require('../../models/service.model');
const notificationModel = require('../../models/notification.model');
const { emitServiceUpdate } = require('../../sockets/io');

const cancelMyServiceRequest = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const fullService = await serviceModel.getServiceById(serviceId);
		if (!fullService) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		if (req.user?.role === 'tecnico' && fullService.tecnico_id !== userId) {
			return res.status(403).json({ message: 'No puedes cancelar este servicio' });
		}

		if (req.user?.role === 'tecnico' && ['en_reparacion', 'pendiente_pago', 'finalizado', 'cancelado'].includes(fullService.estado)) {
			return res.status(409).json({ message: 'No se puede cancelar una vez iniciada la reparacion' });
		}

		if (req.user?.role === 'cliente' && fullService.cliente_id !== userId) {
			return res.status(403).json({ message: 'No puedes cancelar este servicio' });
		}

		if (req.user?.role === 'cliente' && fullService.estado === 'en_camino') {
			return res.status(409).json({ message: 'No se puede cancelar cuando el tecnico ya esta en camino' });
		}

		const { motivoCancelacionId, detalleCancelacion } = req.body || {};
		const previousTechnicianId = fullService.tecnico_id;

		const service = await serviceModel.cancelMyServiceRequest(serviceId, userId, {
			motivoCancelacionId: motivoCancelacionId !== undefined ? Number(motivoCancelacionId) : null,
			detalleCancelacion: detalleCancelacion || null,
		});
		if (!service) {
			return res.status(404).json({ message: 'Solicitud de servicio no encontrada' });
		}

		if (service.tecnico_id && service.tecnico_id !== userId) {
			await notificationModel.createNotification({
				usuarioId: service.tecnico_id,
				servicioId: service.id,
				titulo: 'Solicitud cancelada',
				mensaje: 'El cliente cancelo la solicitud de servicio.',
			});
		}

		if (service.cliente_id && service.cliente_id !== userId) {
			await notificationModel.createNotification({
				usuarioId: service.cliente_id,
				servicioId: service.id,
				titulo: 'Solicitud cancelada por el tecnico',
				mensaje: 'El tecnico cancelo la solicitud de servicio.',
			});
		}

		if (previousTechnicianId) {
			await serviceModel.syncTechnicianAvailabilityByLoad(previousTechnicianId);
		}

		emitServiceUpdate(service, { reason: 'service_cancelled' });

		return res.status(200).json({
			message: 'Solicitud de servicio cancelada correctamente',
			serviceRequest: service,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al cancelar solicitud de servicio', error: error.message });
	}
};

module.exports = { cancelMyServiceRequest };
