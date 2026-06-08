const db = require('../../config/db');
const serviceModel = require('../../models/service.model');
const notificationModel = require('../../models/notification.model');
const { parseBooleanValue, buildAdminService } = require('./helpers');

const listServices = async (req, res) => {
	try {
		const query = req.query || {};
		const stateId = query.estadoId ? Number(query.estadoId) : undefined;
		const technicianId = query.tecnicoId ? Number(query.tecnicoId) : undefined;
		const clientId = query.clienteId ? Number(query.clienteId) : undefined;
		const assignedByAdmin = parseBooleanValue(query.asignadoPorAdmin);
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;

		if (
			(stateId !== undefined && (!Number.isInteger(stateId) || stateId <= 0))
			|| (technicianId !== undefined && (!Number.isInteger(technicianId) || technicianId <= 0))
			|| (clientId !== undefined && (!Number.isInteger(clientId) || clientId <= 0))
			|| !Number.isInteger(limit)
			|| limit <= 0
			|| !Number.isInteger(offset)
			|| offset < 0
		) {
			return res.status(400).json({ message: 'Filtros invalidos para listar servicios' });
		}

		const conditions = ['1 = 1'];
		const params = [];
		let index = 1;

		if (stateId !== undefined) {
			conditions.push(`s.estado_id = $${index}`);
			params.push(stateId);
			index += 1;
		}

		if (technicianId !== undefined) {
			conditions.push(`s.tecnico_id = $${index}`);
			params.push(technicianId);
			index += 1;
		}

		if (clientId !== undefined) {
			conditions.push(`s.cliente_id = $${index}`);
			params.push(clientId);
			index += 1;
		}

		if (assignedByAdmin !== undefined) {
			conditions.push(`s.asignado_por_admin = $${index}`);
			params.push(assignedByAdmin);
			index += 1;
		}

		params.push(limit, offset);

		const { rows } = await db.query(
			`
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
					s.fecha_solicitud,
					s.fecha_asignacion,
					s.fecha_inicio_reparacion,
					s.fecha_finalizacion,
					s.notas_tecnico,
					s.notas_admin,
					s.asignado_por_admin,
					te.nombre AS tipo_equipo,
					es.nombre AS estado,
					uc.nombre AS cliente_nombre,
					uc.apellido AS cliente_apellido,
					uc.correo AS cliente_correo,
					ut.nombre AS tecnico_nombre,
					ut.apellido AS tecnico_apellido,
					ut.correo AS tecnico_correo
				FROM servicios s
				JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
				JOIN estados_servicio es ON es.id = s.estado_id
				JOIN usuarios uc ON uc.id = s.cliente_id
				LEFT JOIN usuarios ut ON ut.id = s.tecnico_id
				WHERE ${conditions.join(' AND ')}
				ORDER BY s.fecha_solicitud DESC, s.id DESC
				LIMIT $${index} OFFSET $${index + 1}
			`,
			params,
		);

		return res.status(200).json({ services: rows.map(buildAdminService) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar servicios', error: error.message });
	}
};

const getServiceById = async (req, res) => {
	try {
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'serviceId invalido' });
		}

		const service = await serviceModel.getServiceById(serviceId);
		if (!service) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		return res.status(200).json({ service: buildAdminService(service) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener servicio', error: error.message });
	}
};

const assignTechnicianToService = async (req, res) => {
	const serviceId = Number(req.params.serviceId);
	const technicianId = Number(req.body?.technicianId);

	if (!Number.isInteger(serviceId) || serviceId <= 0) {
		return res.status(400).json({ message: 'serviceId invalido' });
	}

	if (!Number.isInteger(technicianId) || technicianId <= 0) {
		return res.status(400).json({ message: 'technicianId invalido' });
	}

	const client = await db.pool.connect();
	let transactionStarted = false;

	try {
		const assignedState = await serviceModel.getServiceStateByName('asignado');
		if (!assignedState) {
			return res.status(500).json({ message: 'No se encontro el estado asignado' });
		}

		await client.query('BEGIN');
		transactionStarted = true;

		const serviceResult = await client.query(
			`
				SELECT id, cliente_id, tecnico_id, estado_id
				FROM servicios
				WHERE id = $1
				LIMIT 1
			`,
			[serviceId],
		);

		const service = serviceResult.rows[0];
		if (!service) {
			await client.query('ROLLBACK');
			return res.status(404).json({ message: 'Solicitud de servicio no encontrada' });
		}

		if (service.tecnico_id) {
			await client.query('ROLLBACK');
			return res.status(409).json({ message: 'La solicitud ya tiene un tecnico asignado' });
		}

		const technicianResult = await client.query(
			`
				SELECT
					u.id,
					u.nombre,
					u.apellido,
					u.correo,
					u.activo,
					u.bloqueado,
					COALESCE(pt.disponible, FALSE) AS disponible
				FROM usuarios u
				JOIN roles r ON r.id = u.rol_id
				LEFT JOIN perfiles_tecnicos pt ON pt.usuario_id = u.id
				WHERE u.id = $1 AND LOWER(r.nombre) = 'tecnico'
				LIMIT 1
			`,
			[technicianId],
		);

		const technician = technicianResult.rows[0];
		if (!technician) {
			await client.query('ROLLBACK');
			return res.status(404).json({ message: 'Tecnico no encontrado' });
		}

		if (!technician.activo || technician.bloqueado) {
			await client.query('ROLLBACK');
			return res.status(409).json({ message: 'El tecnico no esta disponible para asignaciones' });
		}

		if (!technician.disponible) {
			await client.query('ROLLBACK');
			return res.status(409).json({ message: 'El tecnico seleccionado no figura como disponible' });
		}

		await client.query(
			`
				UPDATE servicios
				SET tecnico_id = $1,
					estado_id = $2,
					fecha_asignacion = NOW(),
					asignado_por_admin = TRUE
				WHERE id = $3
			`,
			[technicianId, assignedState.id, serviceId],
		);

		await client.query(
			`
				INSERT INTO historial_estados_servicio (servicio_id, estado_id, cambiado_por, observacion)
				VALUES ($1, $2, $3, $4)
			`,
			[serviceId, assignedState.id, req.user?.id || null, 'Servicio asignado manualmente por un administrador'],
		);

		await client.query('UPDATE perfiles_tecnicos SET disponible = FALSE WHERE usuario_id = $1', [technicianId]);

		await client.query('COMMIT');

		const updatedService = await serviceModel.getServiceById(serviceId);

		await Promise.all([
			notificationModel.createNotification({
				usuarioId: service.cliente_id,
				servicioId: serviceId,
				titulo: 'Tecnico asignado',
				mensaje: 'Un administrador asigno un tecnico a tu solicitud de servicio.',
			}),
			notificationModel.createNotification({
				usuarioId: technicianId,
				servicioId: serviceId,
				titulo: 'Nuevo servicio asignado',
				mensaje: 'Un administrador te asigno una nueva solicitud de servicio.',
			}),
		]);

		return res.status(200).json({
			message: 'Tecnico asignado correctamente',
			serviceRequest: buildAdminService(updatedService),
		});
	} catch (error) {
		if (transactionStarted) {
			await client.query('ROLLBACK');
		}

		return res.status(500).json({ message: 'Error al asignar tecnico', error: error.message });
	} finally {
		client.release();
	}
};

module.exports = {
	listServices,
	getServiceById,
	assignTechnicianToService,
};
