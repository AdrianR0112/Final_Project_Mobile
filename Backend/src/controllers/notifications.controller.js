const notificationModel = require('../models/notification.model');

const buildNotification = (notification) => ({
	id: notification.id,
	userId: notification.usuario_id,
	serviceId: notification.servicio_id,
	type: notification.tipo,
	channel: notification.canal,
	title: notification.titulo,
	message: notification.mensaje,
	actionUrl: notification.url_accion,
	read: notification.leida,
	date: notification.fecha,
	service: notification.servicio_id
		? {
			stateId: notification.estado_id,
			state: notification.servicio_estado,
			requestedAt: notification.fecha_solicitud,
			completedAt: notification.fecha_finalizacion,
			type: notification.tipo_equipo,
			technicianName: notification.tecnico_nombre_completo,
		}
		: null,
});

const getMyNotifications = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const query = req.query || {};
		const leida = query.leida === undefined ? undefined : query.leida === 'true';
		const limit = query.limit ? Number(query.limit) : 20;
		const offset = query.offset ? Number(query.offset) : 0;

		const notifications = await notificationModel.listMyNotifications(userId, { leida, limit, offset });
		return res.status(200).json({ notifications: notifications.map(buildNotification) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar notificaciones', error: error.message });
	}
};

const getMyUnreadNotificationsCount = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const unread = await notificationModel.getUnreadCount(userId);
		return res.status(200).json({ unreadCount: unread.unread_count || 0 });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener notificaciones no leidas', error: error.message });
    }
};

const markNotificationAsRead = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const notificationId = Number(req.params.id);
		if (!Number.isInteger(notificationId) || notificationId <= 0) {
			return res.status(400).json({ message: 'id de notificacion invalido' });
		}

		const updated = await notificationModel.markNotificationAsRead(notificationId, userId);
		if (!updated) {
			return res.status(404).json({ message: 'Notificacion no encontrada' });
		}

		return res.status(200).json({ message: 'Notificacion marcada como leida correctamente' });
	} catch (error) {
		return res.status(500).json({ message: 'Error al marcar notificacion como leida', error: error.message });
	}
};

const markAllMyNotificationsAsRead = async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const updatedCount = await notificationModel.markAllMyNotificationsAsRead(userId);
		return res.status(200).json({
			message: 'Notificaciones marcadas como leidas correctamente',
			updatedCount,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al marcar notificaciones como leidas', error: error.message });
	}
};

module.exports = {
	getMyNotifications,
	getMyUnreadNotificationsCount,
	markNotificationAsRead,
	markAllMyNotificationsAsRead,
};
