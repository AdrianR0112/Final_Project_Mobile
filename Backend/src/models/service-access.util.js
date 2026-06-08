const db = require('../config/db');

const getAccessibleServiceById = async (serviceId, userId, role) => {
	const conditions = ['s.id = $1'];
	const params = [serviceId];

	if (role !== 'admin') {
		conditions.push('(s.cliente_id = $2 OR s.tecnico_id = $2)');
		params.push(userId);
	}

	const { rows } = await db.query(
		`
			SELECT s.id, s.cliente_id, s.tecnico_id, s.estado_id
			FROM servicios s
			WHERE ${conditions.join(' AND ')}
			LIMIT 1
		`,
		params,
	);

	return rows[0] || null;
};

module.exports = {
	getAccessibleServiceById,
};
