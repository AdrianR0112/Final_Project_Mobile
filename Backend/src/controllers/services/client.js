const serviceModel = require('../../models/service.model');
const notificationModel = require('../../models/notification.model');
const { emitServiceUpdate } = require('../../sockets/io');

const requestService = async (req, res) => {
	try {
		const clienteId = req.user?.id;
		if (!clienteId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const {
			tipoEquipoId,
			descripcionProblema,
			modalidad,
			direccion,
			referenciaDireccion,
			latitud,
			longitud,
			marcaEquipo,
			modeloEquipo,
			numeroSerieEquipo,
			prioridad,
			requiereRepuestos,
			tiempoEstimadoHoras,
			fechaCompromiso,
		} = req.body;

		if (!tipoEquipoId || !descripcionProblema || !modalidad) {
			return res.status(400).json({
				message: 'tipoEquipoId, descripcionProblema y modalidad son obligatorios',
			});
		}

		if (!['domicilio', 'taller'].includes(modalidad)) {
			return res.status(400).json({ message: 'modalidad debe ser domicilio o taller' });
		}

		const serviceType = await serviceModel.getServiceTypeById(tipoEquipoId);
		if (!serviceType) {
			return res.status(400).json({ message: 'tipoEquipoId no es valido' });
		}

		if (modalidad === 'domicilio' && (!direccion || latitud === undefined || longitud === undefined)) {
			return res.status(400).json({
				message: 'Para modalidad domicilio se requiere direccion, latitud y longitud',
			});
		}

		const uploadedPhotos = (req.files || []).map(
			(file) => `${req.protocol}://${req.get('host')}/uploads/service-photos/${file.filename}`,
		);

		const service = await serviceModel.createServiceRequest({
			clienteId,
			tipoEquipoId,
			descripcionProblema,
			modalidad,
			direccion: direccion || null,
			referenciaDireccion: referenciaDireccion || null,
			latitud: latitud !== undefined ? latitud : null,
			longitud: longitud !== undefined ? longitud : null,
			marcaEquipo: marcaEquipo || null,
			modeloEquipo: modeloEquipo || null,
			numeroSerieEquipo: numeroSerieEquipo || null,
			prioridad: prioridad || 'normal',
			requiereRepuestos: requiereRepuestos !== undefined ? Boolean(requiereRepuestos) : false,
			tiempoEstimadoHoras: tiempoEstimadoHoras !== undefined ? tiempoEstimadoHoras : null,
			fechaCompromiso: fechaCompromiso || null,
			uploadedPhotos,
		});

		await notificationModel.notifyAdmins({
			servicioId: service.id,
			tipo: 'info',
			titulo: 'Nueva solicitud de servicio',
			mensaje: 'Se registro una nueva solicitud de servicio que requiere revision administrativa.',
			urlAccion: '/admin/services',
		});

		return res.status(201).json({
			message: 'Solicitud de servicio creada correctamente',
			serviceRequest: service,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al crear solicitud de servicio', error: error.message });
	}
};

const getMyServiceRequests = async (req, res) => {
	try {
		const clienteId = req.user?.id;
		if (!clienteId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const { estadoId, modalidad, limit, offset } = req.query;
		const services = await serviceModel.listMyServiceRequests(clienteId, {
			estadoId: estadoId ? Number(estadoId) : undefined,
			modalidad,
			limit: limit ? Number(limit) : 20,
			offset: offset ? Number(offset) : 0,
		});
		return res.status(200).json({ serviceRequests: services });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar solicitudes', error: error.message });
	}
};

const getMyServiceRequestById = async (req, res) => {
	try {
		const clienteId = req.user?.id;
		if (!clienteId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const service = await serviceModel.getMyServiceRequestById(serviceId, clienteId);
		if (!service) {
			return res.status(404).json({ message: 'Solicitud de servicio no encontrada' });
		}

		return res.status(200).json({ serviceRequest: service });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener solicitud de servicio', error: error.message });
	}
};

const acceptInitialQuote = async (req, res) => {
	try {
		const clientId = req.user?.id;
		if (!clientId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const acceptedService = await serviceModel.acceptInitialQuoteByClient(serviceId, clientId);
		if (acceptedService === null) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		if (acceptedService?.forbidden) {
			return res.status(403).json({ message: 'No puedes aceptar la cotizacion de este servicio' });
		}

		if (acceptedService?.invalidTransition) {
			return res.status(409).json({ message: `No se puede aceptar cotizacion cuando el servicio esta en ${acceptedService.currentState}` });
		}

		if (acceptedService.tecnico_id) {
			await notificationModel.createNotification({
				usuarioId: acceptedService.tecnico_id,
				servicioId: acceptedService.id,
				titulo: 'Cotizacion aceptada',
				mensaje: 'El cliente acepto la cotizacion inicial del servicio.',
			});
		}

		emitServiceUpdate(acceptedService, { reason: 'initial_quote_accepted' });

		return res.status(200).json({
			message: 'Cotizacion inicial aceptada correctamente',
			serviceRequest: acceptedService,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al aceptar cotizacion inicial', error: error.message });
	}
};

const rejectInitialQuote = async (req, res) => {
	try {
		const clientId = req.user?.id;
		if (!clientId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const currentService = await serviceModel.getServiceById(serviceId);
		const previousTechnicianId = currentService?.tecnico_id || null;
		const service = await serviceModel.rejectInitialQuoteByClient(serviceId, clientId);
		if (service === null) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		if (service?.forbidden) {
			return res.status(403).json({ message: 'No puedes rechazar la cotizacion de este servicio' });
		}

		if (service?.invalidTransition) {
			return res.status(409).json({ message: `No se puede rechazar cotizacion cuando el servicio esta en ${service.currentState}` });
		}

		if (previousTechnicianId) {
			await notificationModel.createNotification({
				usuarioId: previousTechnicianId,
				servicioId: service.id,
				titulo: 'Cotizacion rechazada',
				mensaje: 'El cliente rechazo la cotizacion inicial del servicio.',
			});
			await serviceModel.syncTechnicianAvailabilityByLoad(previousTechnicianId);
		}

		emitServiceUpdate(service, { reason: 'initial_quote_rejected' });

		return res.status(200).json({
			message: 'Cotizacion inicial rechazada correctamente',
			serviceRequest: service,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al rechazar cotizacion inicial', error: error.message });
	}
};

const listServiceTypes = async (_req, res) => {
	try {
		const types = await serviceModel.listServiceTypes();
		return res.status(200).json({ serviceTypes: types });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar tipos de equipo', error: error.message });
	}
};

module.exports = {
	requestService,
	getMyServiceRequests,
	getMyServiceRequestById,
	acceptInitialQuote,
	rejectInitialQuote,
	listServiceTypes,
};
