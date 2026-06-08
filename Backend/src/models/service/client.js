const db = require('../../config/db');
const { getServiceById, SERVICE_PRICE_SELECT } = require('./queries');
const { getServiceStateByName, appendServiceHistory } = require('./helpers');

const createServiceRequest = async ({
	clienteId,
	tipoEquipoId,
	descripcionProblema,
	modalidad,
	direccion = null,
	referenciaDireccion = null,
	latitud = null,
	longitud = null,
	marcaEquipo = null,
	modeloEquipo = null,
	numeroSerieEquipo = null,
	prioridad = 'normal',
	requiereRepuestos = false,
	tiempoEstimadoHoras = null,
	fechaCompromiso = null,
	uploadedPhotos = [],
}) => {
	const requestedState = await getServiceStateByName('solicitado');
	if (!requestedState) {
		throw new Error('No se encontro el estado inicial solicitado');
	}

	const params = [
		clienteId,
		tipoEquipoId,
		requestedState.id,
		descripcionProblema,
		modalidad,
		direccion,
		referenciaDireccion,
		latitud,
		longitud,
		marcaEquipo,
		modeloEquipo,
		numeroSerieEquipo,
		prioridad,
		Boolean(requiereRepuestos),
		tiempoEstimadoHoras,
		fechaCompromiso,
	];

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');

		const { rows } = await client.query(
			`
				INSERT INTO servicios (
					cliente_id,
					tipo_equipo_id,
					estado_id,
					descripcion_problema,
					modalidad,
					direccion,
					referencia_direccion,
					latitud,
					longitud,
					marca_equipo,
					modelo_equipo,
					numero_serie_equipo,
					prioridad,
					requiere_repuestos,
					tiempo_estimado_horas,
					fecha_compromiso
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
				RETURNING id
			`,
			params,
		);

		const serviceId = rows[0].id;
		await client.query(
			`
				INSERT INTO historial_estados_servicio (
					servicio_id,
					estado_id,
					cambiado_por,
					observacion
				)
				VALUES ($1, $2, $3, $4)
			`,
			[serviceId, requestedState.id, clienteId, 'Solicitud creada'],
		);

		if (Array.isArray(uploadedPhotos) && uploadedPhotos.length > 0) {
			for (const photoUrl of uploadedPhotos) {
				await client.query(
					`
						INSERT INTO archivos_servicio (servicio_id, subido_por, tipo, etapa, url)
						VALUES ($1, $2, $3, $4, $5)
					`,
					[serviceId, clienteId, 'imagen', 'antes', photoUrl],
				);
			}
		}

		await client.query('COMMIT');
		return getServiceById(serviceId);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const listMyServiceRequests = async (clienteId, { estadoId, modalidad, limit = 20, offset = 0 } = {}) => {
	const conditions = ['s.cliente_id = $1'];
	const params = [clienteId];
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
			s.codigo_servicio,
			s.descripcion_problema,
			s.marca_equipo,
			s.modelo_equipo,
			s.numero_serie_equipo,
			s.modalidad,
			s.direccion,
			s.referencia_direccion,
			s.latitud,
			s.longitud,
			s.prioridad,
			${SERVICE_PRICE_SELECT}
			s.requiere_repuestos,
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
			s.estado_id,
			s.tipo_equipo_id,
			s.tecnico_id,
			COALESCE(t.nombre || ' ' || t.apellido, '') AS tecnico_nombre_completo
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		LEFT JOIN usuarios t ON t.id = s.tecnico_id
		WHERE ${conditions.join(' AND ')}
		ORDER BY s.fecha_solicitud DESC
		LIMIT $${index} OFFSET $${index + 1}
	`;

	const { rows } = await db.query(sql, params);
	return rows;
};

const getMyServiceRequestById = async (serviceId, clienteId) => {
	const sql = `
		SELECT
			s.id,
			s.codigo_servicio,
			s.cliente_id,
			s.tecnico_id,
			s.tipo_equipo_id,
			s.estado_id,
			s.descripcion_problema,
			s.marca_equipo,
			s.modelo_equipo,
			s.numero_serie_equipo,
			s.modalidad,
			s.direccion,
			s.referencia_direccion,
			s.latitud,
			s.longitud,
			s.prioridad,
			${SERVICE_PRICE_SELECT}
			s.requiere_repuestos,
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
			COALESCE(t.nombre || ' ' || t.apellido, '') AS tecnico_nombre_completo
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		LEFT JOIN usuarios t ON t.id = s.tecnico_id
		WHERE s.id = $1 AND s.cliente_id = $2
		LIMIT 1
	`;

	const { rows } = await db.query(sql, [serviceId, clienteId]);
	return rows[0] || null;
};

const acceptInitialQuoteByClient = async (serviceId, clientId) => {
	const acceptedState = await getServiceStateByName('aceptado');
	if (!acceptedState) {
		throw new Error('No se encontro el estado aceptado');
	}

	const currentService = await getServiceById(serviceId);
	if (!currentService) {
		return null;
	}

	if (currentService.cliente_id !== clientId) {
		return { forbidden: true };
	}

	if (currentService.estado !== 'cotizacion_inicial_enviada') {
		return { invalidTransition: true, currentState: currentService.estado };
	}

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');
		await client.query(
			`
				UPDATE servicios
				SET estado_id = $1,
					estado_precio = 'aceptado_inicial',
					precio_acordado = precio_total,
					fecha_aceptacion_precio = NOW()
				WHERE id = $2 AND cliente_id = $3
			`,
			[acceptedState.id, serviceId, clientId],
		);
		await appendServiceHistory(client, serviceId, acceptedState.id, clientId, 'Cliente acepto la cotizacion inicial');
		await client.query('COMMIT');
		return getServiceById(serviceId);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const rejectInitialQuoteByClient = async (serviceId, clientId) => {
	const solicitedState = await getServiceStateByName('solicitado');
	if (!solicitedState) {
		throw new Error('No se encontro el estado solicitado');
	}

	const currentService = await getServiceById(serviceId);
	if (!currentService) {
		return null;
	}

	if (currentService.cliente_id !== clientId) {
		return { forbidden: true };
	}

	if (currentService.estado !== 'cotizacion_inicial_enviada') {
		return { invalidTransition: true, currentState: currentService.estado };
	}

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');
		await client.query(
			`
				UPDATE servicios
				SET estado_id = $1,
					tecnico_id = NULL,
					fecha_asignacion = NULL,
					estado_precio = 'sin_cotizar',
					precio_diagnostico = 0,
					precio_mano_obra = 0,
					precio_repuestos = 0,
					precio_domicilio = 0,
					precio_acordado = NULL,
					nota_precio = NULL,
					fecha_cotizacion = NULL,
					fecha_aceptacion_precio = NULL
				WHERE id = $2 AND cliente_id = $3
			`,
			[solicitedState.id, serviceId, clientId],
		);
		await appendServiceHistory(client, serviceId, solicitedState.id, clientId, 'Cliente rechazo la cotizacion inicial');
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
	createServiceRequest,
	listMyServiceRequests,
	getMyServiceRequestById,
	acceptInitialQuoteByClient,
	rejectInitialQuoteByClient,
};
