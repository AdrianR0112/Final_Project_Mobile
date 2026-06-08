const db = require('../../config/db');

const getDashboard = async (_req, res) => {
	try {
		const [usersSummary, servicesByState, ratingsSummary, recentServices] = await Promise.all([
			db.query(
				`
					SELECT
						COUNT(*)::INT AS total_usuarios,
						COUNT(*) FILTER (WHERE u.activo = TRUE)::INT AS usuarios_activos,
						COUNT(*) FILTER (WHERE u.bloqueado = TRUE)::INT AS usuarios_bloqueados,
						COUNT(*) FILTER (WHERE r.nombre = 'cliente')::INT AS total_clientes,
						COUNT(*) FILTER (WHERE r.nombre = 'tecnico')::INT AS total_tecnicos,
						COUNT(*) FILTER (WHERE r.nombre = 'admin')::INT AS total_admins
					FROM usuarios u
					JOIN roles r ON r.id = u.rol_id
				`,
			),
			db.query(
				`
					SELECT es.nombre, COUNT(*)::INT AS total
					FROM servicios s
					JOIN estados_servicio es ON es.id = s.estado_id
					GROUP BY es.nombre
					ORDER BY es.nombre ASC
				`,
			),
			db.query(
				`
					SELECT
						COUNT(*)::INT AS total_calificaciones,
						COUNT(*) FILTER (WHERE visible = TRUE)::INT AS visibles,
						COUNT(*) FILTER (WHERE visible = FALSE)::INT AS ocultas,
						ROUND(COALESCE(AVG(puntuacion), 0)::NUMERIC, 2) AS promedio
					FROM calificaciones
				`,
			),
			db.query(
				`
					SELECT *
					FROM v_resumen_servicios
					ORDER BY fecha_solicitud DESC, servicio_id DESC
					LIMIT 5
				`,
			),
		]);

		return res.status(200).json({
			users: usersSummary.rows[0],
			serviceStates: servicesByState.rows,
			ratings: ratingsSummary.rows[0],
			recentServices: recentServices.rows,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener dashboard administrativo', error: error.message });
	}
};

module.exports = { getDashboard };
