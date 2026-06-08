const db = require('../../config/db');
const coverageZoneModel = require('../../models/coverage-zone.model');

const listCoverageZones = async (req, res) => {
	try {
		const activeOnly = req.query?.activa === undefined ? undefined : req.query.activa === 'true';
		const zones = await coverageZoneModel.listZones({ activeOnly });
		return res.status(200).json({ zones });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar zonas de cobertura', error: error.message });
	}
};

const createCoverageZone = async (req, res) => {
	try {
		const { nombre, ciudad, provincia, pais, activa } = req.body || {};
		if (!nombre || !ciudad) return res.status(400).json({ message: 'nombre y ciudad son obligatorios' });
		const zone = await coverageZoneModel.createZone({ nombre, ciudad, provincia, pais, activa });
		return res.status(201).json({ message: 'Zona de cobertura creada correctamente', zone });
	} catch (error) {
		return res.status(500).json({ message: 'Error al crear zona de cobertura', error: error.message });
	}
};

const updateCoverageZone = async (req, res) => {
	try {
		const zoneId = Number(req.params.zoneId);
		if (!Number.isInteger(zoneId) || zoneId <= 0) return res.status(400).json({ message: 'zoneId invalido' });
		const zone = await coverageZoneModel.updateZone(zoneId, req.body || {});
		if (!zone) return res.status(404).json({ message: 'Zona de cobertura no encontrada' });
		return res.status(200).json({ message: 'Zona de cobertura actualizada correctamente', zone });
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar zona de cobertura', error: error.message });
	}
};

module.exports = {
	listCoverageZones,
	createCoverageZone,
	updateCoverageZone,
};
