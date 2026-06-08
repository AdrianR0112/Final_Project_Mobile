const db = require('../config/db');

const listByUserId = async (userId) => {
	const { rows } = await db.query('SELECT id, usuario_id, token, plataforma, activo, fecha_registro FROM dispositivos_push WHERE usuario_id = $1 ORDER BY fecha_registro DESC, id DESC', [userId]);
	return rows;
};

const upsertForUser = async (userId, { token, plataforma, activo = true }) => {
	const existing = await db.query('SELECT id FROM dispositivos_push WHERE token = $1 LIMIT 1', [token]);
	if (existing.rows[0]) {
		const { rows } = await db.query('UPDATE dispositivos_push SET usuario_id = $1, plataforma = $2, activo = $3 WHERE id = $4 RETURNING id, usuario_id, token, plataforma, activo, fecha_registro', [userId, plataforma, activo, existing.rows[0].id]);
		return rows[0] || null;
	}

	const { rows } = await db.query('INSERT INTO dispositivos_push (usuario_id, token, plataforma, activo) VALUES ($1, $2, $3, $4) RETURNING id, usuario_id, token, plataforma, activo, fecha_registro', [userId, token, plataforma, activo]);
	return rows[0] || null;
};

const getById = async (deviceId) => {
	const { rows } = await db.query('SELECT id, usuario_id, token, plataforma, activo, fecha_registro FROM dispositivos_push WHERE id = $1 LIMIT 1', [deviceId]);
	return rows[0] || null;
};

const updateById = async (deviceId, userId, { activo }) => {
	const { rows } = await db.query('UPDATE dispositivos_push SET activo = $1 WHERE id = $2 AND usuario_id = $3 RETURNING id, usuario_id, token, plataforma, activo, fecha_registro', [activo, deviceId, userId]);
	return rows[0] || null;
};

const deleteById = async (deviceId, userId) => {
	const { rowCount } = await db.query('DELETE FROM dispositivos_push WHERE id = $1 AND usuario_id = $2', [deviceId, userId]);
	return rowCount > 0;
};

module.exports = {
	listByUserId,
	upsertForUser,
	getById,
	updateById,
	deleteById,
};
