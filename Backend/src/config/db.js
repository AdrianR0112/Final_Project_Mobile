const { Pool } = require('pg');

require('dotenv').config({ override: true });

const DEFAULT_SYSTEM_TIMEZONE = process.env.SYSTEM_TIMEZONE || '-05:00';
const SYSTEM_TIMEZONE_CONFIG_KEY = 'zona_horaria';

const pool = new Pool({
	host: process.env.DB_HOST || 'localhost',
	port: Number(process.env.DB_PORT) || 5432,
	user: process.env.DB_USER || 'postgres',
	password: process.env.DB_PASSWORD || 'postgres',
	database: process.env.DB_NAME || 'reparaciones_db',
	max: Number(process.env.DB_POOL_MAX) || 10,
	idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30000,
	connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 2000,
});

async function applySystemTimeZone(client) {
	try {
		const { rows } = await client.query(
			'SELECT valor FROM configuracion_sistema WHERE clave = $1 LIMIT 1',
			[SYSTEM_TIMEZONE_CONFIG_KEY],
		);
		const configuredTimeZone = rows[0]?.valor || DEFAULT_SYSTEM_TIMEZONE;
		await client.query("SELECT set_config('TimeZone', $1, false)", [configuredTimeZone]);
	} catch (error) {
		await client.query("SELECT set_config('TimeZone', $1, false)", [DEFAULT_SYSTEM_TIMEZONE]).catch(() => {});
		console.warn('Could not apply system time zone from configuracion_sistema:', error.message);
	}
}

pool.on('connect', (client) => {
	void applySystemTimeZone(client);
});

pool.on('error', (error) => {
	console.error('Unexpected PostgreSQL pool error:', error);
});

const query = (text, params) => pool.query(text, params);

const testConnection = async () => {
	const client = await pool.connect();

	try {
		await client.query('SELECT 1');
	} finally {
		client.release();
	}
};

module.exports = {
	pool,
	query,
	testConnection,
};
