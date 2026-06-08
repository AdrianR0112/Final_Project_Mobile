const db = require('../../config/db');
const { getServiceById, SERVICE_PRICE_SELECT } = require('./queries');
const { getServiceStateByName, appendServiceHistory, countConcurrentServicesByTechnician, upsertWarrantyForService, createPartsForService, getPaymentStateByName } = require('./helpers');

const getOpenServiceRequests = async ({ modalidad, tipoEquipoId, limit = 20, offset = 0, technicianId } = {}) => {
	const conditions = ["es.nombre = 'solicitado'", 's.tecnico_id IS NULL'];
	const params = [];
	let index = 1;

	if (modalidad) {
		conditions.push(`s.modalidad = $${index}`);
		params.push(modalidad);
		index += 1;
	}

	if (tipoEquipoId) {
		conditions.push(`s.tipo_equipo_id = $${index}`);
		params.push(tipoEquipoId);
		index += 1;
	}

	if (technicianId) {
		conditions.push(
			`EXISTS (
				SELECT 1 FROM tecnico_especialidades tes
				JOIN perfiles_tecnicos pt ON pt.id = tes.tecnico_perfil_id
				WHERE pt.usuario_id = $${index} AND tes.especialidad_id = te.especialidad_id
			)`,
		);
		params.push(technicianId);
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
			c.correo AS cliente_correo
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		JOIN usuarios c ON c.id = s.cliente_id
		WHERE ${conditions.join(' AND ')}
		ORDER BY s.fecha_solicitud DESC, s.id DESC
		LIMIT $${index} OFFSET $${index + 1}
	`;

	const { rows } = await db.query(sql, params);
	return rows;
};

const getOpenServiceRequestById = async (serviceId, technicianId) => {
	const params = [serviceId, technicianId];
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
			s.fecha_solicitud,
			s.fecha_asignacion,
			s.notas_tecnico,
			s.asignado_por_admin,
			te.nombre AS tipo_equipo,
			es.nombre AS estado,
			c.nombre AS cliente_nombre,
			c.apellido AS cliente_apellido,
			c.correo AS cliente_correo,
			c.telefono AS cliente_telefono
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		JOIN usuarios c ON c.id = s.cliente_id
		WHERE s.id = $1
		  AND (
				s.tecnico_id = $2
				OR (
					es.nombre = 'solicitado'
					AND s.tecnico_id IS NULL
					AND EXISTS (
						SELECT 1
						FROM tecnico_especialidades tes
						JOIN perfiles_tecnicos pt ON pt.id = tes.tecnico_perfil_id
						WHERE pt.usuario_id = $2 AND tes.especialidad_id = te.especialidad_id
					)
				)
		  )
		LIMIT 1
	`;

	const { rows } = await db.query(sql, params);
	return rows[0] || null;
};

const acceptServiceRequestByTechnician = async (serviceId, technicianId) => {
	const requestedState = await getServiceStateByName('solicitado');

	if (!requestedState) {
		throw new Error('No se encontraron estados requeridos');
	}

	const currentService = await db.query(
		`
			SELECT id, estado_id, tecnico_id
			FROM servicios
			WHERE id = $1
			LIMIT 1
		`,
		[serviceId],
	);

	const serviceRow = currentService.rows[0];
	if (!serviceRow) {
		return null;
	}

	if (serviceRow.estado_id !== requestedState.id || serviceRow.tecnico_id) {
		return false;
	}

	const concurrentServices = await countConcurrentServicesByTechnician(technicianId);
	if (concurrentServices >= 2) {
		return { capacityReached: true };
	}

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');
		const { rows } = await client.query(
			`
				UPDATE servicios
				SET tecnico_id = $1,
					fecha_asignacion = NOW()
				WHERE id = $2
				RETURNING id
			`,
			[technicianId, serviceId],
		);

		await appendServiceHistory(client, serviceId, requestedState.id, technicianId, 'Tecnico asignado al servicio');
		await client.query('COMMIT');
		return getServiceById(rows[0].id);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const sendInitialQuoteByTechnician = async (serviceId, technicianId, payload = {}) => {
	const quoteState = await getServiceStateByName('cotizacion_inicial_enviada');
	if (!quoteState) {
		throw new Error('No se encontro el estado de cotizacion inicial');
	}

	const currentService = await getServiceById(serviceId);
	if (!currentService) {
		return null;
	}

	if (currentService.tecnico_id && currentService.tecnico_id !== technicianId) {
		return { forbidden: true };
	}

	if (currentService.estado !== 'solicitado') {
		return { invalidTransition: true, currentState: currentService.estado };
	}

	if (!currentService.tecnico_id) {
		const concurrentServices = await countConcurrentServicesByTechnician(technicianId);
		if (concurrentServices >= 2) {
			return { capacityReached: true };
		}
	}

	const {
		precioManoObra,
		precioEstimadoInicial,
		precioDomicilio,
		precioDomicilioEstimado = 0,
		precioDiagnostico,
		precioDiagnosticoEstimado = 0,
		notaPrecio,
		notaCotizacionInicial = null,
	} = payload;

	const manoObra = precioManoObra ?? precioEstimadoInicial;
	const domicilio = precioDomicilio ?? precioDomicilioEstimado;
	const diagnostico = precioDiagnostico ?? precioDiagnosticoEstimado;
	const nota = notaPrecio ?? notaCotizacionInicial;

	if (manoObra === undefined || [manoObra, domicilio, diagnostico].some((amount) => Number(amount) < 0)) {
		return { invalidPayload: true, message: 'Debes enviar mano de obra, domicilio y diagnostico con valores mayores o iguales a 0' };
	}

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');
		await client.query(
			`
				UPDATE servicios
				SET estado_id = $1,
					estado_precio = 'estimado',
					precio_mano_obra = $2,
					precio_domicilio = $3,
					precio_diagnostico = $4,
					precio_repuestos = 0,
					precio_acordado = NULL,
					nota_precio = $5,
					fecha_cotizacion = NOW(),
					fecha_aceptacion_precio = NULL,
					tecnico_id = COALESCE(tecnico_id, $6),
					fecha_asignacion = COALESCE(fecha_asignacion, NOW())
				WHERE id = $7
				  AND (tecnico_id IS NULL OR tecnico_id = $6)
			`,
			[
				quoteState.id,
				Number(manoObra),
				Number(domicilio || 0),
				Number(diagnostico || 0),
				nota,
				technicianId,
				serviceId,
			],
		);
		await appendServiceHistory(client, serviceId, quoteState.id, technicianId, 'Cotizacion inicial enviada al cliente');
		await client.query('COMMIT');
		return getServiceById(serviceId);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const updateAssignedServiceStatusByTechnician = async (serviceId, technicianId, nextStateName, payload = {}) => {
	const allowedTransitions = {
		aceptado: ['en_camino'],
		en_camino: ['en_reparacion'],
		en_reparacion: ['pendiente_pago'],
		pago_enviado: ['finalizado', 'pendiente_pago'],
	};

	const currentService = await getServiceById(serviceId);
	if (!currentService) {
		return null;
	}

	if (currentService.tecnico_id !== technicianId) {
		return { forbidden: true };
	}

	if (!allowedTransitions[currentService.estado]?.includes(nextStateName)) {
		return { invalidTransition: true, currentState: currentService.estado };
	}

	const nextState = await getServiceStateByName(nextStateName);
	if (!nextState) {
		throw new Error('No se encontro el estado destino');
	}

	const fields = ['estado_id = $1'];
	const values = [nextState.id];

	if (nextStateName === 'en_camino' && !currentService.fecha_en_camino) {
		fields.push('fecha_en_camino = NOW()');
	}

	if (nextStateName === 'en_reparacion' && !currentService.fecha_inicio_reparacion) {
		fields.push('fecha_inicio_reparacion = NOW()');
	}

	if (nextStateName === 'pendiente_pago') {
		if (currentService.estado === 'pago_enviado') {
			const pendingPaymentState = await getPaymentStateByName('pendiente');
			if (!pendingPaymentState) {
				throw new Error('No se encontro el estado de pago pendiente');
			}

			fields.push('estado_pago_id = $2');
			fields.push('observacion_pago = $3');
			fields.push('fecha_pago = NULL');
			values.push(
				pendingPaymentState.id,
				payload.observacionPago || 'El tecnico indico que el pago debe revisarse nuevamente',
			);
		} else {
			const {
				precioManoObra,
				precioManoObraFinal,
				precioRepuestos,
				precioRepuestosFinal,
				precioDomicilio,
				precioDomicilioFinal,
				precioDiagnostico,
				precioDiagnosticoFinal,
				notaPrecio,
				notaReparacion = null,
				garantia = null,
				repuestos: repuestosPayload = [],
			} = payload;

			const manoObra = precioManoObra ?? precioManoObraFinal;
			const repuestosAmount = precioRepuestos ?? precioRepuestosFinal;
			const domicilio = precioDomicilio ?? precioDomicilioFinal;
			const diagnostico = precioDiagnostico ?? precioDiagnosticoFinal;
			const nota = notaPrecio ?? notaReparacion;

			const requiredAmounts = [
				manoObra,
				repuestosAmount,
				domicilio,
				diagnostico,
			];

			if (requiredAmounts.some((amount) => amount === undefined || Number(amount) < 0)) {
				return { invalidPayload: true, message: 'Debes enviar todos los montos finales con valores mayores o iguales a 0' };
			}

			if (garantia && (!garantia.descripcion || Number(garantia.duracionDias) <= 0)) {
				return { invalidPayload: true, message: 'Debes enviar una garantia valida' };
			}

			if (!Array.isArray(repuestosPayload)) {
				return { invalidPayload: true, message: 'Debes enviar una lista valida de repuestos' };
			}

			fields.push('estado_precio = \'final\'');
			fields.push('precio_mano_obra = $2');
			fields.push('precio_repuestos = $3');
			fields.push('precio_domicilio = $4');
			fields.push('precio_diagnostico = $5');
			fields.push('precio_acordado = $6');
			fields.push('nota_precio = $7');
			fields.push('fecha_fin_reparacion = NOW()');
			values.push(
				Number(manoObra),
				Number(repuestosAmount),
				Number(domicilio),
				Number(diagnostico),
				Number(manoObra) + Number(repuestosAmount) + Number(domicilio) + Number(diagnostico),
				nota,
			);
		}
	}

	if (nextStateName === 'finalizado') {
		if (currentService.estado_pago !== 'pagado') {
			return { invalidPayload: true, message: 'Solo puedes finalizar cuando el cliente ya registro el pago' };
		}

		fields.push('estado_precio = \'pagado\'');
		fields.push('fecha_finalizacion = NOW()');
	}

	values.push(serviceId, technicianId);

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');

		const { rows } = await client.query(
			`
				UPDATE servicios
				SET ${fields.join(', ')}
				WHERE id = $${values.length - 1} AND tecnico_id = $${values.length}
				RETURNING id
			`,
			values,
		);

		if (!rows[0]) {
			await client.query('ROLLBACK');
			return null;
		}

		if (nextStateName === 'pendiente_pago' && currentService.estado !== 'pago_enviado') {
			if (payload.garantia) {
				await upsertWarrantyForService(client, serviceId, payload.garantia);
			}

			if (Array.isArray(payload.repuestos) && payload.repuestos.length > 0) {
				await createPartsForService(client, serviceId, payload.repuestos);
			}
		}

		const historyObservation = nextStateName === 'finalizado'
			? 'Pago validado por el tecnico y servicio finalizado'
			: nextStateName === 'pendiente_pago' && currentService.estado === 'pago_enviado'
				? 'El tecnico devolvio el servicio a pendiente de pago'
				: `Estado actualizado a ${nextStateName}`;
		await appendServiceHistory(client, serviceId, nextState.id, technicianId, historyObservation);

		await client.query('COMMIT');
		return getServiceById(serviceId);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const listMyAssignedRequests = async (technicianId, { estadoId, limit = 20, offset = 0 } = {}) => {
	const conditions = ['s.tecnico_id = $1'];
	const params = [technicianId];
	let index = 2;

	if (estadoId) {
		conditions.push(`s.estado_id = $${index}`);
		params.push(estadoId);
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
			c.correo AS cliente_correo
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		JOIN usuarios c ON c.id = s.cliente_id
		WHERE ${conditions.join(' AND ')}
		ORDER BY s.fecha_asignacion DESC NULLS LAST, s.fecha_solicitud DESC
		LIMIT $${index} OFFSET $${index + 1}
	`;

	const { rows } = await db.query(sql, params);
	return rows;
};

const getMyAssignedRequestById = async (serviceId, technicianId) => {
	const sql = `
		SELECT
			s.id,
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
			c.nombre AS cliente_nombre,
			c.apellido AS cliente_apellido,
			c.correo AS cliente_correo
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		JOIN usuarios c ON c.id = s.cliente_id
		WHERE s.id = $1 AND s.tecnico_id = $2
		LIMIT 1
	`;

	const { rows } = await db.query(sql, [serviceId, technicianId]);
	return rows[0] || null;
};

module.exports = {
	getOpenServiceRequests,
	getOpenServiceRequestById,
	acceptServiceRequestByTechnician,
	sendInitialQuoteByTechnician,
	updateAssignedServiceStatusByTechnician,
	listMyAssignedRequests,
	getMyAssignedRequestById,
};
