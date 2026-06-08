const serviceModel = require('../../models/service.model');
const technicianModel = require('../../models/technician.model');
const notificationModel = require('../../models/notification.model');
const fileModel = require('../../models/service-file.model');
const { emitServiceUpdate } = require('../../sockets/io');

const buildServiceFile = (file) => ({
	id: file.id,
	serviceId: file.servicio_id,
	uploadedBy: file.subido_por,
	type: file.tipo,
	stage: file.etapa,
	url: file.url,
	description: file.descripcion,
	uploadedAt: file.fecha_subida,
});

const getOpenServiceRequests = async (req, res) => {
	try {
		const query = req.query || {};
		const modalidad = query.modalidad;
		const tipoEquipoId = query.tipoEquipoId ? Number(query.tipoEquipoId) : undefined;
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;
		const technicianId = req.user?.id;

		if (tipoEquipoId !== undefined && (!Number.isInteger(tipoEquipoId) || tipoEquipoId <= 0)) {
			return res.status(400).json({ message: 'tipoEquipoId invalido' });
		}

		const serviceRequests = await serviceModel.getOpenServiceRequests({
			modalidad,
			tipoEquipoId,
			limit,
			offset,
			technicianId,
		});

		return res.status(200).json({ serviceRequests });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar solicitudes abiertas', error: error.message });
	}
};

const getOpenServiceRequestById = async (req, res) => {
	try {
		const technicianId = req.user?.id;
		if (!technicianId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const serviceRequest = await serviceModel.getOpenServiceRequestById(serviceId, technicianId);
		if (!serviceRequest) {
			return res.status(404).json({ message: 'Solicitud abierta no encontrada' });
		}

		const files = await fileModel.listByServiceId(serviceId);
		return res.status(200).json({ serviceRequest, files: files.map(buildServiceFile) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener solicitud abierta', error: error.message });
	}
};

const acceptServiceRequest = async (req, res) => {
	try {
		const technicianId = req.user?.id;
		if (!technicianId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const acceptedService = await serviceModel.acceptServiceRequestByTechnician(serviceId, technicianId);
		if (acceptedService === null) {
			return res.status(404).json({ message: 'Solicitud de servicio no encontrada' });
		}

		if (acceptedService === false) {
			return res.status(409).json({ message: 'La solicitud ya fue asignada o no esta disponible' });
		}

		if (acceptedService?.capacityReached) {
			return res.status(409).json({ message: 'Ya no puedes aceptar mas solicitudes hasta completar las que ya tienes activas' });
		}

		await serviceModel.syncTechnicianAvailabilityByLoad(technicianId);

		await notificationModel.createNotification({
			usuarioId: acceptedService.cliente_id,
			servicioId: acceptedService.id,
			titulo: 'Solicitud asignada',
			mensaje: 'Tu solicitud de servicio fue aceptada por un tecnico.',
		});

		return res.status(200).json({
			message: 'Solicitud de servicio aceptada correctamente',
			serviceRequest: acceptedService,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al aceptar solicitud de servicio', error: error.message });
	}
};

const sendInitialQuote = async (req, res) => {
	try {
		const technicianId = req.user?.id;
		if (!technicianId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const quote = await serviceModel.sendInitialQuoteByTechnician(serviceId, technicianId, req.body || {});
		if (quote === null) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		if (quote?.forbidden) {
			return res.status(403).json({ message: 'No puedes enviar cotizacion para este servicio' });
		}

		if (quote?.invalidTransition) {
			return res.status(409).json({ message: `No se puede enviar cotizacion cuando el servicio esta en ${quote.currentState}` });
		}

		if (quote?.invalidPayload) {
			return res.status(400).json({ message: quote.message });
		}

		if (quote?.capacityReached) {
			return res.status(409).json({ message: 'Ya no puedes aceptar mas solicitudes hasta completar las que ya tienes activas' });
		}

		await serviceModel.syncTechnicianAvailabilityByLoad(technicianId);

		await notificationModel.createNotification({
			usuarioId: quote.cliente_id,
			servicioId: quote.id,
			titulo: 'Cotizacion inicial enviada',
			mensaje: 'Tu tecnico envio una cotizacion inicial para que la revises y confirmes.',
		});

		emitServiceUpdate(quote, { reason: 'initial_quote_sent' });
		return res.status(200).json({
			message: 'Cotizacion inicial enviada correctamente',
			serviceRequest: quote,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al enviar cotizacion inicial', error: error.message });
	}
};

const getMyAssignedServiceRequests = async (req, res) => {
	try {
		const technicianId = req.user?.id;
		if (!technicianId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const query = req.query || {};
		const estadoId = query.estadoId ? Number(query.estadoId) : undefined;
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;

		const serviceRequests = await serviceModel.listMyAssignedRequests(technicianId, {
			estadoId,
			limit,
			offset,
		});

		return res.status(200).json({ serviceRequests });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar solicitudes asignadas', error: error.message });
	}
};

const getMyAssignedServiceRequestById = async (req, res) => {
	try {
		const technicianId = req.user?.id;
		if (!technicianId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const serviceRequest = await serviceModel.getMyAssignedRequestById(serviceId, technicianId);
		if (!serviceRequest) {
			return res.status(404).json({ message: 'Servicio asignado no encontrado' });
		}

		return res.status(200).json({ serviceRequest });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener servicio asignado', error: error.message });
	}
};

const updateMyAssignedServiceStatus = async (req, res) => {
	try {
		const technicianId = req.user?.id;
		if (!technicianId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const { estado } = req.body || {};
		if (!estado) {
			return res.status(400).json({ message: 'estado es obligatorio' });
		}

		const updatedService = await serviceModel.updateAssignedServiceStatusByTechnician(serviceId, technicianId, String(estado).trim().toLowerCase(), req.body || {});

		if (updatedService === null) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		if (updatedService?.forbidden) {
			return res.status(403).json({ message: 'No puedes actualizar el estado de este servicio' });
		}

		if (updatedService?.invalidTransition) {
			return res.status(409).json({ message: `No se puede cambiar de ${updatedService.currentState} a ${estado}` });
		}

		if (updatedService?.invalidPayload) {
			return res.status(400).json({ message: updatedService.message });
		}

		await serviceModel.syncTechnicianAvailabilityByLoad(technicianId);

		await notificationModel.createNotification({
			usuarioId: updatedService.cliente_id,
			servicioId: updatedService.id,
			titulo: 'Estado del servicio actualizado',
			mensaje: `Tu servicio ahora esta en estado ${updatedService.estado}.`,
		});

		emitServiceUpdate(updatedService, { reason: 'service_status_changed' });
		return res.status(200).json({
			message: 'Estado del servicio actualizado correctamente',
			serviceRequest: updatedService,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar estado del servicio', error: error.message });
	}
};

module.exports = {
	buildServiceFile,
	getOpenServiceRequests,
	getOpenServiceRequestById,
	acceptServiceRequest,
	sendInitialQuote,
	getMyAssignedServiceRequests,
	getMyAssignedServiceRequestById,
	updateMyAssignedServiceStatus,
};
