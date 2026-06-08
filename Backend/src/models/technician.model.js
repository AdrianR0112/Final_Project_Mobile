const db = require('../config/db');

const getProfileByUserId = async (userId) => {
	const sql = `
		SELECT
			pt.id AS profile_id,
			pt.usuario_id,
			pt.descripcion,
			pt.anios_experiencia,
			pt.disponible,
			pt.radio_atencion_km,
			pt.latitud_actual,
			pt.longitud_actual,
			pt.ultima_ubicacion_ts,
			pt.tarifa_base,
			pt.tarifa_domicilio,
			pt.direccion_taller,
			pt.latitud_taller,
			pt.longitud_taller,
			pt.moneda,
			pt.calificacion_prom,
			pt.total_servicios,
			pt.total_cancelaciones,
			pt.verificado_admin,
			pt.documentos_verificados,
			pt.documento_url,
			pt.motivo_rechazo,
			pt.fecha_verificacion,
			u.id AS user_id,
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
			r.id AS rol_id,
			r.nombre AS rol_nombre,
			COALESCE(
				STRING_AGG(DISTINCT e.nombre, ', ' ORDER BY e.nombre),
				''
			) AS especialidades
		FROM perfiles_tecnicos pt
		JOIN usuarios u ON u.id = pt.usuario_id
		JOIN roles r ON r.id = u.rol_id
		LEFT JOIN tecnico_especialidades te ON te.tecnico_perfil_id = pt.id
		LEFT JOIN especialidades e ON e.id = te.especialidad_id
		WHERE pt.usuario_id = $1
		GROUP BY
			pt.id,
			pt.usuario_id,
			pt.descripcion,
			pt.anios_experiencia,
			pt.disponible,
			pt.radio_atencion_km,
			pt.latitud_actual,
			pt.longitud_actual,
			pt.ultima_ubicacion_ts,
			pt.tarifa_base,
			pt.tarifa_domicilio,
			pt.direccion_taller,
			pt.latitud_taller,
			pt.longitud_taller,
			pt.moneda,
			pt.calificacion_prom,
			pt.total_servicios,
			pt.total_cancelaciones,
			pt.verificado_admin,
			pt.documentos_verificados,
			pt.documento_url,
			pt.motivo_rechazo,
			pt.fecha_verificacion,
			u.id,
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
			r.id,
			r.nombre
		LIMIT 1
	`;

	const { rows } = await db.query(sql, [userId]);
	return rows[0] || null;
};

const ensureProfile = async (userId) => {
	const existingProfile = await getProfileByUserId(userId);
	if (existingProfile) {
		return existingProfile;
	}

	const { rows } = await db.query(
		`
			INSERT INTO perfiles_tecnicos (usuario_id, descripcion, disponible)
			VALUES ($1, '', FALSE)
			RETURNING id AS profile_id, usuario_id, descripcion, anios_experiencia, disponible, radio_atencion_km, latitud_actual, longitud_actual, ultima_ubicacion_ts, tarifa_base, tarifa_domicilio, direccion_taller, latitud_taller, longitud_taller, moneda, calificacion_prom, total_servicios, total_cancelaciones, verificado_admin, documentos_verificados, documento_url, motivo_rechazo, fecha_verificacion
		`,
		[userId],
	);

	const profile = rows[0];
	return {
		...profile,
		especialidades: '',
	};
};

