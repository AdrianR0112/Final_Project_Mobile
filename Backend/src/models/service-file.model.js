const db = require('../config/db');

const listByServiceId = async (serviceId) => {
	const { rows } = await db.query(
		`
			SELECT af.id, af.servicio_id, af.subido_por, af.tipo, af.etapa, af.url, af.descripcion, af.fecha_subida,
				u.nombre AS subido_por_nombre, u.apellido AS subido_por_apellido, u.correo AS subido_por_correo
			FROM archivos_servicio af
			JOIN usuarios u ON u.id = af.subido_por
			WHERE af.servicio_id = $1
			ORDER BY af.fecha_subida DESC, af.id DESC
		`,
		[serviceId],
	);

	return rows;
};

const createForService = async (serviceId, uploadedBy, { tipo, etapa, url, descripcion = null }) => {
	const { rows } = await db.query(
		`
			INSERT INTO archivos_servicio (servicio_id, subido_por, tipo, etapa, url, descripcion)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, servicio_id, subido_por, tipo, etapa, url, descripcion, fecha_subida
		`,
		[serviceId, uploadedBy, tipo, etapa, url, descripcion],
	);

	return rows[0] || null;
};

const getById = async (fileId) => {
	const { rows } = await db.query('SELECT id, servicio_id, subido_por, tipo, etapa, url, descripcion, fecha_subida FROM archivos_servicio WHERE id = $1 LIMIT 1', [fileId]);
	return rows[0] || null;
};

const deleteById = async (fileId) => {
	const { rowCount } = await db.query('DELETE FROM archivos_servicio WHERE id = $1', [fileId]);
	return rowCount > 0;
};

module.exports = {
	listByServiceId,
	createForService,
	getById,
	deleteById,
};
