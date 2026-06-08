const db = require('../../config/db');

const getServiceStateByName = async (stateName) => {
	const { rows } = await db.query('SELECT id, nombre FROM estados_servicio WHERE LOWER(nombre) = LOWER($1) LIMIT 1', [stateName]);
	return rows[0] || null;
};

const getPaymentStateByName = async (stateName) => {
	const { rows } = await db.query('SELECT id, nombre FROM estados_pago WHERE LOWER(nombre) = LOWER($1) LIMIT 1', [stateName]);
	return rows[0] || null;
};

const appendServiceHistory = async (client, serviceId, stateId, changedBy, observation) => {
	await client.query(
		`
			INSERT INTO historial_estados_servicio (servicio_id, estado_id, cambiado_por, observacion)
			VALUES ($1, $2, $3, $4)
		`,
		[serviceId, stateId, changedBy, observation],
	);
};

const upsertWarrantyForService = async (client, serviceId, warranty) => {
	if (!warranty?.descripcion) {
		return;
	}

	const descripcion = String(warranty.descripcion).trim();
	const duracionDias = Number(warranty.duracionDias ?? 0);
	const observaciones = warranty.observaciones ? String(warranty.observaciones).trim() : null;

	if (!descripcion || !Number.isFinite(duracionDias) || duracionDias <= 0) {
		throw new Error('La garantia enviada no es valida');
	}

	const existingWarranty = await client.query('SELECT id FROM garantias WHERE servicio_id = $1 LIMIT 1', [serviceId]);

	if (existingWarranty.rows[0]?.id) {
		await client.query(
			`
				UPDATE garantias
				SET descripcion = $1,
					duracion_dias = $2,
					observaciones = $3
				WHERE id = $4
			`,
			[descripcion, duracionDias, observaciones, existingWarranty.rows[0].id],
		);
		return;
	}

	await client.query(
		`
			INSERT INTO garantias (servicio_id, descripcion, duracion_dias, activa, observaciones)
			VALUES ($1, $2, $3, $4, $5)
		`,
		[serviceId, descripcion, duracionDias, true, observaciones],
	);
};

const createPartsForService = async (client, serviceId, parts) => {
	if (!Array.isArray(parts) || parts.length === 0) {
		return;
	}

	for (const part of parts) {
		const nombre = String(part?.nombre || '').trim();
		const cantidad = Number(part?.cantidad ?? 0);
		const precioUnitario = Number(part?.precioUnitario ?? 0);
		const proveedor = part?.proveedor ? String(part.proveedor).trim() : null;
		const garantiaDias = Number(part?.garantiaDias ?? 0);

		if (!nombre || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(precioUnitario) || precioUnitario < 0 || !Number.isFinite(garantiaDias) || garantiaDias < 0) {
			throw new Error('Los repuestos enviados no son validos');
		}

		await client.query(
			`
				INSERT INTO repuestos_servicio (servicio_id, nombre, cantidad, precio_unitario, proveedor, garantia_dias)
				VALUES ($1, $2, $3, $4, $5, $6)
			`,
			[serviceId, nombre, cantidad, precioUnitario, proveedor, garantiaDias],
		);
	}
};

const CONCURRENT_SERVICE_STATES = ['solicitado', 'cotizacion_inicial_enviada', 'aceptado', 'en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado'];

const countConcurrentServicesByTechnician = async (technicianId) => {
	const { rows } = await db.query(
		`
			SELECT COUNT(*)::INT AS total
			FROM servicios s
			JOIN estados_servicio es ON es.id = s.estado_id
			WHERE s.tecnico_id = $1
			  AND es.nombre = ANY($2)
		`,
		[technicianId, CONCURRENT_SERVICE_STATES],
	);

	return rows[0]?.total || 0;
};

const syncTechnicianAvailabilityByLoad = async (technicianId) => {
	const concurrentServices = await countConcurrentServicesByTechnician(technicianId);
	await db.query('UPDATE perfiles_tecnicos SET disponible = $1 WHERE usuario_id = $2', [concurrentServices < 2, technicianId]);
	return concurrentServices;
};

module.exports = {
	getServiceStateByName,
	getPaymentStateByName,
	appendServiceHistory,
	upsertWarrantyForService,
	createPartsForService,
	CONCURRENT_SERVICE_STATES,
	countConcurrentServicesByTechnician,
	syncTechnicianAvailabilityByLoad,
};
