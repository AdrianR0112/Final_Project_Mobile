const db = require('../config/db');

const baseUserSelection = `
  SELECT 
    u.id, 
    u.rol_id, 
    u.nombre, 
    u.apellido, 
    u.correo, 
    u.telefono, 
    u.cedula,
    u.genero,
    u.fecha_nacimiento,
    u.direccion_principal,
    u.ciudad,
    u.pais,
    u.foto_perfil_url, 
    u.verificado_correo,
    u.activo, 
    u.bloqueado, 
    u.razon_bloqueo,
    u.fecha_registro, 
    u.ultima_sesion,
    r.nombre AS rol_nombre
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
`;

const findByEmail = async (correo) => {
  const sql = `
    SELECT 
      u.*, 
      r.nombre AS rol_nombre 
    FROM usuarios u 
    JOIN roles r ON r.id = u.rol_id 
    WHERE LOWER(u.correo) = LOWER($1) 
    LIMIT 1
  `;
  const { rows } = await db.query(sql, [correo]);
  return rows[0] || null;
};

const findById = async (id) => {
  const sql = `
    ${baseUserSelection}
    WHERE u.id = $1
    LIMIT 1
  `;
  const { rows } = await db.query(sql, [id]);
  return rows[0] || null;
};

const findRoleByName = async (roleName) => {
  const { rows } = await db.query(
    'SELECT id, nombre FROM roles WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
    [roleName],
  );
  return rows[0] || null;
};

const createUser = async ({
  rolId,
  nombre,
  apellido,
  correo,
  telefono,
  cedula = null,
  genero = null,
  fechaNacimiento = null,
  direccionPrincipal = null,
  ciudad = null,
  pais = null,
  passwordHash,
  fotoPerfilUrl = null,
  verificadoCorreo = false,
}) => {
	const sql = `
		INSERT INTO usuarios (
			rol_id,
			nombre,
			apellido,
			correo,
			telefono,
			cedula,
			genero,
			fecha_nacimiento,
			direccion_principal,
			ciudad,
			pais,
			password_hash,
			foto_perfil_url,
			verificado_correo
		)
		VALUES ($1, $2, $3, LOWER($4), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id
	`;

	const params = [
		rolId,
		nombre,
		apellido,
		correo,
		telefono || null,
		cedula,
		genero,
		fechaNacimiento,
		direccionPrincipal,
		ciudad,
		pais,
		passwordHash,
		fotoPerfilUrl,
		Boolean(verificadoCorreo),
	];

	const { rows } = await db.query(sql, params);

	return findById(rows[0].id);
};

const updateLastSession = async (userId) => {
  await db.query('UPDATE usuarios SET ultima_sesion = NOW() WHERE id = $1', [userId]);
};

const setRecoveryToken = async (userId, token, expiresAt) => {
	await db.query(
		'UPDATE usuarios SET token_recuperacion = $1, token_expiracion = $2 WHERE id = $3',
		[token, expiresAt, userId],
	);
};

const findByRecoveryToken = async (token) => {
	const { rows } = await db.query(
		`
			SELECT u.*, r.nombre AS rol_nombre
			FROM usuarios u
			JOIN roles r ON r.id = u.rol_id
			WHERE u.token_recuperacion = $1
			LIMIT 1
		`,
		[token],
	);
	return rows[0] || null;
};

const resetPasswordByToken = async (token, passwordHash) => {
	const { rows } = await db.query(
		`
			UPDATE usuarios
			SET password_hash = $1,
				token_recuperacion = NULL,
				token_expiracion = NULL
			WHERE token_recuperacion = $2 AND token_expiracion IS NOT NULL AND token_expiracion > NOW()
			RETURNING id
		`,
		[passwordHash, token],
	);
	return rows[0] || null;
};

module.exports = {
  findByEmail,
  findById,
  findRoleByName,
  createUser,
  updateLastSession,
	setRecoveryToken,
	findByRecoveryToken,
	resetPasswordByToken,
};
