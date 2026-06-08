const db = require('../config/db');

const baseUserColumns = `
	u.id,
	u.rol_id,
	u.nombre,
	u.apellido,
	u.correo,
	u.telefono,
	u.cedula,
	u.genero,
	u.fecha_nacimiento,
	u.direccion_principal,
	u.ciudad,
	u.pais,
	u.foto_perfil_url,
	u.verificado_correo,
	u.activo,
	u.bloqueado,
	u.razon_bloqueo,
	u.fecha_registro,
	u.ultima_sesion,
	r.nombre AS rol_nombre
`;

const baseUserFrom = `
	FROM usuarios u
	JOIN roles r ON r.id = u.rol_id
`;

const getClientProfileByUserId = async (userId) => {
	const sql = `
		SELECT
			${baseUserColumns}
		${baseUserFrom}
		WHERE u.id = $1
			AND LOWER(r.nombre) = 'cliente'
		LIMIT 1
	`;

	const { rows } = await db.query(sql, [userId]);
	return rows[0] || null;
};

const updateClientProfile = async (
	userId,
	{ nombre, apellido, telefono, cedula, genero, fechaNacimiento, direccionPrincipal, ciudad, pais, fotoPerfilUrl },
) => {
	const fields = [];
	const values = [];
	let parameterIndex = 1;

	if (nombre !== undefined) {
		fields.push(`nombre = $${parameterIndex}`);
		values.push(nombre);
		parameterIndex += 1;
	}

	if (apellido !== undefined) {
		fields.push(`apellido = $${parameterIndex}`);
		values.push(apellido);
		parameterIndex += 1;
	}

	if (telefono !== undefined) {
		fields.push(`telefono = $${parameterIndex}`);
		values.push(telefono);
		parameterIndex += 1;
	}

	if (cedula !== undefined) {
		fields.push(`cedula = $${parameterIndex}`);
		values.push(cedula);
		parameterIndex += 1;
	}

	if (genero !== undefined) {
		fields.push(`genero = $${parameterIndex}`);
		values.push(genero);
		parameterIndex += 1;
	}

	if (fechaNacimiento !== undefined) {
		fields.push(`fecha_nacimiento = $${parameterIndex}`);
		values.push(fechaNacimiento);
		parameterIndex += 1;
	}

	if (direccionPrincipal !== undefined) {
		fields.push(`direccion_principal = $${parameterIndex}`);
		values.push(direccionPrincipal);
		parameterIndex += 1;
	}

	if (ciudad !== undefined) {
		fields.push(`ciudad = $${parameterIndex}`);
		values.push(ciudad);
		parameterIndex += 1;
	}

	if (pais !== undefined) {
		fields.push(`pais = $${parameterIndex}`);
		values.push(pais);
		parameterIndex += 1;
	}

	if (fotoPerfilUrl !== undefined) {
		fields.push(`foto_perfil_url = $${parameterIndex}`);
		values.push(fotoPerfilUrl);
		parameterIndex += 1;
	}

	if (fields.length === 0) {
		return getClientProfileByUserId(userId);
	}

	values.push(userId);

	await db.query(
		`
			UPDATE usuarios
			SET ${fields.join(', ')}
			WHERE id = $${parameterIndex}
		`,
		values,
	);

	return getClientProfileByUserId(userId);
};

const getClientSummary = async (userId) => {
	const totalsResult = await db.query(
		`
			SELECT
				COUNT(*)::INT AS total_servicios,
				COUNT(*) FILTER (WHERE es.nombre IN ('solicitado', 'asignado', 'en_camino', 'en_reparacion'))::INT AS servicios_activos,
				COUNT(*) FILTER (WHERE es.nombre = 'finalizado')::INT AS servicios_finalizados,
				COUNT(*) FILTER (WHERE es.nombre = 'cancelado')::INT AS servicios_cancelados
			FROM servicios s
			JOIN estados_servicio es ON es.id = s.estado_id
			WHERE s.cliente_id = $1
		`,
		[userId],
	);

	const recentServicesResult = await db.query(
		`
			SELECT
				s.id,
				s.descripcion_problema,
				s.modalidad,
				s.fecha_solicitud,
				s.fecha_finalizacion,
				te.nombre AS tipo_equipo,
				es.nombre AS estado,
				COALESCE(ut.nombre || ' ' || ut.apellido, '') AS tecnico
			FROM servicios s
			JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
			JOIN estados_servicio es ON es.id = s.estado_id
			LEFT JOIN usuarios ut ON ut.id = s.tecnico_id
			WHERE s.cliente_id = $1
			ORDER BY s.fecha_solicitud DESC
			LIMIT 5
		`,
		[userId],
	);

	const totals = totalsResult.rows[0] || {
		total_servicios: 0,
		servicios_activos: 0,
		servicios_finalizados: 0,
		servicios_cancelados: 0,
	};

	return {
		...totals,
		recientes: recentServicesResult.rows,
	};
};

module.exports = {
	getClientProfileByUserId,
	updateClientProfile,
	getClientSummary,
};
