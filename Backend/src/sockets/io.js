let ioInstance = null;

const setIO = (io) => {
	ioInstance = io;
};

const getIO = () => ioInstance;

const emitToUser = (userId, eventName, payload) => {
	if (!ioInstance || !userId) {
		return;
	}

	ioInstance.to(`user:${userId}`).emit(eventName, payload);
};

const emitToService = (serviceId, eventName, payload) => {
	if (!ioInstance || !serviceId) {
		return;
	}

	ioInstance.to(`service:${serviceId}`).emit(eventName, payload);
};

const emitServiceUpdate = (service, extra = {}) => {
	if (!service?.id) {
		return;
	}

	const payload = {
		serviceId: service.id,
		service,
		...extra,
	};

	emitToService(service.id, 'service:updated', payload);
	emitToUser(service.cliente_id, 'service:updated', payload);
	emitToUser(service.tecnico_id, 'service:updated', payload);
};

module.exports = {
	setIO,
	getIO,
	emitToUser,
	emitToService,
	emitServiceUpdate,
};
