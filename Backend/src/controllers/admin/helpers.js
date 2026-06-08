const db = require('../../config/db');

const parseBooleanValue = (value) => {
	if (typeof value === 'boolean') {
		return value;
	}

	if (typeof value === 'string') {
		const normalizedValue = value.trim().toLowerCase();
		if (normalizedValue === 'true') {
			return true;
		}

		if (normalizedValue === 'false') {
			return false;
		}
	}

	return undefined;
};

const buildAdminUser = (user) => ({
	id: user.id,
	nombre: user.nombre,
	apellido: user.apellido,
	correo: user.correo,
	telefono: user.telefono,
	cedula: user.cedula,
	genero: user.genero,
	fechaNacimiento: user.fecha_nacimiento,
	direccionPrincipal: user.direccion_principal,
	ciudad: user.ciudad,
	pais: user.pais,
	fotoPerfilUrl: user.foto_perfil_url,
	verificadoCorreo: user.verificado_correo,
	activo: user.activo,
	bloqueado: user.bloqueado,
	razonBloqueo: user.razon_bloqueo,
	fechaRegistro: user.fecha_registro,
	ultimaSesion: user.ultima_sesion,
	rol: {
		id: user.rol_id,
		nombre: user.rol_nombre,
	},
});

const buildAdminService = (service) => ({
	id: service.id,
	codigoServicio: service.codigo_servicio,
	clienteId: service.cliente_id,
	tecnicoId: service.tecnico_id,
	tipoEquipoId: service.tipo_equipo_id,
	estadoId: service.estado_id,
	descripcionProblema: service.descripcion_problema,
	marcaEquipo: service.marca_equipo,
	modeloEquipo: service.modelo_equipo,
	numeroSerieEquipo: service.numero_serie_equipo,
	modalidad: service.modalidad,
	direccion: service.direccion,
	referenciaDireccion: service.referencia_direccion,
	latitud: service.latitud,
	longitud: service.longitud,
	prioridad: service.prioridad,
	fechaSolicitud: service.fecha_solicitud,
	fechaAsignacion: service.fecha_asignacion,
	fechaInicioReparacion: service.fecha_inicio_reparacion,
	fechaFinalizacion: service.fecha_finalizacion,
	notasTecnico: service.notas_tecnico,
	notasAdmin: service.notas_admin,
	asignadoPorAdmin: service.asignado_por_admin,
	tipoEquipo: service.tipo_equipo,
	estado: service.estado,
	cliente: {
		nombre: service.cliente_nombre,
		apellido: service.cliente_apellido,
		correo: service.cliente_correo,
	},
	tecnico: service.tecnico_nombre || service.tecnico_apellido || service.tecnico_correo ? {
		nombre: service.tecnico_nombre,
		apellido: service.tecnico_apellido,
		correo: service.tecnico_correo,
	} : null,
});

const buildAdminRating = (rating) => ({
	id: rating.id,
	serviceId: rating.servicio_id,
	emitterId: rating.emisor_id,
	receiverId: rating.receptor_id,
	clientId: rating.cliente_id,
	technicianId: rating.tecnico_id,
	score: rating.puntuacion,
	comment: rating.comentario,
	date: rating.fecha,
	visible: rating.visible,
	emitter: {
		name: rating.emisor_nombre,
		lastName: rating.emisor_apellido,
		email: rating.emisor_correo,
	},
	receiver: {
		name: rating.receptor_nombre,
		lastName: rating.receptor_apellido,
		email: rating.receptor_correo,
	},
	service: {
		stateId: rating.estado_id,
		state: rating.estado,
		completedAt: rating.fecha_finalizacion,
		type: rating.tipo_equipo,
	},
	client: {
		name: rating.cliente_nombre,
		lastName: rating.cliente_apellido,
		email: rating.cliente_correo,
	},
	technician: {
		name: rating.tecnico_nombre,
		lastName: rating.tecnico_apellido,
		email: rating.tecnico_correo,
	},
});

const parseOptionalString = (value) => {
	if (value === undefined) {
		return undefined;
	}

	if (value === null) {
		return null;
	}

	if (typeof value !== 'string') {
		return String(value);
	}

	const trimmedValue = value.trim();
	return trimmedValue ? trimmedValue : null;
};

const buildTechnicianConditions = (available, params = []) => {
	const conditions = ["LOWER(r.nombre) = 'tecnico'"];
	let index = params.length + 1;

	if (available !== undefined) {
		conditions.push(`COALESCE(pt.disponible, FALSE) = $${index}`);
		params.push(available);
		index += 1;
	}

	return { conditions, params };
};

const ADMIN_TECHNICIAN_SELECT = `
	SELECT
		u.id,
		u.nombre,
		u.apellido,
		u.correo,
		u.telefono,
		u.fecha_registro,
		u.foto_perfil_url,
		u.activo,
		u.bloqueado,
		pt.id AS profile_id,
		COALESCE(pt.descripcion, '') AS descripcion,
		pt.documento_url,
		COALESCE(pt.verificado_admin, FALSE) AS verificado_admin,
		COALESCE(pt.documentos_verificados, FALSE) AS documentos_verificados,
		pt.motivo_rechazo,
		pt.fecha_verificacion,
		COALESCE(pt.disponible, FALSE) AS disponible,
		pt.latitud_actual,
		pt.longitud_actual,
		pt.ultima_ubicacion_ts,
		pt.calificacion_prom,
		pt.total_servicios,
		pt.anios_experiencia,
		pt.radio_atencion_km,
		pt.tarifa_base,
		pt.tarifa_domicilio,
		pt.direccion_taller,
		pt.latitud_taller,
		pt.longitud_taller,
		pt.moneda,
		COALESCE(STRING_AGG(DISTINCT e.nombre, ', ' ORDER BY e.nombre), '') AS especialidades,
		COALESCE(ARRAY_AGG(DISTINCT e.id) FILTER (WHERE e.id IS NOT NULL), '{}') AS especialidad_ids
	FROM usuarios u
	JOIN roles r ON r.id = u.rol_id
	LEFT JOIN perfiles_tecnicos pt ON pt.usuario_id = u.id
	LEFT JOIN tecnico_especialidades tes ON tes.tecnico_perfil_id = pt.id
	LEFT JOIN especialidades e ON e.id = tes.especialidad_id
`;

const fetchAdminTechnicianById = async (technicianId) => {
	const { rows } = await db.query(
		`
			${ADMIN_TECHNICIAN_SELECT}
			WHERE u.id = $1 AND LOWER(r.nombre) = 'tecnico'
			GROUP BY u.id, pt.id
			LIMIT 1
		`,
		[technicianId],
	);

	return rows[0] || null;
};

module.exports = {
	parseBooleanValue,
	buildAdminUser,
	buildAdminService,
	buildAdminRating,
	parseOptionalString,
	buildTechnicianConditions,
	ADMIN_TECHNICIAN_SELECT,
	fetchAdminTechnicianById,
};
