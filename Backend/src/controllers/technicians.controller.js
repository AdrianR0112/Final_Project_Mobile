const technicianModel = require('../models/technician.model');

const buildTechnicianProfile = (profile) => ({
	profileId: profile.profile_id,
	usuarioId: profile.usuario_id,
	descripcion: profile.descripcion,
	aniosExperiencia: profile.anios_experiencia,
	disponible: profile.disponible,
	radioAtencionKm: profile.radio_atencion_km,
	latitudActual: profile.latitud_actual,
	longitudActual: profile.longitud_actual,
	ultimaUbicacionTs: profile.ultima_ubicacion_ts,
	tarifaBase: profile.tarifa_base,
	tarifaDomicilio: profile.tarifa_domicilio,
	direccionTaller: profile.direccion_taller,
	latitudTaller: profile.latitud_taller,
	longitudTaller: profile.longitud_taller,
	moneda: profile.moneda,
	calificacionProm: profile.calificacion_prom,
	totalServicios: profile.total_servicios,
	totalCancelaciones: profile.total_cancelaciones,
	verificadoAdmin: profile.verificado_admin,
	documentosVerificados: profile.documentos_verificados,
	documentoUrl: profile.documento_url,
	motivoRechazo: profile.motivo_rechazo,
	fechaVerificacion: profile.fecha_verificacion,
	especialidades: profile.especialidades ? profile.especialidades.split(', ').filter(Boolean) : [],
	usuario: {
		id: profile.user_id,
		nombre: profile.nombre,
		apellido: profile.apellido,
		correo: profile.correo,
		telefono: profile.telefono,
		cedula: profile.cedula,
		genero: profile.genero,
		fechaNacimiento: profile.fecha_nacimiento,
		direccionPrincipal: profile.direccion_principal,
		ciudad: profile.ciudad,
		pais: profile.pais,
		fotoPerfilUrl: profile.foto_perfil_url,
		verificadoCorreo: profile.verificado_correo,
		activo: profile.activo,
		bloqueado: profile.bloqueado,
		razonBloqueo: profile.razon_bloqueo,
		fechaRegistro: profile.fecha_registro,
		rol: {
			id: profile.rol_id,
			nombre: profile.rol_nombre,
		},
	},
});

const buildSpecialty = (specialty) => ({
	id: specialty.id,
	nombre: specialty.nombre,
	descripcion: specialty.descripcion,
	imagenUrl: specialty.imagen_url,
	precioMinimo: specialty.precio_minimo,
	precioMaximo: specialty.precio_maximo,
	horasMinimas: specialty.horas_minimas,
	horasMaximas: specialty.horas_maximas,
	tiposEquipo: Array.isArray(specialty.tipos_equipo) ? specialty.tipos_equipo : [],
	totalSolicitudes: Number(specialty.total_solicitudes || 0),
});

const getMyTechnicianProfile = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const profile = await technicianModel.getProfileByUserId(userId);
		if (!profile) {
	      await technicianModel.ensureProfile(userId);
	      const createdProfile = await technicianModel.getProfileByUserId(userId);
			return res.status(200).json({
				message: 'Perfil de tecnico creado correctamente',
				profile: buildTechnicianProfile(createdProfile),
			});
		}

		return res.status(200).json({ profile: buildTechnicianProfile(profile) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener perfil de tecnico', error: error.message });
	}
};

const updateMyTechnicianProfile = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const {
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
		} = req.body;

		if (
			descripcion === undefined
			&& disponible === undefined
			&& aniosExperiencia === undefined
			&& radioAtencionKm === undefined
			&& tarifaBase === undefined
			&& tarifaDomicilio === undefined
			&& direccionTaller === undefined
			&& latitudTaller === undefined
			&& longitudTaller === undefined
			&& moneda === undefined
			&& documentoUrl === undefined
		) {
			return res.status(400).json({ message: 'Debes enviar al menos un campo para actualizar' });
		}

		const profile = await technicianModel.updateProfile(userId, {
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
		});
		return res.status(200).json({
			message: 'Perfil de tecnico actualizado correctamente',
			profile: buildTechnicianProfile(profile),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar perfil de tecnico', error: error.message });
	}
};

const updateMyTechnicianLocation = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const { latitudActual, longitudActual } = req.body;
		if (latitudActual === undefined || longitudActual === undefined) {
			return res.status(400).json({ message: 'latitudActual y longitudActual son obligatorios' });
		}

		const profile = await technicianModel.updateLocation(userId, { latitudActual, longitudActual });
		return res.status(200).json({
			message: 'Ubicacion actualizada correctamente',
			profile: buildTechnicianProfile(profile),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar ubicacion', error: error.message });
	}
};

const listSpecialties = async (_req, res) => {
	try {
		const specialties = await technicianModel.getSpecialties();
		return res.status(200).json({ specialties: specialties.map(buildSpecialty) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar especialidades', error: error.message });
	}
};

const updateMyTechnicianSpecialties = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const { specialtyIds } = req.body;
		if (!Array.isArray(specialtyIds)) {
			return res.status(400).json({ message: 'specialtyIds debe ser un arreglo de ids' });
		}

		const profile = await technicianModel.setSpecialties(userId, specialtyIds);
		return res.status(200).json({
			message: 'Especialidades actualizadas correctamente',
			profile: buildTechnicianProfile(profile),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar especialidades', error: error.message });
	}
};

const listAvailableTechnicians = async (req, res) => {
	try {
		const { lat, lng } = req.query;
		const technicians = await technicianModel.listAvailableTechnicians(
			lat !== undefined && lng !== undefined ? { lat: Number(lat), lng: Number(lng) } : undefined,
		);
		return res.status(200).json({ technicians });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar tecnicos disponibles', error: error.message });
	}
};

module.exports = {
	getMyTechnicianProfile,
	updateMyTechnicianProfile,
	updateMyTechnicianLocation,
	listSpecialties,
	updateMyTechnicianSpecialties,
	listAvailableTechnicians,
};
