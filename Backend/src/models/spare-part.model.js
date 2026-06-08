const db = require('../config/db');

const listByServiceId = async (serviceId) => {
	const { rows } = await db.query(
		`
			SELECT id, servicio_id, nombre, cantidad, precio_unitario, subtotal, proveedor, garantia_dias
			FROM repuestos_servicio
			WHERE servicio_id = $1
			ORDER BY id ASC
		`,
		[serviceId],
	);

	return rows;
};

const createForService = async (serviceId, { nombre, cantidad = 1, precioUnitario = 0, proveedor = null, garantiaDias = 0 }) => {
	const { rows } = await db.query(
		`
			INSERT INTO repuestos_servicio (servicio_id, nombre, cantidad, precio_unitario, proveedor, garantia_dias)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id, servicio_id, nombre, cantidad, precio_unitario, subtotal, proveedor, garantia_dias
		`,
		[serviceId, nombre, cantidad, precioUnitario, proveedor, garantiaDias],
	);

	return rows[0] || null;
};

const updateById = async (partId, { nombre, cantidad, precioUnitario, proveedor, garantiaDias }) => {
	const fields = [];
	const values = [];

	if (nombre !== undefined) {
		fields.push(`nombre = $${fields.length + 1}`);
		values.push(nombre);
	}

	if (cantidad !== undefined) {
		fields.push(`cantidad = $${fields.length + 1}`);
		values.push(cantidad);
	}

	if (precioUnitario !== undefined) {
		fields.push(`precio_unitario = $${fields.length + 1}`);
		values.push(precioUnitario);
	}

	if (proveedor !== undefined) {
		fields.push(`proveedor = $${fields.length + 1}`);
		values.push(proveedor);
	}

	if (garantiaDias !== undefined) {
		fields.push(`garantia_dias = $${fields.length + 1}`);
		values.push(garantiaDias);
	}

	if (fields.length === 0) {
		const { rows } = await db.query('SELECT id, servicio_id, nombre, cantidad, precio_unitario, subtotal, proveedor, garantia_dias FROM repuestos_servicio WHERE id = $1 LIMIT 1', [partId]);
		return rows[0] || null;
	}

	values.push(partId);
	const { rows } = await db.query(
		`
			UPDATE repuestos_servicio
			SET ${fields.join(', ')}
			WHERE id = $${fields.length + 1}
			RETURNING id, servicio_id, nombre, cantidad, precio_unitario, subtotal, proveedor, garantia_dias
		`,
		values,
	);

	return rows[0] || null;
};

const deleteById = async (partId) => {
	const { rowCount } = await db.query('DELETE FROM repuestos_servicio WHERE id = $1', [partId]);
	return rowCount > 0;
};

const getById = async (partId) => {
	const { rows } = await db.query('SELECT id, servicio_id, nombre, cantidad, precio_unitario, subtotal, proveedor, garantia_dias FROM repuestos_servicio WHERE id = $1 LIMIT 1', [partId]);
	return rows[0] || null;
};

module.exports = {
	listByServiceId,
	createForService,
	updateById,
	deleteById,
	getById,
};
