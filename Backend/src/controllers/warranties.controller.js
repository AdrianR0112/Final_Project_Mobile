const warrantyModel = require('../models/warranty.model');
const { getAccessibleServiceById } = require('../models/service-access.util');
const serviceModel = require('../models/service.model');

const buildWarranty = (warranty) => ({
	id: warranty.id,
	serviceId: warranty.servicio_id,
	description: warranty.descripcion,
	durationDays: warranty.duracion_dias,
	startDate: warranty.fecha_inicio,
	endDate: warranty.fecha_fin,
	active: warranty.activa,
	observations: warranty.observaciones,
});

const getServiceWarranty = async (req, res) => {
	try {
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'serviceId invalido' });
		const service = await getAccessibleServiceById(serviceId, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const warranty = await warrantyModel.getByServiceId(serviceId);
		if (!warranty) return res.status(200).json({ warranty: null });
		return res.status(200).json({ warranty: buildWarranty(warranty) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener garantia', error: error.message });
	}
};

const createServiceWarranty = async (req, res) => {
	try {
		if (!['tecnico', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'No autorizado para crear garantias' });
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'serviceId invalido' });
		const service = await getAccessibleServiceById(serviceId, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const fullService = await serviceModel.getServiceById(serviceId);
		if (!fullService || !['pendiente_pago', 'pago_enviado', 'finalizado'].includes(fullService.estado)) {
			return res.status(409).json({ message: 'Solo se puede crear garantia para servicios en pendiente de pago o finalizados' });
		}
		const { descripcion } = req.body || {};
		if (!descripcion) return res.status(400).json({ message: 'descripcion es obligatoria' });
		const warranty = await warrantyModel.createForService(serviceId, req.body || {});
		return res.status(201).json({ message: 'Garantia creada correctamente', warranty: buildWarranty(warranty) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al crear garantia', error: error.message });
	}
};

const updateWarranty = async (req, res) => {
	try {
		if (!['tecnico', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'No autorizado para actualizar garantias' });
		const warrantyId = Number(req.params.warrantyId);
		if (!Number.isInteger(warrantyId) || warrantyId <= 0) return res.status(400).json({ message: 'warrantyId invalido' });
		const warranty = await warrantyModel.getById(warrantyId);
		if (!warranty) return res.status(404).json({ message: 'Garantia no encontrada' });
		const service = await getAccessibleServiceById(warranty.servicio_id, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const updated = await warrantyModel.updateById(warrantyId, req.body || {});
		return res.status(200).json({ message: 'Garantia actualizada correctamente', warranty: buildWarranty(updated) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar garantia', error: error.message });
	}
};

module.exports = { getServiceWarranty, createServiceWarranty, updateWarranty };