const updateProfile = async (
	userId,
	{
		descripcion,
		disponible,
		aniosExperiencia,
		radioAtencionKm,
		tarifaBase,
		tarifaDomicilio,
		direccionTaller,
		latitudTaller,
		longitudTaller,
		moneda,
		documentoUrl,
	} = {},
) => {
	await ensureProfile(userId);

	const fields = [];
	const values = [];

	if (descripcion !== undefined) {
		fields.push(`descripcion = $${fields.length + 1}`);
		values.push(descripcion);
	}

	if (disponible !== undefined) {
		fields.push(`disponible = $${fields.length + 1}`);
		values.push(Boolean(disponible));
	}

	if (aniosExperiencia !== undefined) {
		fields.push(`anios_experiencia = $${fields.length + 1}`);
		values.push(aniosExperiencia);
	}

	if (radioAtencionKm !== undefined) {
		fields.push(`radio_atencion_km = $${fields.length + 1}`);
		values.push(radioAtencionKm);
	}

	if (tarifaBase !== undefined) {
		fields.push(`tarifa_base = $${fields.length + 1}`);
		values.push(tarifaBase);
	}

	if (tarifaDomicilio !== undefined) {
		fields.push(`tarifa_domicilio = $${fields.length + 1}`);
		values.push(tarifaDomicilio);
	}

	if (direccionTaller !== undefined) {
		fields.push(`direccion_taller = $${fields.length + 1}`);
		values.push(direccionTaller);
	}

	if (latitudTaller !== undefined) {
		fields.push(`latitud_taller = $${fields.length + 1}`);
		values.push(latitudTaller);
	}

	if (longitudTaller !== undefined) {
		fields.push(`longitud_taller = $${fields.length + 1}`);
		values.push(longitudTaller);
	}

	if (moneda !== undefined) {
		fields.push(`moneda = $${fields.length + 1}`);
		values.push(moneda);
	}

	if (documentoUrl !== undefined) {
		fields.push(`documento_url = $${fields.length + 1}`);
		values.push(documentoUrl);
	}

	if (fields.length > 0) {
		values.push(userId);
		await db.query(
			`UPDATE perfiles_tecnicos SET ${fields.join(', ')} WHERE usuario_id = $${fields.length + 1}`,
			values,
		);
	}

	return getProfileByUserId(userId);
};

const updateLocation = async (userId, { latitudActual, longitudActual }) => {
	await ensureProfile(userId);

	await db.query(
		`
			UPDATE perfiles_tecnicos
			SET latitud_actual = $1,
					longitud_actual = $2,
					ultima_ubicacion_ts = NOW()
			WHERE usuario_id = $3
		`,
		[latitudActual, longitudActual, userId],
	);

	return getProfileByUserId(userId);
};

const getSpecialties = async () => {
	const { rows } = await db.query(
		`SELECT
			e.id,
			e.nombre,
			e.descripcion,
			e.imagen_url,
			e.precio_minimo,
			e.precio_maximo,
			e.horas_minimas,
			e.horas_maximas,
			COALESCE(
				(
					SELECT JSON_AGG(JSON_BUILD_OBJECT('id', te.id, 'nombre', te.nombre) ORDER BY te.nombre)
					FROM tipos_equipo te
					WHERE te.especialidad_id = e.id
				),
				'[]'::json
			) AS tipos_equipo,
			COALESCE(
				(
					SELECT COUNT(*)
					FROM servicios s
					JOIN tipos_equipo te2 ON te2.id = s.tipo_equipo_id
					WHERE te2.especialidad_id = e.id
				),
				0
			) AS total_solicitudes
		 FROM especialidades e
		 ORDER BY total_solicitudes DESC, e.nombre ASC`,
	);
	return rows;
};

const setSpecialties = async (userId, specialtyIds) => {
	const profile = await ensureProfile(userId);

	await db.query('DELETE FROM tecnico_especialidades WHERE tecnico_perfil_id = $1', [profile.profile_id]);

	if (Array.isArray(specialtyIds) && specialtyIds.length > 0) {
		for (const specialtyId of specialtyIds) {
			await db.query(
				'INSERT INTO tecnico_especialidades (tecnico_perfil_id, especialidad_id) VALUES ($1, $2)',
				[profile.profile_id, specialtyId],
			);
		}
	}

	return getProfileByUserId(userId);
};

const listAvailableTechnicians = async ({ lat, lng } = {}) => {
	const { rows } = await db.query(`SELECT * FROM v_tecnicos_disponibles ORDER BY calificacion_prom DESC, total_servicios DESC`);

	if (lat === undefined || lng === undefined) {
		return rows;
	}

	const clientLat = Number(lat);
	const clientLng = Number(lng);

	const toRad = (deg) => (deg * Math.PI) / 180;

	return rows.filter((t) => {
		const tLat = Number(t.latitud_taller);
		const tLng = Number(t.longitud_taller);
		const radioKm = Number(t.radio_atencion_km) || 0;

		if (!tLat || !tLng || !radioKm) {
			return false;
		}

		const dLat = toRad(tLat - clientLat);
		const dLng = toRad(tLng - clientLng);

		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(toRad(clientLat)) *
				Math.cos(toRad(tLat)) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);

		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		const distanceKm = 6371 * c;

		return distanceKm <= radioKm;
	});
};

module.exports = {
	getProfileByUserId,
	ensureProfile,
	updateProfile,
	updateLocation,
	getSpecialties,
	setSpecialties,
	listAvailableTechnicians,
};
