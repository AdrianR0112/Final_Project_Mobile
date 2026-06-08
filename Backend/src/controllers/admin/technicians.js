const db = require('../../config/db');
const technicianModel = require('../../models/technician.model');
const { parseBooleanValue, buildTechnicianConditions, ADMIN_TECHNICIAN_SELECT, fetchAdminTechnicianById } = require('./helpers');

const listTechnicians = async (req, res) => {
	try {
		const available = parseBooleanValue(req.query?.disponible);
		const { conditions, params } = buildTechnicianConditions(available, []);

		const { rows } = await db.query(
			`
				${ADMIN_TECHNICIAN_SELECT}
				WHERE ${conditions.join(' AND ')}
				GROUP BY u.id, pt.id
				ORDER BY COALESCE(pt.disponible, FALSE) DESC, COALESCE(pt.calificacion_prom, 0) DESC, u.id DESC
			`,
			params,
		);

		return res.status(200).json({ technicians: rows });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar tecnicos', error: error.message });
	}
};

const updateTechnicianProfile = async (req, res) => {
	try {
		const technicianId = Number(req.params.technicianId);
		if (!Number.isInteger(technicianId) || technicianId <= 0) {
			return res.status(400).json({ message: 'technicianId invalido' });
		}

		const existingTechnician = await fetchAdminTechnicianById(technicianId);
		if (!existingTechnician) {
			return res.status(404).json({ message: 'Tecnico no encontrado' });
		}

		const payload = req.body || {};
		await technicianModel.updateProfile(technicianId, {
			descripcion: payload.descripcion,
			disponible: payload.disponible,
			aniosExperiencia: payload.aniosExperiencia,
			radioAtencionKm: payload.radioAtencionKm,
			tarifaBase: payload.tarifaBase,
			tarifaDomicilio: payload.tarifaDomicilio,
			direccionTaller: payload.direccionTaller,
			latitudTaller: payload.latitudTaller,
			longitudTaller: payload.longitudTaller,
			moneda: payload.moneda,
			documentoUrl: payload.documentoUrl,
		});

		if (Array.isArray(payload.specialtyIds)) {
			await technicianModel.setSpecialties(technicianId, payload.specialtyIds);
		}

		const updatedTechnician = await fetchAdminTechnicianById(technicianId);
		return res.status(200).json({
			message: 'Perfil tecnico actualizado correctamente',
			technician: updatedTechnician,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar perfil tecnico', error: error.message });
	}
};

const deleteTechnicianProfile = async (req, res) => {
	const technicianId = Number(req.params.technicianId);

	if (!Number.isInteger(technicianId) || technicianId <= 0) {
		return res.status(400).json({ message: 'technicianId invalido' });
	}

	const client = await db.pool.connect();

	try {
		await client.query('BEGIN');

		const profileResult = await client.query(
			`
				SELECT pt.id, u.id AS usuario_id
				FROM usuarios u
				JOIN roles r ON r.id = u.rol_id
				LEFT JOIN perfiles_tecnicos pt ON pt.usuario_id = u.id
				WHERE u.id = $1 AND LOWER(r.nombre) = 'tecnico'
				LIMIT 1
			`,
			[technicianId],
		);

		const profile = profileResult.rows[0];
		if (!profile?.usuario_id) {
			await client.query('ROLLBACK');
			return res.status(404).json({ message: 'Tecnico no encontrado' });
		}

		if (!profile.id) {
			await client.query('ROLLBACK');
			return res.status(404).json({ message: 'El tecnico no tiene perfil tecnico registrado' });
		}

		await client.query('DELETE FROM tecnico_especialidades WHERE tecnico_perfil_id = $1', [profile.id]);
		await client.query('DELETE FROM perfiles_tecnicos WHERE id = $1', [profile.id]);
		await client.query('COMMIT');

		const technician = await fetchAdminTechnicianById(technicianId);
		return res.status(200).json({
			message: 'Perfil tecnico eliminado correctamente',
			technician,
		});
	} catch (error) {
		await client.query('ROLLBACK');
		return res.status(500).json({ message: 'Error al eliminar perfil tecnico', error: error.message });
	} finally {
		client.release();
	}
};

const updateTechnicianApproval = async (req, res) => {
	try {
		const technicianId = Number(req.params.technicianId);

		if (!Number.isInteger(technicianId) || technicianId <= 0) {
			return res.status(400).json({ message: 'technicianId invalido' });
		}

		const approve = parseBooleanValue(req.body?.approve);
		if (approve === undefined) {
			return res.status(400).json({ message: 'approve es obligatorio y debe ser booleano' });
		}

		const motivoRechazo = typeof req.body?.motivoRechazo === 'string' ? req.body.motivoRechazo.trim() : null;

		const { rows } = await db.query(
			`
				UPDATE perfiles_tecnicos
				SET documentos_verificados = $1,
					verificado_admin = $2,
					motivo_rechazo = $3,
					fecha_verificacion = NOW()
				WHERE usuario_id = $4
				RETURNING usuario_id
			`,
			[
				approve,
				approve,
				approve ? null : (motivoRechazo || 'Solicitud pendiente de ajustes'),
				technicianId,
			],
		);

		if (!rows[0]) {
			return res.status(404).json({ message: 'Tecnico no encontrado' });
		}

		return res.status(200).json({
			message: approve ? 'Documento verificado y tecnico aprobado correctamente' : 'Estado de verificacion actualizado correctamente',
			technician: await fetchAdminTechnicianById(technicianId),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar la verificacion del tecnico', error: error.message });
	}
};

module.exports = {
	listTechnicians,
	updateTechnicianProfile,
	updateTechnicianApproval,
	deleteTechnicianProfile,
};
