const db = require('../config/db');
const { emitToUser } = require('../sockets/io');

const getNotificationById = async (notificationId) => {
	const { rows } = await db.query(
		`
			SELECT
				n.id,
				n.usuario_id,
				n.servicio_id,
				n.tipo,
				n.canal,
				n.titulo,
				n.mensaje,
				n.url_accion,
				n.leida,
				n.fecha,
				s.estado_id,
				es.nombre AS servicio_estado,
				s.fecha_solicitud,
				s.fecha_finalizacion,
				uc.nombre AS usuario_nombre,
				uc.apellido AS usuario_apellido,
				uc.correo AS usuario_correo,
				COALESCE(ut.nombre || ' ' || ut.apellido, '') AS tecnico_nombre_completo,
				te.nombre AS tipo_equipo
			FROM notificaciones n
			LEFT JOIN servicios s ON s.id = n.servicio_id
			LEFT JOIN estados_servicio es ON es.id = s.estado_id
			LEFT JOIN usuarios uc ON uc.id = n.usuario_id
			LEFT JOIN usuarios ut ON ut.id = s.tecnico_id
			LEFT JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
			WHERE n.id = $1
			LIMIT 1
		`,
		[notificationId],
	);

	return rows[0] || null;
};

const createNotification = async ({ usuarioId, servicioId = null, tipo = 'info', canal = 'interna', titulo, mensaje, urlAccion = null }) => {
	const { rows } = await db.query(
		`
			INSERT INTO notificaciones (usuario_id, servicio_id, tipo, canal, titulo, mensaje, url_accion)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			RETURNING id
		`,
		[usuarioId, servicioId, tipo, canal, titulo, mensaje, urlAccion],
	);

	const notification = await getNotificationById(rows[0].id);
	emitToUser(usuarioId, 'notification:new', notification);
	return notification;
};

const listAdminRecipientIds = async () => {
	const { rows } = await db.query(
		`
			SELECT u.id
			FROM usuarios u
			JOIN roles r ON r.id = u.rol_id
			WHERE LOWER(r.nombre) = 'admin' AND u.activo = TRUE AND u.bloqueado = FALSE
			ORDER BY u.id ASC
		`,
	);

	return rows.map((row) => row.id);
};

const notifyAdmins = async ({ servicioId = null, tipo = 'info', canal = 'interna', titulo, mensaje, urlAccion = null }) => {
	const adminIds = await listAdminRecipientIds();

	if (adminIds.length === 0) {
		return [];
	}

	return Promise.all(
		adminIds.map((usuarioId) => createNotification({
			usuarioId,
			servicioId,
			tipo,
			canal,
			titulo,
			mensaje,
			urlAccion,
		})),
	);
};

const listMyNotifications = async (userId, { leida, limit = 20, offset = 0 } = {}) => {
	const conditions = ['n.usuario_id = $1'];
	const params = [userId];
	let index = 2;

	if (leida !== undefined) {
		conditions.push(`n.leida = $${index}`);
		params.push(Boolean(leida));
		index += 1;
	}

	params.push(limit, offset);

	const { rows } = await db.query(
		`
			SELECT
				n.id,
				n.usuario_id,
				n.servicio_id,
				n.tipo,
				n.canal,
				n.titulo,
				n.mensaje,
				n.url_accion,
				n.leida,
				n.fecha,
				s.estado_id,
				es.nombre AS servicio_estado,
				s.fecha_solicitud,
				s.fecha_finalizacion,
				uc.nombre AS usuario_nombre,
				uc.apellido AS usuario_apellido,
				uc.correo AS usuario_correo,
				COALESCE(ut.nombre || ' ' || ut.apellido, '') AS tecnico_nombre_completo,
				te.nombre AS tipo_equipo
			FROM notificaciones n
			LEFT JOIN servicios s ON s.id = n.servicio_id
			LEFT JOIN estados_servicio es ON es.id = s.estado_id
			LEFT JOIN usuarios uc ON uc.id = n.usuario_id
			LEFT JOIN usuarios ut ON ut.id = s.tecnico_id
			LEFT JOIN tipos_equipo te ON te.id = s.tipo_equipo_id
			WHERE ${conditions.join(' AND ')}
			ORDER BY n.fecha DESC, n.id DESC
			LIMIT $${index} OFFSET $${index + 1}
		`,
		params,
	);

	return rows;
};

const getUnreadCount = async (userId) => {
	const { rows } = await db.query(
		`SELECT COUNT(*)::INT AS unread_count FROM notificaciones WHERE usuario_id = $1 AND leida = FALSE`,
		[userId],
	);

	return rows[0] || { unread_count: 0 };
};

const markNotificationAsRead = async (notificationId, userId) => {
	const { rows } = await db.query(
		`
			UPDATE notificaciones
			SET leida = TRUE
			WHERE id = $1 AND usuario_id = $2
			RETURNING id
		`,
		[notificationId, userId],
	);

	return rows[0] || null;
};

const markAllMyNotificationsAsRead = async (userId) => {
	const { rowCount } = await db.query(
		`
			UPDATE notificaciones
			SET leida = TRUE
			WHERE usuario_id = $1 AND leida = FALSE
		`,
		[userId],
	);

	return rowCount;
};

module.exports = {
	getNotificationById,
	createNotification,
	notifyAdmins,
	listMyNotifications,
	getUnreadCount,
	markNotificationAsRead,
	markAllMyNotificationsAsRead,
};
