const serviceModel = require('../../models/service.model');

const getMyServiceHistory = async (req, res) => {
	try {
		const userId = req.user?.id;
		const role = req.user?.role;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const query = req.query || {};
		const estadoId = query.estadoId ? Number(query.estadoId) : undefined;
		const modalidad = query.modalidad;
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;

		const serviceHistory = await serviceModel.listServiceHistory(userId, role, {
			estadoId,
			modalidad,
			limit,
			offset,
		});

		return res.status(200).json({ serviceHistory });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar historial de servicios', error: error.message });
	}
};

const getMyServiceHistoryById = async (req, res) => {
	try {
		const userId = req.user?.id;
		const role = req.user?.role;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.id);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'id de servicio invalido' });
		}

		const history = await serviceModel.getServiceHistoryById(serviceId, userId, role);
		if (!history) {
			return res.status(404).json({ message: 'Historial de servicio no encontrado' });
		}

		return res.status(200).json(history);
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener historial de servicio', error: error.message });
	}
};

module.exports = {
	getMyServiceHistory,
	getMyServiceHistoryById,
};
