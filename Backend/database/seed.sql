-- Seed data for local testing
-- Uses pgcrypto. Run after DB is up:
-- docker compose exec -T postgres psql -U ${DB_USER:-postgres} -d ${DB_NAME:-reparaciones_db} < database/seed.sql

BEGIN;

-- 1) Ensure admin has a known password for testing
UPDATE usuarios
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE correo = 'admin@repatech.com';

-- 2) Insert a test client if not exists
INSERT INTO usuarios (rol_id, nombre, apellido, correo, telefono, password_hash)
SELECT (SELECT id FROM roles WHERE nombre = 'cliente'), 'Juan', 'Perez', 'cliente1@demo.com', '0991001001', crypt('cliente123', gen_salt('bf'))
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'cliente1@demo.com');

-- 3) Insert a test technician if not exists
INSERT INTO usuarios (rol_id, nombre, apellido, correo, telefono, password_hash)
SELECT (SELECT id FROM roles WHERE nombre = 'tecnico'), 'Carlos', 'Gonzalez', 'tecnico1@demo.com', '0992002002', crypt('tecnico123', gen_salt('bf'))
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'tecnico1@demo.com');

-- 4) Create a technical profile for the technician
INSERT INTO perfiles_tecnicos (usuario_id, descripcion, disponible, latitud_actual, longitud_actual)
SELECT u.id, 'Técnico especializado en celulares y tablets', TRUE, -0.180653, -78.467838
FROM usuarios u
WHERE u.correo = 'tecnico1@demo.com'
	AND NOT EXISTS (SELECT 1 FROM perfiles_tecnicos pt WHERE pt.usuario_id = u.id);

-- 5) Asignar especialidad al técnico
INSERT INTO tecnico_especialidades (tecnico_perfil_id, especialidad_id)
SELECT pt.id, e.id
FROM perfiles_tecnicos pt, especialidades e, usuarios u
WHERE u.correo = 'tecnico1@demo.com'
	AND pt.usuario_id = u.id
	AND e.nombre = 'Celulares y tablets'
	AND NOT EXISTS (
		SELECT 1 FROM tecnico_especialidades tec
		WHERE tec.tecnico_perfil_id = pt.id AND tec.especialidad_id = e.id
	);

-- 6) Insert a sample service for the client assigned to the technician
INSERT INTO servicios (cliente_id, tecnico_id, tipo_equipo_id, descripcion_problema, modalidad, direccion, latitud, longitud)
SELECT
	(SELECT id FROM usuarios WHERE correo = 'cliente1@demo.com'),
	(SELECT id FROM usuarios WHERE correo = 'tecnico1@demo.com'),
	(SELECT id FROM tipos_equipo WHERE nombre = 'Celular'),
	'Pantalla rota y no enciende',
	'domicilio',
	'Av. Principal 123, Quito',
	-0.180653,
	-78.467838
WHERE NOT EXISTS (
	SELECT 1 FROM servicios s
	WHERE s.descripcion_problema = 'Pantalla rota y no enciende' AND s.cliente_id = (SELECT id FROM usuarios WHERE correo = 'cliente1@demo.com')
);

COMMIT;

-- End seed
