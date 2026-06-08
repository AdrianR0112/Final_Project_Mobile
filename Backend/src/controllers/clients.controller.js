const clientModel = require('../models/client.model');

const buildClientProfile = (user) => ({
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

const getMyClientProfile = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const profile = await clientModel.getClientProfileByUserId(userId);
		if (!profile) {
			return res.status(404).json({ message: 'Perfil de cliente no encontrado' });
		}

		const summary = await clientModel.getClientSummary(userId);

		return res.status(200).json({
			profile: buildClientProfile(profile),
			summary,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener perfil de cliente', error: error.message });
	}
};

const updateMyClientProfile = async (req, res) => {
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
			return res.status(400).json({ message: 'Debes enviar al menos un campo para actualizar' });
		}

		const updatedProfile = await clientModel.updateClientProfile(userId, {
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
		});

		if (!updatedProfile) {
			return res.status(404).json({ message: 'Perfil de cliente no encontrado' });
		}

		const summary = await clientModel.getClientSummary(userId);

		return res.status(200).json({
			message: 'Perfil de cliente actualizado correctamente',
			profile: buildClientProfile(updatedProfile),
			summary,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar perfil de cliente', error: error.message });
	}
};

module.exports = {
	getMyClientProfile,
	updateMyClientProfile,
};
