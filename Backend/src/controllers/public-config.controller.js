const systemConfigModel = require('../models/system-config.model');
const coverageZoneModel = require('../models/coverage-zone.model');

const CONTACT_CONFIG_KEYS = [
	'app_nombre',
	'contacto_correo',
	'contacto_telefono',
	'contacto_instagram',
	'contacto_instagram_url',
	'contacto_linkedin',
	'contacto_linkedin_url',
];

function mapConfigRows(rows = []) {
	return rows.reduce((accumulator, row) => {
		accumulator[row.clave] = row.valor;
		return accumulator;
	}, {});
}

const getPublicContactConfig = async (_req, res) => {
	try {
		const rows = await systemConfigModel.listByKeys(CONTACT_CONFIG_KEYS);
		const config = mapConfigRows(rows);

		return res.status(200).json({
			appName: config.app_nombre || 'RepaTech',
			contact: {
				email: config.contacto_correo || '',
				phone: config.contacto_telefono || '',
				instagram: {
					label: config.contacto_instagram || '',
					url: config.contacto_instagram_url || '',
				},
				linkedin: {
					label: config.contacto_linkedin || '',
					url: config.contacto_linkedin_url || '',
				},
			},
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener configuracion publica', error: error.message });
	}
};

const getPublicCoverageZones = async (_req, res) => {
	try {
		const zones = await coverageZoneModel.listZones({ activeOnly: true });
		return res.status(200).json({ zones });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener zonas de cobertura publicas', error: error.message });
	}
};

module.exports = {
	getPublicContactConfig,
	getPublicCoverageZones,
};
