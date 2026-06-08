const db = require('../config/db');

const listStates = async () => {
	const { rows } = await db.query('SELECT id, nombre FROM estados_pago ORDER BY id ASC');
	return rows;
};

const getStateByName = async (stateName) => {
	const { rows } = await db.query('SELECT id, nombre FROM estados_pago WHERE LOWER(nombre) = LOWER($1) LIMIT 1', [stateName]);
	return rows[0] || null;
};

const listByServiceId = async (serviceId) => {
	const { rows } = await db.query(
		`
			SELECT p.id, p.servicio_id, p.estado_pago_id, p.metodo_pago, p.monto, p.moneda, p.referencia_transaccion,
				p.comprobante_url, p.notas, p.registrado_por, p.pagado_en, p.fecha_registro,
				ep.nombre AS estado_pago,
				u.nombre AS registrado_por_nombre, u.apellido AS registrado_por_apellido, u.correo AS registrado_por_correo
			FROM pagos p
			JOIN estados_pago ep ON ep.id = p.estado_pago_id
			LEFT JOIN usuarios u ON u.id = p.registrado_por
			WHERE p.servicio_id = $1
			ORDER BY p.fecha_registro DESC, p.id DESC
		`,
		[serviceId],
	);
	return rows;
};

const createForService = async (serviceId, recordedBy, payload) => {
	const {
		estadoPagoId,
		metodoPago,
		monto,
		moneda = 'USD',
		referenciaTransaccion = null,
		comprobanteUrl = null,
		notas = null,
		pagadoEn = null,
	} = payload;

	const { rows } = await db.query(
		`
			INSERT INTO pagos (
				servicio_id, estado_pago_id, metodo_pago, monto, moneda, referencia_transaccion,
				comprobante_url, notas, registrado_por, pagado_en
			)
			VALUES ($1, COALESCE($2, 1), $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id, servicio_id, estado_pago_id, metodo_pago, monto, moneda, referencia_transaccion,
				comprobante_url, notas, registrado_por, pagado_en, fecha_registro
		`,
		[serviceId, estadoPagoId, metodoPago, monto, moneda, referenciaTransaccion, comprobanteUrl, notas, recordedBy, pagadoEn],
	);

	return rows[0] || null;
};

const getById = async (paymentId) => {
	const { rows } = await db.query('SELECT id, servicio_id, estado_pago_id, metodo_pago, monto, moneda, referencia_transaccion, comprobante_url, notas, registrado_por, pagado_en, fecha_registro FROM pagos WHERE id = $1 LIMIT 1', [paymentId]);
	return rows[0] || null;
};

const updateById = async (paymentId, payload) => {
	const fields = [];
	const values = [];
	const map = {
		estadoPagoId: 'estado_pago_id',
		metodoPago: 'metodo_pago',
		monto: 'monto',
		moneda: 'moneda',
		referenciaTransaccion: 'referencia_transaccion',
		comprobanteUrl: 'comprobante_url',
		notas: 'notas',
		pagadoEn: 'pagado_en',
	};

	Object.entries(map).forEach(([key, column]) => {
		if (payload[key] !== undefined) {
			fields.push(`${column} = $${fields.length + 1}`);
			values.push(payload[key]);
		}
	});

	if (fields.length === 0) {
		return getById(paymentId);
	}

	values.push(paymentId);
	const { rows } = await db.query(
		`UPDATE pagos SET ${fields.join(', ')} WHERE id = $${fields.length + 1} RETURNING id, servicio_id, estado_pago_id, metodo_pago, monto, moneda, referencia_transaccion, comprobante_url, notas, registrado_por, pagado_en, fecha_registro`,
		values,
	);
	return rows[0] || null;
};

module.exports = {
	listStates,
	getStateByName,
	listByServiceId,
	createForService,
	getById,
	updateById,
};
