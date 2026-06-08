const pushDeviceModel = require('../models/push-device.model');

const buildDevice = (device) => ({
	id: device.id,
	userId: device.usuario_id,
	token: device.token,
	platform: device.plataforma,
	active: device.activo,
	createdAt: device.fecha_registro,
});

const listMyPushDevices = async (req, res) => {
	try {
		const devices = await pushDeviceModel.listByUserId(req.user.id);
		return res.status(200).json({ devices: devices.map(buildDevice) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar dispositivos push', error: error.message });
	}
};

const registerMyPushDevice = async (req, res) => {
	try {
		const { token, plataforma, activo } = req.body || {};
		if (!token || !plataforma) return res.status(400).json({ message: 'token y plataforma son obligatorios' });
		const device = await pushDeviceModel.upsertForUser(req.user.id, { token, plataforma, activo });
		return res.status(201).json({ message: 'Dispositivo push registrado correctamente', device: buildDevice(device) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al registrar dispositivo push', error: error.message });
	}
};

const updateMyPushDevice = async (req, res) => {
	try {
		const deviceId = Number(req.params.deviceId);
		if (!Number.isInteger(deviceId) || deviceId <= 0) return res.status(400).json({ message: 'deviceId invalido' });
		const device = await pushDeviceModel.updateById(deviceId, req.user.id, { activo: req.body?.activo });
		if (!device) return res.status(404).json({ message: 'Dispositivo push no encontrado' });
		return res.status(200).json({ message: 'Dispositivo push actualizado correctamente', device: buildDevice(device) });
	} catch (error) {
		return res.status(500).json({ message: 'Error al actualizar dispositivo push', error: error.message });
	}
};

const deleteMyPushDevice = async (req, res) => {
	try {
		const deviceId = Number(req.params.deviceId);
		if (!Number.isInteger(deviceId) || deviceId <= 0) return res.status(400).json({ message: 'deviceId invalido' });
		const deleted = await pushDeviceModel.deleteById(deviceId, req.user.id);
		if (!deleted) return res.status(404).json({ message: 'Dispositivo push no encontrado' });
		return res.status(200).json({ message: 'Dispositivo push eliminado correctamente' });
	} catch (error) {
		return res.status(500).json({ message: 'Error al eliminar dispositivo push', error: error.message });
	}
};

module.exports = { listMyPushDevices, registerMyPushDevice, updateMyPushDevice, deleteMyPushDevice };
