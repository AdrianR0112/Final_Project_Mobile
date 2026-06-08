const sparePartModel = require('../models/spare-part.model');
const { getAccessibleServiceById } = require('../models/service-access.util');

const buildPart = (part) => ({
	id: part.id,
	serviceId: part.servicio_id,
	name: part.nombre,
	quantity: part.cantidad,
	unitPrice: part.precio_unitario,
	subtotal: part.subtotal,
	supplier: part.proveedor,
	warrantyDays: part.garantia_dias,
});

const listServiceParts = async (req, res) => {
	try {
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'serviceId invalido' });
		const service = await getAccessibleServiceById(serviceId, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const parts = await sparePartModel.listByServiceId(serviceId);
		return res.status(200).json({ parts: parts.map(buildPart) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar repuestos', error: error.message });
	}
};

const createServicePart = async (req, res) => {
	try {
		if (!['tecnico', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'No autorizado para agregar repuestos' });
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'serviceId invalido' });
		const service = await getAccessibleServiceById(serviceId, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const { nombre, cantidad, precioUnitario, proveedor, garantiaDias } = req.body || {};
		if (!nombre) return res.status(400).json({ message: 'nombre es obligatorio' });
		const part = await sparePartModel.createForService(serviceId, { nombre, cantidad, precioUnitario, proveedor, garantiaDias });
		return res.status(201).json({ message: 'Repuesto agregado correctamente', part: buildPart(part) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al agregar repuesto', error: error.message });
	}
};

const updateServicePart = async (req, res) => {
	try {
		if (!['tecnico', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'No autorizado para actualizar repuestos' });
		const partId = Number(req.params.partId);
		if (!Number.isInteger(partId) || partId <= 0) return res.status(400).json({ message: 'partId invalido' });
		const part = await sparePartModel.getById(partId);
		if (!part) return res.status(404).json({ message: 'Repuesto no encontrado' });
		const service = await getAccessibleServiceById(part.servicio_id, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const updated = await sparePartModel.updateById(partId, req.body || {});
		return res.status(200).json({ message: 'Repuesto actualizado correctamente', part: buildPart(updated) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar repuesto', error: error.message });
	}
};

const deleteServicePart = async (req, res) => {
	try {
		if (!['tecnico', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'No autorizado para eliminar repuestos' });
		const partId = Number(req.params.partId);
		if (!Number.isInteger(partId) || partId <= 0) return res.status(400).json({ message: 'partId invalido' });
		const part = await sparePartModel.getById(partId);
		if (!part) return res.status(404).json({ message: 'Repuesto no encontrado' });
		const service = await getAccessibleServiceById(part.servicio_id, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		await sparePartModel.deleteById(partId);
		return res.status(200).json({ message: 'Repuesto eliminado correctamente' });
	} catch (error) {
		return res.status(500).json({ message: 'Error al eliminar repuesto', error: error.message });
	}
};

module.exports = { listServiceParts, createServicePart, updateServicePart, deleteServicePart };
