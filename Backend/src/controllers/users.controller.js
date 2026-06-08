const db = require('../config/db');
const userModel = require('../models/user.model');
const { comparePassword, hashPassword } = require('../utils/password');

const buildProfileUser = (user) => ({
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

const getMyProfile = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const user = await userModel.findById(userId);
		if (!user) {
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		return res.status(200).json({ user: buildProfileUser(user) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
	}
};

const updateMyProfile = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const {
			nombre,
			apellido,
			telefono,
			cedula,
			genero,
			fechaNacimiento,
			direccionPrincipal,
			ciudad,
			pais,
			fotoPerfilUrl,
		} = req.body;

		if (
			nombre === undefined &&
			apellido === undefined &&
			telefono === undefined &&
			cedula === undefined &&
			genero === undefined &&
			fechaNacimiento === undefined &&
			direccionPrincipal === undefined &&
			ciudad === undefined &&
			pais === undefined &&
			fotoPerfilUrl === undefined
		) {
			return res.status(400).json({
				message: 'Debes enviar al menos un campo para actualizar',
			});
		}

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

		values.push(userId);

		const sql = `
			UPDATE usuarios
			SET ${fields.join(', ')}
			WHERE id = $${parameterIndex}
			RETURNING id, rol_id, nombre, apellido, correo, telefono, cedula, genero, fecha_nacimiento, direccion_principal, ciudad, pais, foto_perfil_url, verificado_correo, activo, bloqueado, razon_bloqueo, fecha_registro, ultima_sesion
		`;

		const { rows } = await db.query(sql, values);
		const updatedUser = rows[0];

		if (!updatedUser) {
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		const roleResult = await db.query('SELECT id, nombre FROM roles WHERE id = $1 LIMIT 1', [updatedUser.rol_id]);
		const role = roleResult.rows[0] || null;
		updatedUser.rol_nombre = role ? role.nombre : null;

		return res.status(200).json({
			message: 'Perfil actualizado correctamente',
			user: buildProfileUser(updatedUser),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar perfil', error: error.message });
	}
};

const uploadProfilePhoto = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		if (!req.file) {
			return res.status(400).json({ message: 'Debes enviar una imagen' });
		}

		const fotoPerfilUrl = `${req.protocol}://${req.get('host')}/uploads/profile-photos/${req.file.filename}`;

		await db.query('UPDATE usuarios SET foto_perfil_url = $1 WHERE id = $2', [fotoPerfilUrl, userId]);

		return res.status(200).json({
			message: 'Foto de perfil actualizada correctamente',
			fotoPerfilUrl,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al subir foto de perfil', error: error.message });
	}
};

const changeMyPassword = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const { currentPassword, newPassword } = req.body;

		if (!currentPassword || !newPassword) {
			return res.status(400).json({
				message: 'currentPassword y newPassword son obligatorios',
			});
		}

		const user = await userModel.findByEmail(req.user.email);
		if (!user) {
			return res.status(404).json({ message: 'Usuario no encontrado' });
		}

		const isCurrentPasswordValid = await comparePassword(currentPassword, user.password_hash);
		if (!isCurrentPasswordValid) {
			return res.status(401).json({ message: 'La contraseña actual no es correcta' });
		}

		if (newPassword.length < 6) {
			return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
		}

		const passwordHash = await hashPassword(newPassword);
		await db.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

		return res.status(200).json({ message: 'Contraseña actualizada correctamente' });
	} catch (error) {
		return res.status(500).json({ message: 'Error al cambiar contraseña', error: error.message });
	}
};

module.exports = {
	getMyProfile,
	updateMyProfile,
	uploadProfilePhoto,
	changeMyPassword,
};
