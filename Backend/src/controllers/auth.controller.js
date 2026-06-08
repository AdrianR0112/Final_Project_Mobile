const userModel = require('../models/user.model');
const technicianModel = require('../models/technician.model');
const { hashPassword, comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const crypto = require('crypto');

const parseSpecialtyIds = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parseSpecialtyIds(parsed);
    } catch {
      return value
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isInteger(item) && item > 0);
    }
  }

  return [];
};

const buildUploadedDocumentUrl = (req) => {
  if (!req.file) {
    return null;
  }

  return `${req.protocol}://${req.get('host')}/uploads/technician-documents/${req.file.filename}`;
};

const buildAuthUser = (user) => ({
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
  rol: {
    id: user.rol_id,
    nombre: user.rol_nombre,
  },
});

const register = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      correo,
      telefono,
      cedula,
      genero,
      fechaNacimiento,
      direccionPrincipal,
      ciudad,
      pais,
      password,
      fotoPerfilUrl,
      rol,
    } = req.body;

    if (!nombre || !apellido || !correo || !password) {
      return res.status(400).json({
        message: 'Los campos nombre, apellido, correo y password son obligatorios',
      });
    }

    if (String(password).length <= 6) {
      return res.status(400).json({
        message: 'La contrasena debe tener mas de 6 caracteres',
      });
    }

    const existingUser = await userModel.findByEmail(correo);
    if (existingUser) {
      return res.status(409).json({ message: 'El correo ya esta registrado' });
    }

    const requestedRole = (rol || 'cliente').toLowerCase();
    if (requestedRole === 'admin') {
      return res.status(403).json({ message: 'No se permite registrar usuarios admin' });
    }

    const specialtyIds = parseSpecialtyIds(req.body.specialtyIds);
    const uploadedDocumentUrl = buildUploadedDocumentUrl(req);
    const documentoUrl = uploadedDocumentUrl || req.body.documentoUrl || null;

    const role = await userModel.findRoleByName(requestedRole);
    if (!role) {
      return res.status(400).json({ message: 'Rol no valido' });
    }

    if (requestedRole === 'tecnico' && !documentoUrl) {
      return res.status(400).json({ message: 'Debes adjuntar un documento para la revision administrativa' });
    }

    const passwordHash = await hashPassword(password);
    const createdUser = await userModel.createUser({
      rolId: role.id,
      nombre,
      apellido,
      correo,
      telefono,
      cedula,
      genero,
      fechaNacimiento,
      direccionPrincipal,
      ciudad,
      pais,
      passwordHash,
      fotoPerfilUrl,
    });

    if (role.nombre === 'tecnico') {
      await technicianModel.ensureProfile(createdUser.id);
      await technicianModel.updateProfile(createdUser.id, {
        descripcion: req.body.descripcion || '',
        disponible: false,
        aniosExperiencia: req.body.aniosExperiencia ?? null,
        radioAtencionKm: req.body.radioAtencionKm ?? null,
        tarifaBase: req.body.tarifaBase ?? null,
        tarifaDomicilio: req.body.tarifaDomicilio ?? null,
        direccionTaller: req.body.direccionTaller || null,
        latitudTaller: req.body.latitudTaller ?? null,
        longitudTaller: req.body.longitudTaller ?? null,
        moneda: req.body.moneda || 'USD',
        documentoUrl,
      });

      if (specialtyIds.length > 0) {
        await technicianModel.setSpecialties(createdUser.id, specialtyIds);
      }

			await notificationModel.notifyAdmins({
				tipo: 'info',
				titulo: 'Nueva solicitud tecnica',
				mensaje: 'Un tecnico envio una nueva solicitud de registro pendiente de validacion.',
				urlAccion: '/admin/technicians',
			});
    }

    const authUser = {
      ...createdUser,
      rol_nombre: role.nombre,
    };

    if (role.nombre === 'tecnico') {
      return res.status(201).json({
        message: 'Solicitud de registro tecnico enviada correctamente. Debes esperar aprobacion del administrador.',
        requiresApproval: true,
        user: buildAuthUser(authUser),
      });
    }

    const token = signToken({
      sub: authUser.id,
      role: authUser.rol_nombre,
      email: authUser.correo,
    });

    return res.status(201).json({
      message: 'Usuario registrado correctamente',
      token,
      user: buildAuthUser(authUser),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ message: 'Correo y password son obligatorios' });
    }

    const user = await userModel.findByEmail(correo);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    if (!user.activo || user.bloqueado) {
      return res.status(403).json({ message: 'Usuario inactivo o bloqueado' });
    }

    if (user.rol_nombre === 'tecnico') {
      const profile = await technicianModel.ensureProfile(user.id);
      if (!profile?.verificado_admin) {
        return res.status(403).json({ message: 'Tu cuenta de tecnico aun no fue aprobada por el administrador' });
      }
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales invalidas' });
    }

    await userModel.updateLastSession(user.id);

    const token = signToken({
      sub: user.id,
      role: user.rol_nombre,
      email: user.correo,
    });

    return res.status(200).json({
      message: 'Inicio de sesion exitoso',
      token,
      user: buildAuthUser(user),
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al iniciar sesion', error: error.message });
  }
};

const me = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.status(200).json({ user: buildAuthUser(user) });
  } catch (error) {
    return res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
  }
};

const forgotPassword = async (req, res) => {
	try {
		const { correo } = req.body || {};
		if (!correo) {
			return res.status(400).json({ message: 'correo es obligatorio' });
		}

		const user = await userModel.findByEmail(correo);
		if (user) {
			const token = crypto.randomBytes(24).toString('hex');
			const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
			await userModel.setRecoveryToken(user.id, token, expiresAt);
			return res.status(200).json({
				message: 'Token de recuperacion generado correctamente',
				recoveryToken: token,
				expiresAt,
			});
		}

		return res.status(200).json({ message: 'Si el correo existe, se generara un token de recuperacion' });
	} catch (error) {
		return res.status(500).json({ message: 'Error al solicitar recuperacion de contraseña', error: error.message });
	}
};

const resetPassword = async (req, res) => {
	try {
		const { token, newPassword } = req.body || {};
		if (!token || !newPassword) {
			return res.status(400).json({ message: 'token y newPassword son obligatorios' });
		}

		if (newPassword.length < 6) {
			return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
		}

		const passwordHash = await hashPassword(newPassword);
		const updated = await userModel.resetPasswordByToken(token, passwordHash);
		if (!updated) {
			return res.status(400).json({ message: 'Token de recuperacion invalido o expirado' });
		}

		return res.status(200).json({ message: 'Contraseña restablecida correctamente' });
	} catch (error) {
		return res.status(500).json({ message: 'Error al restablecer contraseña', error: error.message });
	}
};

module.exports = {
  register,
  login,
  me,
	forgotPassword,
	resetPassword,
};
