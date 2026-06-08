const db = require('../../config/db');
const { getServiceById, SERVICE_PRICE_SELECT } = require('./queries');
const { getServiceStateByName, getPaymentStateByName, appendServiceHistory } = require('./helpers');

const listServiceHistory = async (userId, role, { estadoId, modalidad, limit = 20, offset = 0 } = {}) => {
	const userColumn = role === 'tecnico' ? 's.tecnico_id' : 's.cliente_id';
	const conditions = [`${userColumn} = $1`];
	const params = [userId];
	let index = 2;

	if (estadoId) {
		conditions.push(`s.estado_id = $${index}`);
		params.push(estadoId);
		index += 1;
	}

	if (modalidad) {
		conditions.push(`s.modalidad = $${index}`);
		params.push(modalidad);
		index += 1;
	}

	params.push(limit, offset);

	const sql = `
		SELECT
			s.id,
			s.cliente_id,
			s.tecnico_id,
			s.tipo_equipo_id,
			s.estado_id,
			s.descripcion_problema,
			s.modalidad,
			s.direccion,
			s.latitud,
			s.longitud,
			${SERVICE_PRICE_SELECT}
			s.fecha_solicitud,
			s.fecha_asignacion,
			s.fecha_en_camino,
			s.fecha_inicio_reparacion,
			s.fecha_fin_reparacion,
			s.fecha_finalizacion,
			s.fecha_pago,
			s.notas_tecnico,
			s.asignado_por_admin,
			te.nombre AS tipo_equipo,
			es.nombre AS estado,
			c.nombre AS cliente_nombre,
			c.apellido AS cliente_apellido,
			c.correo AS cliente_correo,
			COALESCE(t.nombre || ' ' || t.apellido, '') AS tecnico_nombre_completo,
			last_history.fecha AS ultimo_cambio_fecha,
			last_history.estado_nombre AS ultimo_cambio_estado,
			last_history.observacion AS ultimo_cambio_observacion
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		JOIN usuarios c ON c.id = s.cliente_id
		LEFT JOIN usuarios t ON t.id = s.tecnico_id
		LEFT JOIN LATERAL (
			SELECT
				hes.fecha,
				esh.nombre AS estado_nombre,
				hes.observacion
			FROM historial_estados_servicio hes
			JOIN estados_servicio esh ON esh.id = hes.estado_id
			WHERE hes.servicio_id = s.id
			ORDER BY hes.fecha DESC, hes.id DESC
			LIMIT 1
		) AS last_history ON TRUE
		WHERE ${conditions.join(' AND ')}
		ORDER BY s.fecha_finalizacion DESC NULLS LAST, s.fecha_solicitud DESC
		LIMIT $${index} OFFSET $${index + 1}
	`;

	const { rows } = await db.query(sql, params);
	return rows;
};

const getServiceHistoryById = async (serviceId, userId, role) => {
	const userColumn = role === 'tecnico' ? 'tecnico_id' : 'cliente_id';
	const serviceSql = `
		SELECT
			s.id,
			s.cliente_id,
			s.tecnico_id,
			s.tipo_equipo_id,
			s.estado_id,
			s.descripcion_problema,
			s.modalidad,
			s.direccion,
			s.latitud,
			s.longitud,
			${SERVICE_PRICE_SELECT}
			s.fecha_solicitud,
			s.fecha_asignacion,
			s.fecha_en_camino,
			s.fecha_inicio_reparacion,
			s.fecha_fin_reparacion,
			s.fecha_finalizacion,
			s.fecha_pago,
			s.notas_tecnico,
			s.asignado_por_admin,
			te.nombre AS tipo_equipo,
			es.nombre AS estado,
			c.nombre AS cliente_nombre,
			c.apellido AS cliente_apellido,
			c.correo AS cliente_correo,
			COALESCE(t.nombre || ' ' || t.apellido, '') AS tecnico_nombre_completo
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		JOIN usuarios c ON c.id = s.cliente_id
		LEFT JOIN usuarios t ON t.id = s.tecnico_id
		WHERE s.id = $1 AND s.${userColumn} = $2
		LIMIT 1
	`;

	const serviceResult = await db.query(serviceSql, [serviceId, userId]);
	const service = serviceResult.rows[0] || null;
	if (!service) {
		return null;
	}

	const historyResult = await db.query(
		`
			SELECT
				hes.id,
				hes.servicio_id,
				hes.estado_id,
				es.nombre AS estado,
				hes.cambiado_por,
				COALESCE(u.nombre || ' ' || u.apellido, '') AS cambiado_por_nombre,
				u.correo AS cambiado_por_correo,
				hes.fecha,
				hes.observacion
			FROM historial_estados_servicio hes
			JOIN estados_servicio es ON es.id = hes.estado_id
			LEFT JOIN usuarios u ON u.id = hes.cambiado_por
			WHERE hes.servicio_id = $1
			ORDER BY hes.fecha ASC, hes.id ASC
		`,
		[serviceId],
	);

	return {
		service,
		history: historyResult.rows,
	};
};

const cancelMyServiceRequest = async (serviceId, userId, { motivoCancelacionId = null, detalleCancelacion = null } = {}) => {
	const cancelState = await getServiceStateByName('cancelado');
	if (!cancelState) {
		throw new Error('No se encontro el estado cancelado');
	}

	const currentService = await db.query(
		'SELECT id, estado_id, cliente_id, tecnico_id FROM servicios WHERE id = $1 AND (cliente_id = $2 OR tecnico_id = $2) LIMIT 1',
		[serviceId, userId],
	);

	if (!currentService.rows[0]) {
		return null;
	}

	const { rows } = await db.query(
		`
			UPDATE servicios
			SET estado_id = $1,
				motivo_cancelacion_id = $2,
				cancelado_por = $3,
				detalle_cancelacion = $4,
				fecha_cancelacion = NOW()
			WHERE id = $5
			RETURNING id
		`,
		[cancelState.id, motivoCancelacionId, userId, detalleCancelacion, serviceId],
	);

	return getServiceById(rows[0].id);
};

const markServiceAsPaid = async (serviceId) => {
	const paidState = await getServiceStateByName('pago_enviado');
	const paidPaymentState = await getPaymentStateByName('pagado');
	if (!paidState) {
		throw new Error('No se encontro el estado pago_enviado');
	}

	if (!paidPaymentState) {
		throw new Error('No se encontro el estado de pago pagado');
	}

	const currentService = await getServiceById(serviceId);
	if (!currentService) {
		return null;
	}

	if (currentService.estado !== 'pendiente_pago') {
		return { invalidTransition: true, currentState: currentService.estado };
	}

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');
		const { rows } = await client.query(
			`
				UPDATE servicios
				SET estado_pago_id = $1,
					estado_precio = 'final',
					estado_id = $2,
					fecha_pago = NOW()
				WHERE id = $3
				RETURNING cliente_id, tecnico_id
			`,
			[paidPaymentState.id, paidState.id, serviceId],
		);

		if (!rows[0]) {
			await client.query('ROLLBACK');
			return null;
		}

		await appendServiceHistory(client, serviceId, paidState.id, rows[0].cliente_id, 'Cliente registro el pago; pendiente validacion del tecnico');
		await client.query('COMMIT');
		return getServiceById(serviceId);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

module.exports = {
	listServiceHistory,
	getServiceHistoryById,
	cancelMyServiceRequest,
	markServiceAsPaid,
};
