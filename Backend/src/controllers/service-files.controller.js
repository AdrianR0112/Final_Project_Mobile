const fileModel = require('../models/service-file.model');
const { getAccessibleServiceById } = require('../models/service-access.util');

const inferFileType = (mimeType = '', originalName = '') => {
	const lowerMime = String(mimeType).toLowerCase();
	const lowerName = String(originalName).toLowerCase();

	if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) return 'documento';
	if (lowerMime.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(lowerName)) return 'imagen';
	return 'archivo';
};

const buildFile = (file) => ({
	id: file.id,
	serviceId: file.servicio_id,
	uploadedBy: file.subido_por,
	type: file.tipo,
	stage: file.etapa,
	url: file.url,
	description: file.descripcion,
	uploadedAt: file.fecha_subida,
	uploader: file.subido_por_nombre || file.subido_por_apellido || file.subido_por_correo ? {
		name: file.subido_por_nombre,
		lastName: file.subido_por_apellido,
		email: file.subido_por_correo,
	} : undefined,
});

const listServiceFiles = async (req, res) => {
	try {
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'serviceId invalido' });
		const service = await getAccessibleServiceById(serviceId, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const files = await fileModel.listByServiceId(serviceId);
		return res.status(200).json({ files: files.map(buildFile) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar archivos del servicio', error: error.message });
	}
};

const createServiceFile = async (req, res) => {
	try {
		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) return res.status(400).json({ message: 'serviceId invalido' });
		const service = await getAccessibleServiceById(serviceId, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		const { tipo, etapa, url, descripcion } = req.body || {};
		const uploadedFileUrl = req.file
			? `${req.protocol}://${req.get('host')}/uploads/service-files/${req.file.filename}`
			: null;
		const resolvedUrl = uploadedFileUrl || url || null;
		const resolvedType = tipo || inferFileType(req.file?.mimetype, req.file?.originalname);
		const resolvedStage = etapa || 'otro';
		if (!resolvedType || !resolvedStage || !resolvedUrl) return res.status(400).json({ message: 'tipo, etapa y url son obligatorios' });
		const file = await fileModel.createForService(serviceId, req.user.id, { tipo: resolvedType, etapa: resolvedStage, url: resolvedUrl, descripcion });
		return res.status(201).json({ message: 'Archivo agregado correctamente', file: buildFile(file) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al agregar archivo del servicio', error: error.message });
	}
};

const deleteServiceFile = async (req, res) => {
	try {
		const fileId = Number(req.params.fileId);
		if (!Number.isInteger(fileId) || fileId <= 0) return res.status(400).json({ message: 'fileId invalido' });
		const file = await fileModel.getById(fileId);
		if (!file) return res.status(404).json({ message: 'Archivo no encontrado' });
		const service = await getAccessibleServiceById(file.servicio_id, req.user.id, req.user.role);
		if (!service) return res.status(404).json({ message: 'Servicio no encontrado o no accesible' });
		if (req.user.role !== 'admin' && file.subido_por !== req.user.id) return res.status(403).json({ message: 'No autorizado para eliminar este archivo' });
		await fileModel.deleteById(fileId);
		return res.status(200).json({ message: 'Archivo eliminado correctamente' });
	} catch (error) {
		return res.status(500).json({ message: 'Error al eliminar archivo del servicio', error: error.message });
	}
};

module.exports = { listServiceFiles, createServiceFile, deleteServiceFile };
