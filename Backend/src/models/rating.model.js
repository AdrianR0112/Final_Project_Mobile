const db = require('../config/db');

const RATING_SELECT = `
			SELECT
				c.id,
				c.servicio_id,
				c.emisor_id,
				c.receptor_id,
				c.puntuacion,
				c.comentario,
				c.fecha,
				c.visible,
				s.estado_id,
				es.nombre AS estado,
				s.fecha_finalizacion,
				s.cliente_id,
				s.tecnico_id,
				te.nombre AS tipo_equipo,
				ua.nombre AS emisor_nombre,
				ua.apellido AS emisor_apellido,
				ua.correo AS emisor_correo,
				ur.nombre AS receptor_nombre,
				ur.apellido AS receptor_apellido,
				ur.correo AS receptor_correo,
				uc.nombre AS cliente_nombre,
				uc.apellido AS cliente_apellido,
				uc.correo AS cliente_correo,
				ut.nombre AS tecnico_nombre,
				ut.apellido AS tecnico_apellido,
				ut.correo AS tecnico_correo
			FROM calificaciones c
			JOIN servicios s ON s.id = c.servicio_id
			JOIN estados_servicio es ON es.id = s.estado_id
			JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
			JOIN usuarios ua ON ua.id = c.emisor_id
			JOIN usuarios ur ON ur.id = c.receptor_id
			JOIN usuarios uc ON uc.id = s.cliente_id
			LEFT JOIN usuarios ut ON ut.id = s.tecnico_id
`;

const getServiceRatingByServiceId = async (serviceId, authorId) => {
	const { rows } = await db.query(
		`
			${RATING_SELECT}
			WHERE c.servicio_id = $1 AND c.emisor_id = $2
			LIMIT 1
		`,
		[serviceId, authorId],
	);

	return rows[0] || null;
};

const getServiceContextForRating = async (serviceId) => {
	const { rows } = await db.query(
		`
			SELECT
				s.id,
				s.cliente_id,
				s.tecnico_id,
				s.estado_id,
				es.nombre AS estado,
				s.fecha_finalizacion,
				uc.nombre AS cliente_nombre,
				uc.apellido AS cliente_apellido,
				uc.correo AS cliente_correo,
				ut.nombre AS tecnico_nombre,
				ut.apellido AS tecnico_apellido,
				ut.correo AS tecnico_correo,
				te.nombre AS tipo_equipo
			FROM servicios s
			JOIN estados_servicio es ON es.id = s.estado_id
			JOIN usuarios uc ON uc.id = s.cliente_id
			LEFT JOIN usuarios ut ON ut.id = s.tecnico_id
			JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
			WHERE s.id = $1
			LIMIT 1
		`,
		[serviceId],
	);

	return rows[0] || null;
};

const upsertServiceRating = async ({
	serviceId,
	authorId,
	authorRole,
	puntuacion,
	comentario,
}) => {
	const service = await getServiceContextForRating(serviceId);
	if (!service) {
		return { service: null, rating: null, forbidden: false };
	}

	if (!service.tecnico_id) {
		return { service, rating: null, forbidden: true, message: 'La solicitud aun no tiene tecnico asignado' };
	}

	if (service.estado !== 'finalizado') {
		return { service, rating: null, forbidden: true, message: 'Solo se puede calificar un servicio finalizado' };
	}

	let receiverId = null;
	if (authorRole === 'cliente') {
		if (service.cliente_id !== authorId) {
			return { service, rating: null, forbidden: true };
		}
		receiverId = service.tecnico_id;
	} else if (authorRole === 'tecnico') {
		if (service.tecnico_id !== authorId) {
			return { service, rating: null, forbidden: true };
		}
		receiverId = service.cliente_id;
	} else {
		return { service, rating: null, forbidden: true, message: 'Rol no autorizado para calificar' };
	}

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');

		const { rows } = await client.query(
			`
				INSERT INTO calificaciones (
					servicio_id,
					emisor_id,
					receptor_id,
					puntuacion,
					comentario
				)
				VALUES ($1, $2, $3, $4, $5)
				ON CONFLICT (servicio_id, emisor_id)
				DO UPDATE SET
					puntuacion = EXCLUDED.puntuacion,
					receptor_id = EXCLUDED.receptor_id,
					comentario = EXCLUDED.comentario,
					fecha = NOW(),
					visible = TRUE
				RETURNING id, servicio_id
			`,
			[
				serviceId,
				authorId,
				receiverId,
				puntuacion,
				comentario || null,
			],
		);

		await client.query('COMMIT');
		const rating = rows[0];
		return {
			service,
			rating: await getServiceRatingByServiceId(rating.servicio_id, authorId),
			forbidden: false,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const listMyRatings = async (clientId, { limit = 20, offset = 0 } = {}) => {
	const { rows } = await db.query(
		`
			${RATING_SELECT}
			WHERE c.emisor_id = $1
			ORDER BY c.fecha DESC
			LIMIT $2 OFFSET $3
		`,
		[clientId, limit, offset],
	);

	return rows;
};

const listTechnicianRatings = async (technicianId, { limit = 20, offset = 0 } = {}) => {
	const statsResult = await db.query(
		`
			SELECT
				COUNT(*)::INT AS total_calificaciones,
				ROUND(COALESCE(AVG(puntuacion), 0)::NUMERIC, 2) AS promedio
			FROM calificaciones
			WHERE receptor_id = $1
		`,
		[technicianId],
	);

	const ratingsResult = await db.query(
		`
			${RATING_SELECT}
			WHERE c.receptor_id = $1
			ORDER BY c.fecha DESC
			LIMIT $2 OFFSET $3
		`,
		[technicianId, limit, offset],
	);

	return {
		stats: statsResult.rows[0] || { total_calificaciones: 0, promedio: '0.00' },
		ratings: ratingsResult.rows,
	};
};

const getMyRatingByServiceId = async (serviceId, authorId) => getServiceRatingByServiceId(serviceId, authorId);

module.exports = {
	getServiceRatingByServiceId,
	upsertServiceRating,
	listMyRatings,
	listTechnicianRatings,
	getMyRatingByServiceId,
};
