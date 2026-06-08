const db = require('../config/db');

const listZones = async ({ activeOnly } = {}) => {
	const params = [];
	const conditions = ['1 = 1'];
	if (activeOnly !== undefined) {
		conditions.push(`activa = $1`);
		params.push(activeOnly);
	}
	const { rows } = await db.query(`SELECT id, nombre, ciudad, provincia, pais, activa FROM zonas_cobertura WHERE ${conditions.join(' AND ')} ORDER BY ciudad ASC, nombre ASC, id ASC`, params);
	return rows;
};

const createZone = async ({ nombre, ciudad, provincia = null, pais = 'Ecuador', activa = true }) => {
	const { rows } = await db.query('INSERT INTO zonas_cobertura (nombre, ciudad, provincia, pais, activa) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, ciudad, provincia, pais, activa', [nombre, ciudad, provincia, pais, activa]);
	return rows[0] || null;
};

const updateZone = async (zoneId, payload) => {
	const fields = [];
	const values = [];
	const map = { nombre: 'nombre', ciudad: 'ciudad', provincia: 'provincia', pais: 'pais', activa: 'activa' };
	Object.entries(map).forEach(([key, column]) => {
		if (payload[key] !== undefined) {
			fields.push(`${column} = $${fields.length + 1}`);
			values.push(payload[key]);
		}
	});
	if (fields.length === 0) {
		const { rows } = await db.query('SELECT id, nombre, ciudad, provincia, pais, activa FROM zonas_cobertura WHERE id = $1 LIMIT 1', [zoneId]);
		return rows[0] || null;
	}
	values.push(zoneId);
	const { rows } = await db.query(`UPDATE zonas_cobertura SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING id, nombre, ciudad, provincia, pais, activa`, values);
	return rows[0] || null;
};

module.exports = { listZones, createZone, updateZone };
