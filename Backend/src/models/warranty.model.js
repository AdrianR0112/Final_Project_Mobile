const db = require('../config/db');

const getByServiceId = async (serviceId) => {
	const { rows } = await db.query(
		'SELECT id, servicio_id, descripcion, duracion_dias, fecha_inicio, fecha_fin, activa, observaciones FROM garantias WHERE servicio_id = $1 LIMIT 1',
		[serviceId],
	);
	return rows[0] || null;
};

const getById = async (warrantyId) => {
	const { rows } = await db.query(
		'SELECT id, servicio_id, descripcion, duracion_dias, fecha_inicio, fecha_fin, activa, observaciones FROM garantias WHERE id = $1 LIMIT 1',
		[warrantyId],
	);
	return rows[0] || null;
};

const createForService = async (serviceId, { descripcion, duracionDias = 30, fechaInicio = null, activa = true, observaciones = null }) => {
	const { rows } = await db.query(
		`
			INSERT INTO garantias (servicio_id, descripcion, duracion_dias, fecha_inicio, activa, observaciones)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, servicio_id, descripcion, duracion_dias, fecha_inicio, fecha_fin, activa, observaciones
		`,
		[serviceId, descripcion, duracionDias, fechaInicio, activa, observaciones],
	);
	return rows[0] || null;
};

const updateById = async (warrantyId, payload) => {
	const fields = [];
	const values = [];
	const map = {
		descripcion: 'descripcion',
		duracionDias: 'duracion_dias',
		fechaInicio: 'fecha_inicio',
		activa: 'activa',
		observaciones: 'observaciones',
	};

	Object.entries(map).forEach(([key, column]) => {
		if (payload[key] !== undefined) {
			fields.push(`${column} = $${fields.length + 1}`);
			values.push(payload[key]);
		}
	});

	if (fields.length === 0) {
		return getById(warrantyId);
	}

	values.push(warrantyId);
	const { rows } = await db.query(
		`UPDATE garantias SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING id, servicio_id, descripcion, duracion_dias, fecha_inicio, fecha_fin, activa, observaciones`,
		values,
	);
	return rows[0] || null;
};

module.exports = {
	getByServiceId,
	getById,
	createForService,
	updateById,
};
