const ratingModel = require('../models/rating.model');
const notificationModel = require('../models/notification.model');

const buildRating = (rating) => ({
	id: rating.id,
	serviceId: rating.servicio_id,
	authorId: rating.emisor_id,
	receiverId: rating.receptor_id,
	clientId: rating.cliente_id,
	technicianId: rating.tecnico_id,
	authorRole: Number(rating.emisor_id) === Number(rating.cliente_id) ? 'cliente' : 'tecnico',
	receiverRole: Number(rating.receptor_id) === Number(rating.cliente_id) ? 'cliente' : 'tecnico',
	score: rating.puntuacion,
	comment: rating.comentario,
	date: rating.fecha,
	visible: rating.visible,
	service: {
		stateId: rating.estado_id,
		state: rating.estado,
		completedAt: rating.fecha_finalizacion,
		type: rating.tipo_equipo,
	},
	author: {
		name: rating.emisor_nombre,
		lastName: rating.emisor_apellido,
		email: rating.emisor_correo,
	},
	receiver: {
		name: rating.receptor_nombre,
		lastName: rating.receptor_apellido,
		email: rating.receptor_correo,
	},
	technician: {
		name: rating.tecnico_nombre,
		lastName: rating.tecnico_apellido,
		email: rating.tecnico_correo,
	},
	client: rating.cliente_nombre || rating.cliente_apellido || rating.cliente_correo ? {
		name: rating.cliente_nombre,
		lastName: rating.cliente_apellido,
		email: rating.cliente_correo,
	} : undefined,
});

const rateMyService = async (req, res) => {
	try {
		const clientId = req.user?.id;
		const authorRole = req.user?.role;
		if (!clientId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'serviceId invalido' });
		}

		const { puntuacion, comentario } = req.body;
		if (puntuacion === undefined) {
			return res.status(400).json({ message: 'puntuacion es obligatoria' });
		}

		const score = Number(puntuacion);
		if (!Number.isInteger(score) || score < 1 || score > 5) {
			return res.status(400).json({ message: 'puntuacion debe estar entre 1 y 5' });
		}

		const result = await ratingModel.upsertServiceRating({
			serviceId,
			authorId: clientId,
			authorRole,
			puntuacion: score,
			comentario,
		});

		if (!result.service) {
			return res.status(404).json({ message: 'Solicitud de servicio no encontrada' });
		}

		if (result.forbidden) {
			return res.status(403).json({ message: result.message || 'No autorizado para calificar este servicio' });
		}

		if (result.rating?.receptor_id) {
			await notificationModel.createNotification({
				usuarioId: result.rating.receptor_id,
				servicioId: result.rating.servicio_id,
				titulo: 'Nueva calificacion recibida',
				mensaje: authorRole === 'tecnico' ? 'Un tecnico califico a un cliente en un servicio finalizado.' : 'Un cliente califico uno de tus servicios.',
			});
		}

		return res.status(201).json({
			message: 'Calificacion registrada correctamente',
			rating: buildRating(result.rating),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al registrar calificacion', error: error.message });
	}
};

	const getMyRatings = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const query = req.query || {};
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;

		const ratings = await ratingModel.listMyRatings(userId, { limit, offset });
		return res.status(200).json({ ratings: ratings.map(buildRating) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar calificaciones', error: error.message });
	}
};

	const getMyRatingByServiceId = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'serviceId invalido' });
		}

		const rating = await ratingModel.getMyRatingByServiceId(serviceId, userId);
		if (!rating) {
			return res.status(200).json({ rating: null });
		}

		return res.status(200).json({ rating: buildRating(rating) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener calificacion', error: error.message });
	}
};

const getTechnicianRatings = async (req, res) => {
	try {
		const technicianId = Number(req.params.technicianId);
		if (!Number.isInteger(technicianId) || technicianId <= 0) {
			return res.status(400).json({ message: 'technicianId invalido' });
		}

		const query = req.query || {};
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;

		const result = await ratingModel.listTechnicianRatings(technicianId, { limit, offset });
		return res.status(200).json({
			stats: result.stats,
			ratings: result.ratings.map(buildRating),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar calificaciones del tecnico', error: error.message });
	}
};

module.exports = {
	rateMyService,
	getMyRatings,
	getMyRatingByServiceId,
	getTechnicianRatings,
};
