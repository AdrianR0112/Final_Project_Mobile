const db = require('../../config/db');

const SERVICE_PRICE_SELECT = `
			s.estado_pago_id,
			ep.nombre AS estado_pago,
			s.estado_precio,
			s.precio_diagnostico,
			s.precio_mano_obra,
			s.precio_repuestos,
			s.precio_domicilio,
			s.precio_total,
			s.precio_acordado,
			s.fecha_cotizacion,
			s.fecha_aceptacion_precio,
			s.nota_precio,
			s.observacion_pago,
			s.precio_mano_obra AS precio_estimado_inicial,
			s.precio_domicilio AS precio_domicilio_estimado,
			s.precio_diagnostico AS precio_diagnostico_estimado,
			s.precio_total AS total_estimado_inicial,
			s.precio_acordado AS precio_inicial_aceptado,
			s.fecha_cotizacion AS fecha_cotizacion_inicial,
			s.fecha_aceptacion_precio AS fecha_aceptacion_inicial,
			s.precio_diagnostico AS precio_diagnostico_final,
			s.precio_mano_obra AS precio_mano_obra_final,
			s.precio_repuestos AS precio_repuestos_final,
			s.precio_domicilio AS precio_domicilio_final,
			s.precio_total AS precio_total_final,
			s.precio_acordado AS precio_final_acordado,
			s.nota_precio AS nota_cotizacion_inicial,
			s.nota_precio AS nota_reparacion,
`;

const getServiceById = async (serviceId) => {
	const sql = `
		SELECT
			s.id,
			s.codigo_servicio,
			s.cliente_id,
			s.tecnico_id,
			s.tipo_equipo_id,
			s.estado_id,
			s.descripcion_problema,
			s.marca_equipo,
			s.modelo_equipo,
			s.numero_serie_equipo,
			s.modalidad,
			s.direccion,
			s.referencia_direccion,
			s.latitud,
			s.longitud,
			s.prioridad,
			${SERVICE_PRICE_SELECT}
			s.requiere_repuestos,
			s.tiempo_estimado_horas,
			s.fecha_compromiso,
			s.fecha_solicitud,
			s.fecha_asignacion,
			s.fecha_en_camino,
			s.fecha_inicio_reparacion,
			s.fecha_fin_reparacion,
			s.fecha_finalizacion,
			s.fecha_pago,
			s.motivo_cancelacion_id,
			s.cancelado_por,
			s.detalle_cancelacion,
			s.notas_tecnico,
			s.notas_admin,
			s.asignado_por_admin,
			te.nombre AS tipo_equipo,
			es.nombre AS estado,
			c.nombre AS cliente_nombre,
			c.apellido AS cliente_apellido,
			c.correo AS cliente_correo,
			t.nombre AS tecnico_nombre,
			t.apellido AS tecnico_apellido,
			t.correo AS tecnico_correo
		FROM servicios s
		JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
		JOIN estados_servicio es ON es.id = s.estado_id
		LEFT JOIN estados_pago ep ON ep.id = s.estado_pago_id
		JOIN usuarios c ON c.id = s.cliente_id
		LEFT JOIN usuarios t ON t.id = s.tecnico_id
		WHERE s.id = $1
		LIMIT 1
	`;

	const { rows } = await db.query(sql, [serviceId]);
	return rows[0] || null;
};

const getServiceTypeById = async (typeId) => {
	const { rows } = await db.query(
		`SELECT te.id, te.nombre, te.especialidad_id, e.nombre AS especialidad
		 FROM tipos_equipo te
		 LEFT JOIN especialidades e ON e.id = te.especialidad_id
		 WHERE te.id = $1
		 LIMIT 1`,
		[typeId],
	);
	return rows[0] || null;
};

const listServiceTypes = async () => {
	const { rows } = await db.query(
		`SELECT te.id, te.nombre, te.especialidad_id, e.nombre AS especialidad
		 FROM tipos_equipo te
		 LEFT JOIN especialidades e ON e.id = te.especialidad_id
		 ORDER BY te.nombre ASC`,
	);
	return rows;
};

module.exports = {
	SERVICE_PRICE_SELECT,
	getServiceById,
	getServiceTypeById,
	listServiceTypes,
};
