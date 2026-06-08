const db = require('../../config/db');
const { parseBooleanValue, buildAdminRating } = require('./helpers');

const listRatings = async (req, res) => {
	try {
		const query = req.query || {};
		const visible = parseBooleanValue(query.visible);
		const technicianId = query.technicianId ? Number(query.technicianId) : undefined;
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;

		if (
			(technicianId !== undefined && (!Number.isInteger(technicianId) || technicianId <= 0))
			|| !Number.isInteger(limit)
			|| limit <= 0
			|| !Number.isInteger(offset)
			|| offset < 0
		) {
			return res.status(400).json({ message: 'Filtros invalidos para listar calificaciones' });
		}

		const conditions = ['1 = 1'];
		const params = [];
		let index = 1;

		if (visible !== undefined) {
			conditions.push(`c.visible = $${index}`);
			params.push(visible);
			index += 1;
		}

		if (technicianId !== undefined) {
			conditions.push(`s.tecnico_id = $${index}`);
			params.push(technicianId);
			index += 1;
		}

		params.push(limit, offset);

		const { rows } = await db.query(
			`
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
				WHERE ${conditions.join(' AND ')}
				ORDER BY c.fecha DESC, c.id DESC
				LIMIT $${index} OFFSET $${index + 1}
			`,
			params,
		);

		return res.status(200).json({ ratings: rows.map(buildAdminRating) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar calificaciones', error: error.message });
	}
};

const updateRatingVisibility = async (req, res) => {
	try {
		const ratingId = Number(req.params.ratingId);
		const visible = parseBooleanValue(req.body?.visible);

		if (!Number.isInteger(ratingId) || ratingId <= 0) {
			return res.status(400).json({ message: 'ratingId invalido' });
		}

		if (visible === undefined) {
			return res.status(400).json({ message: 'visible es obligatorio y debe ser booleano' });
		}

		const { rows } = await db.query(
			`
				UPDATE calificaciones
				SET visible = $1
				WHERE id = $2
				RETURNING id
			`,
			[visible, ratingId],
		);

		if (!rows[0]) {
			return res.status(404).json({ message: 'Calificacion no encontrada' });
		}

		const ratingResult = await db.query(
			`
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
				WHERE c.id = $1
				LIMIT 1
			`,
			[ratingId],
		);

		return res.status(200).json({
			message: 'Visibilidad de la calificacion actualizada correctamente',
			rating: buildAdminRating(ratingResult.rows[0]),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar visibilidad de la calificacion', error: error.message });
	}
};

module.exports = {
	listRatings,
	updateRatingVisibility,
};
