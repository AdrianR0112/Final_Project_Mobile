const db = require('../../config/db');
const { parseBooleanValue, parseOptionalString, buildAdminUser } = require('./helpers');

const listUsers = async (req, res) => {
	try {
		const query = req.query || {};
		const role = query.role ? String(query.role).trim().toLowerCase() : undefined;
		const active = parseBooleanValue(query.activo);
		const blocked = parseBooleanValue(query.bloqueado);
		const search = query.search ? String(query.search).trim() : undefined;
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;

		if (!Number.isInteger(limit) || limit <= 0 || !Number.isInteger(offset) || offset < 0) {
			return res.status(400).json({ message: 'limit y offset deben ser numeros validos' });
		}

		const conditions = ['1 = 1'];
		const params = [];
		let index = 1;

		if (role) {
			conditions.push(`LOWER(r.nombre) = $${index}`);
			params.push(role);
			index += 1;
		}

		if (active !== undefined) {
			conditions.push(`u.activo = $${index}`);
			params.push(active);
			index += 1;
		}

		if (blocked !== undefined) {
			conditions.push(`u.bloqueado = $${index}`);
			params.push(blocked);
			index += 1;
		}

		if (search) {
			conditions.push(`(
				u.nombre ILIKE $${index}
				OR u.apellido ILIKE $${index}
				OR u.correo ILIKE $${index}
				OR COALESCE(u.telefono, '') ILIKE $${index}
			)`);
			params.push(`%${search}%`);
			index += 1;
		}

		params.push(limit, offset);

		const { rows } = await db.query(
			`
				SELECT
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
				FROM usuarios u
				JOIN roles r ON r.id = u.rol_id
				WHERE ${conditions.join(' AND ')}
				ORDER BY u.fecha_registro DESC, u.id DESC
				LIMIT $${index} OFFSET $${index + 1}
			`,
			params,
		);

		return res.status(200).json({ users: rows.map(buildAdminUser) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar usuarios', error: error.message });
	}
};

const updateUserStatus = async (req, res) => {
	try {
		const userId = Number(req.params.userId);
		if (!Number.isInteger(userId) || userId <= 0) {
			return res.status(400).json({ message: 'userId invalido' });
		}

		const active = parseBooleanValue(req.body?.activo);
		const blocked = parseBooleanValue(req.body?.bloqueado);

		if (active === undefined && blocked === undefined) {
			return res.status(400).json({ message: 'Debes enviar activo y/o bloqueado' });
		}

		if (req.user?.id === userId && (active === false || blocked === true)) {
			return res.status(400).json({ message: 'No puedes desactivarte o bloquearte a ti mismo' });
		}

		const fields = [];
		const values = [];

		if (active !== undefined) {
			fields.push(`activo = $${fields.length + 1}`);
			values.push(active);
		}

		if (blocked !== undefined) {
			fields.push(`bloqueado = $${fields.length + 1}`);
			values.push(blocked);
		}

		values.push(userId);

		const { rows } = await db.query(
			`
				UPDATE usuarios
				SET ${fields.join(', ')}
				WHERE id = $${fields.length + 1}
				RETURNING id, rol_id, nombre, apellido, correo, telefono, cedula, genero, fecha_nacimiento, direccion_principal, ciudad, pais, foto_perfil_url, verificado_correo, activo, bloqueado, razon_bloqueo, fecha_registro, ultima_sesion
			`,
			values,
		);

		const updatedUser = rows[0];
		if (!updatedUser) {
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		const roleResult = await db.query('SELECT id, nombre FROM roles WHERE id = $1 LIMIT 1', [updatedUser.rol_id]);
		updatedUser.rol_nombre = roleResult.rows[0]?.nombre || null;

		return res.status(200).json({
			message: 'Estado del usuario actualizado correctamente',
			user: buildAdminUser(updatedUser),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
	}
};

const getUserById = async (req, res) => {
	try {
		const userId = Number(req.params.userId);
		if (!Number.isInteger(userId) || userId <= 0) {
			return res.status(400).json({ message: 'userId invalido' });
		}

		const { rows } = await db.query(
			`
				SELECT
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
				FROM usuarios u
				JOIN roles r ON r.id = u.rol_id
				WHERE u.id = $1
				LIMIT 1
			`,
			[userId],
		);

		if (!rows[0]) {
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		return res.status(200).json({ user: buildAdminUser(rows[0]) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
	}
};

const updateUser = async (req, res) => {
	try {
		const userId = Number(req.params.userId);
		if (!Number.isInteger(userId) || userId <= 0) {
			return res.status(400).json({ message: 'userId invalido' });
		}

		const payload = req.body || {};
		const editableFields = [
			['nombre', payload.nombre],
			['apellido', payload.apellido],
			['correo', typeof payload.correo === 'string' ? payload.correo.trim().toLowerCase() : payload.correo],
			['telefono', parseOptionalString(payload.telefono)],
			['cedula', parseOptionalString(payload.cedula)],
			['genero', parseOptionalString(payload.genero)],
			['fecha_nacimiento', payload.fechaNacimiento],
			['direccion_principal', parseOptionalString(payload.direccionPrincipal)],
			['ciudad', parseOptionalString(payload.ciudad)],
			['pais', parseOptionalString(payload.pais)],
			['foto_perfil_url', parseOptionalString(payload.fotoPerfilUrl)],
		];

		const fields = [];
		const values = [];

		for (const [column, value] of editableFields) {
			if (value !== undefined) {
				fields.push(`${column} = $${fields.length + 1}`);
				values.push(value);
			}
		}

		if (fields.length === 0) {
			return res.status(400).json({ message: 'Debes enviar al menos un campo editable del usuario' });
		}

		values.push(userId);

		const { rows } = await db.query(
			`
				UPDATE usuarios
				SET ${fields.join(', ')}
				WHERE id = $${fields.length + 1}
				RETURNING id, rol_id, nombre, apellido, correo, telefono, cedula, genero, fecha_nacimiento, direccion_principal, ciudad, pais, foto_perfil_url, verificado_correo, activo, bloqueado, razon_bloqueo, fecha_registro, ultima_sesion
			`,
			values,
		);

		if (!rows[0]) {
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		const roleResult = await db.query('SELECT id, nombre FROM roles WHERE id = $1 LIMIT 1', [rows[0].rol_id]);
		rows[0].rol_nombre = roleResult.rows[0]?.nombre || null;

		return res.status(200).json({
			message: 'Informacion del usuario actualizada correctamente',
			user: buildAdminUser(rows[0]),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
	}
};

const deleteUser = async (req, res) => {
	const userId = Number(req.params.userId);

	if (!Number.isInteger(userId) || userId <= 0) {
		return res.status(400).json({ message: 'userId invalido' });
	}

	if (req.user?.id === userId) {
		return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta administradora' });
	}

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');

		const userResult = await client.query(
			`
				SELECT u.id, u.nombre, u.apellido, u.correo, r.nombre AS rol_nombre
				FROM usuarios u
				JOIN roles r ON r.id = u.rol_id
				WHERE u.id = $1
				LIMIT 1
			`,
			[userId],
		);

		const user = userResult.rows[0];
		if (!user) {
			await client.query('ROLLBACK');
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		const serviceIdsResult = await client.query('SELECT id FROM servicios WHERE cliente_id = $1 OR tecnico_id = $1', [userId]);
		const serviceIds = serviceIdsResult.rows.map((row) => row.id);

		if (serviceIds.length > 0) {
			await client.query('DELETE FROM notificaciones WHERE servicio_id = ANY($1::int[])', [serviceIds]);
			await client.query('DELETE FROM mensajes_chat WHERE servicio_id = ANY($1::int[])', [serviceIds]);
			await client.query('DELETE FROM calificaciones WHERE servicio_id = ANY($1::int[])', [serviceIds]);
			await client.query('DELETE FROM pagos WHERE servicio_id = ANY($1::int[])', [serviceIds]);
			await client.query('DELETE FROM archivos_servicio WHERE servicio_id = ANY($1::int[])', [serviceIds]);
			await client.query('DELETE FROM repuestos_servicio WHERE servicio_id = ANY($1::int[])', [serviceIds]);
			await client.query('DELETE FROM garantias WHERE servicio_id = ANY($1::int[])', [serviceIds]);
			await client.query('DELETE FROM historial_estados_servicio WHERE servicio_id = ANY($1::int[])', [serviceIds]);
			await client.query('DELETE FROM servicios WHERE id = ANY($1::int[])', [serviceIds]);
		}

		await client.query('DELETE FROM calificaciones WHERE emisor_id = $1 OR receptor_id = $1', [userId]);
		await client.query('DELETE FROM mensajes_chat WHERE remitente_id = $1', [userId]);
		await client.query('DELETE FROM archivos_servicio WHERE subido_por = $1', [userId]);
		await client.query('DELETE FROM pagos WHERE registrado_por = $1', [userId]);
		await client.query('DELETE FROM historial_estados_servicio WHERE cambiado_por = $1', [userId]);
		await client.query('DELETE FROM notificaciones WHERE usuario_id = $1', [userId]);
		await client.query('DELETE FROM dispositivos_push WHERE usuario_id = $1', [userId]);

		const technicianProfile = await client.query('SELECT id FROM perfiles_tecnicos WHERE usuario_id = $1 LIMIT 1', [userId]);
		if (technicianProfile.rows[0]?.id) {
			await client.query('DELETE FROM tecnico_especialidades WHERE tecnico_perfil_id = $1', [technicianProfile.rows[0].id]);
			await client.query('DELETE FROM perfiles_tecnicos WHERE usuario_id = $1', [userId]);
		}

		await client.query('DELETE FROM usuarios WHERE id = $1', [userId]);
		await client.query('COMMIT');

		return res.status(200).json({
			message: 'Usuario y su informacion relacionada eliminados correctamente',
			deletedUser: user,
		});
	} catch (error) {
		await client.query('ROLLBACK');
		return res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
	} finally {
		client.release();
	}
};

module.exports = {
	listUsers,
	getUserById,
	updateUser,
	updateUserStatus,
	deleteUser,
};
