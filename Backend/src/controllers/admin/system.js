const db = require('../../config/db');
const systemConfigModel = require('../../models/system-config.model');

const listSystemConfig = async (_req, res) => {
	try {
		const config = await systemConfigModel.listConfig();
		return res.status(200).json({ config });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar configuracion del sistema', error: error.message });
	}
};

const upsertSystemConfig = async (req, res) => {
	try {
		const payload = Array.isArray(req.body?.items) ? req.body.items : [req.body];
		if (!payload.length) return res.status(400).json({ message: 'Debes enviar al menos una configuracion' });
		const updated = [];
		for (const item of payload) {
			if (!item?.clave || item?.valor === undefined) return res.status(400).json({ message: 'Cada configuracion debe incluir clave y valor' });
			updated.push(await systemConfigModel.upsertByKey(item));
		}
		return res.status(200).json({ message: 'Configuracion del sistema actualizada correctamente', config: updated });
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar configuracion del sistema', error: error.message });
	}
};

module.exports = {
	listSystemConfig,
	upsertSystemConfig,
};
