const db = require('../config/db');

const listConfig = async () => {
	const { rows } = await db.query('SELECT clave, valor, descripcion, actualizado_en FROM configuracion_sistema ORDER BY clave ASC');
	return rows;
};

const getByKey = async (key) => {
	const { rows } = await db.query('SELECT clave, valor, descripcion, actualizado_en FROM configuracion_sistema WHERE clave = $1 LIMIT 1', [key]);
	return rows[0] || null;
};

const listByKeys = async (keys = []) => {
	if (!Array.isArray(keys) || keys.length === 0) {
		return [];
	}

	const { rows } = await db.query(
		'SELECT clave, valor, descripcion, actualizado_en FROM configuracion_sistema WHERE clave = ANY($1::varchar[]) ORDER BY clave ASC',
		[keys],
	);
	return rows;
};

const upsertByKey = async ({ clave, valor, descripcion = null }) => {
	const { rows } = await db.query(
		`
			INSERT INTO configuracion_sistema (clave, valor, descripcion, actualizado_en)
			VALUES ($1, $2, $3, NOW())
			ON CONFLICT (clave)
			DO UPDATE SET valor = EXCLUDED.valor, descripcion = EXCLUDED.descripcion, actualizado_en = NOW()
			RETURNING clave, valor, descripcion, actualizado_en
		`,
		[clave, valor, descripcion],
	);
	return rows[0] || null;
};

module.exports = { listConfig, getByKey, listByKeys, upsertByKey };
