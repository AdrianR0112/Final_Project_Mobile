const db = require('../../config/db');

const getReportsSummary = async (_req, res) => {
	try {
		const [servicesSummary, incomeByTechnician] = await Promise.all([
			db.query('SELECT * FROM v_resumen_servicios ORDER BY fecha_solicitud DESC, servicio_id DESC LIMIT 100'),
			db.query('SELECT * FROM v_ingresos_tecnicos ORDER BY ingresos_netos DESC NULLS LAST, tecnico_id ASC'),
		]);
		return res.status(200).json({ serviceSummary: servicesSummary.rows, technicianIncome: incomeByTechnician.rows });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener reportes', error: error.message });
	}
};

module.exports = { getReportsSummary };
