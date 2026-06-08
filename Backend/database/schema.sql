-- ============================================================
-- BASE DE DATOS v2: Plataforma On-Demand de Reparación Tecnológica
-- Motor: PostgreSQL
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- TABLA: roles
-- ============================================================
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT
);

INSERT INTO roles (nombre, descripcion) VALUES
    ('cliente',  'Usuario que solicita servicios de reparación'),
    ('tecnico',  'Profesional que atiende los servicios'),
    ('admin',    'Personal administrativo con acceso al panel de control');


-- ============================================================
-- TABLA: usuarios
-- Campos añadidos: genero, fecha_nacimiento, direccion_principal,
--                  ciudad, pais, cedula, razon_bloqueo,
--                  token_recuperacion, token_expiracion,
--                  verificado_correo
-- ============================================================
CREATE TABLE usuarios (
    id                    SERIAL PRIMARY KEY,
    rol_id                INT          NOT NULL REFERENCES roles(id),
    nombre                VARCHAR(100) NOT NULL,
    apellido              VARCHAR(100) NOT NULL,
    correo                VARCHAR(150) NOT NULL UNIQUE,
    telefono              VARCHAR(20),
    cedula                VARCHAR(20),                          -- Cédula / DNI
    genero                VARCHAR(20)  CHECK (genero IN ('masculino','femenino','otro','prefiero_no_decir')),
    fecha_nacimiento      DATE,
    direccion_principal   TEXT,                                 -- Dirección por defecto del cliente
    ciudad                VARCHAR(100),
    pais                  VARCHAR(100) DEFAULT 'Ecuador',
    password_hash         TEXT         NOT NULL,
    foto_perfil_url       TEXT,
    verificado_correo     BOOLEAN      NOT NULL DEFAULT FALSE,
    token_recuperacion    TEXT,                                 -- Token para restablecer contraseña
    token_expiracion      TIMESTAMP,
    activo                BOOLEAN      NOT NULL DEFAULT TRUE,
    bloqueado             BOOLEAN      NOT NULL DEFAULT FALSE,
    razon_bloqueo         TEXT,                                 -- Motivo del bloqueo (admin lo registra)
    fecha_registro        TIMESTAMP    NOT NULL DEFAULT NOW(),
    ultima_sesion         TIMESTAMP
);

CREATE INDEX idx_usuarios_correo  ON usuarios(correo);
CREATE INDEX idx_usuarios_rol_id  ON usuarios(rol_id);
CREATE INDEX idx_usuarios_cedula  ON usuarios(cedula);


-- ============================================================
-- TABLA: perfiles_tecnicos
-- Campos añadidos: numero_documento, anios_experiencia,
--                  radio_atencion_km, tarifa_base,
--                  tarifa_domicilio, verificado_admin,
--                  documentos_verificados, direccion_taller, motivo_rechazo,
--                  documento_url
-- ============================================================
CREATE TABLE perfiles_tecnicos (
    id                    SERIAL PRIMARY KEY,
    usuario_id            INT            NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion           TEXT,                              -- Presentación personal / bio
    anios_experiencia     SMALLINT       DEFAULT 0,
    disponible            BOOLEAN        NOT NULL DEFAULT FALSE,
    radio_atencion_km     DECIMAL(5,2)   DEFAULT 10.00,     -- Radio máximo de atención a domicilio
    latitud_actual        DECIMAL(10,7),
    longitud_actual       DECIMAL(10,7),
    ultima_ubicacion_ts   TIMESTAMP,
    -- Tarifas del técnico
    tarifa_base           DECIMAL(10,2)  DEFAULT 0.00,      -- Costo mínimo por diagnóstico/visita
    tarifa_domicilio      DECIMAL(10,2)  DEFAULT 0.00,      -- Costo adicional por ir al domicilio
    direccion_taller      TEXT,                              -- Dirección del taller o local del técnico
    latitud_taller        DECIMAL(10,7),                    -- Coordenada del taller del técnico
    longitud_taller       DECIMAL(10,7),                    -- Coordenada del taller del técnico
    moneda                VARCHAR(10)    DEFAULT 'USD',
    -- Métricas
    calificacion_prom     DECIMAL(3,2)   DEFAULT 0.00,
    total_servicios       INT            DEFAULT 0,
    total_cancelaciones   INT            DEFAULT 0,          -- Cancelaciones iniciadas por el técnico
    -- Verificación administrativa
    verificado_admin      BOOLEAN        NOT NULL DEFAULT FALSE,
    documentos_verificados BOOLEAN       NOT NULL DEFAULT FALSE,
    documento_url         TEXT,
    motivo_rechazo        TEXT,                              -- Si admin rechazó la verificación
    fecha_verificacion    TIMESTAMP
);


-- ============================================================
-- TABLA: especialidades
-- ============================================================
CREATE TABLE especialidades (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    descripcion     TEXT,
    imagen_url      TEXT,
    precio_minimo   NUMERIC(10,2) CHECK (precio_minimo IS NULL OR precio_minimo >= 0),
    precio_maximo   NUMERIC(10,2) CHECK (precio_maximo IS NULL OR precio_maximo >= 0),
    horas_minimas   NUMERIC(10,2) CHECK (horas_minimas IS NULL OR horas_minimas >= 0),
    horas_maximas   NUMERIC(10,2) CHECK (horas_maximas IS NULL OR horas_maximas >= 0),
    CONSTRAINT especialidades_precio_rango_check CHECK (
        precio_minimo IS NULL OR precio_maximo IS NULL OR precio_maximo >= precio_minimo
    ),
    CONSTRAINT especialidades_horas_rango_check CHECK (
        horas_minimas IS NULL OR horas_maximas IS NULL OR horas_maximas >= horas_minimas
    )
);

INSERT INTO especialidades (nombre, descripcion, imagen_url, precio_minimo, precio_maximo, horas_minimas, horas_maximas) VALUES
    ('Computadoras y laptops', 'Pantallas, baterias, mantenimiento interno, formateo, lentitud y fallas de encendido.', 'https://img.icons8.com/fluency/96/laptop.png', 20.00, 120.00, 2.00, 24.00),
    ('Celulares y tablets', 'Cambio de display, puertos de carga, baterias, camaras y recuperacion por humedad.', 'https://img.icons8.com/fluency/96/smartphone-tablet.png', 15.00, 180.00, 1.00, 12.00),
    ('Electrodomésticos', 'Lavadoras, microondas, licuadoras, cafeteras y pequenos equipos con fallas electricas o mecanicas.', 'https://img.icons8.com/fluency/96/washing-machine.png', 25.00, 200.00, 4.00, 48.00),
    ('Impresoras y periféricos', 'Atascos, cabezales, red, configuracion, mantenimiento y errores de alimentacion.', 'https://img.icons8.com/fluency/96/printer.png', 18.00, 90.00, 4.00, 24.00),
    ('Redes y conectividad', 'Routers, repetidores, cableado interno, puntos ciegos y optimizacion de cobertura.', 'https://img.icons8.com/fluency/96/router.png', 20.00, 110.00, 2.00, 8.00),
    ('Otros equipos tecnológicos', 'Equipos y casos especiales que requieren diagnostico, configuracion o reparacion personalizada.', 'https://img.icons8.com/fluency/96/electronics.png', 20.00, 150.00, 2.00, 24.00);


-- ============================================================
-- TABLA: tecnico_especialidades
-- ============================================================
CREATE TABLE tecnico_especialidades (
    tecnico_perfil_id  INT NOT NULL REFERENCES perfiles_tecnicos(id) ON DELETE CASCADE,
    especialidad_id    INT NOT NULL REFERENCES especialidades(id)     ON DELETE CASCADE,
    PRIMARY KEY (tecnico_perfil_id, especialidad_id)
);


-- ============================================================
-- TABLA: tipos_equipo
-- ============================================================
CREATE TABLE tipos_equipo (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL UNIQUE,
    especialidad_id INT REFERENCES especialidades(id)
);

INSERT INTO tipos_equipo (nombre, especialidad_id) VALUES
    ('Computadora de escritorio', (SELECT id FROM especialidades WHERE nombre = 'Computadoras y laptops')),
    ('Laptop', (SELECT id FROM especialidades WHERE nombre = 'Computadoras y laptops')),
    ('Celular', (SELECT id FROM especialidades WHERE nombre = 'Celulares y tablets')),
    ('Tablet', (SELECT id FROM especialidades WHERE nombre = 'Celulares y tablets')),
    ('Electrodoméstico', (SELECT id FROM especialidades WHERE nombre = 'Electrodomésticos')),
    ('Impresora', (SELECT id FROM especialidades WHERE nombre = 'Impresoras y periféricos')),
    ('Router / Equipo de red', (SELECT id FROM especialidades WHERE nombre = 'Redes y conectividad')),
    ('Otro', (SELECT id FROM especialidades WHERE nombre = 'Otros equipos tecnológicos'));


-- ============================================================
-- TABLA: estados_servicio
-- ============================================================
CREATE TABLE estados_servicio (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO estados_servicio (nombre) VALUES
    ('solicitado'),       -- 1: cliente creó la solicitud
    ('asignado'),         -- 2: reservado para asignaciones administrativas
    ('en_camino'),        -- 3: técnico se desplaza
    ('en_reparacion'),    -- 4: reparación en curso
    ('finalizado'),       -- 5: servicio completado
    ('cancelado'),        -- 6: cancelado por cliente, técnico o admin
    ('cotizacion_inicial_enviada'), -- 7: técnico envió aproximado inicial
    ('aceptado'),         -- 8: cliente aceptó la cotización inicial
    ('pendiente_pago'),   -- 9: reparación terminada, esperando pago
    ('pago_enviado');     -- 10: cliente reportó el pago, pendiente validación técnica


-- ============================================================
-- TABLA: motivos_cancelacion
-- Catálogo de razones de cancelación
-- ============================================================
CREATE TABLE motivos_cancelacion (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(150) NOT NULL UNIQUE
);

INSERT INTO motivos_cancelacion (nombre) VALUES
    ('El cliente no estaba disponible'),
    ('Equipo no corresponde al problema descrito'),
    ('El técnico no pudo llegar'),
    ('El cliente decidió no reparar'),
    ('Problema resuelto por cuenta propia'),
    ('Tiempo de espera muy largo'),
    ('Precio no acordado'),
    ('Otro');


-- ============================================================
-- TABLA: servicios
-- Campos añadidos: codigo_servicio, marca_equipo, modelo_equipo,
--                  numero_serie_equipo, prioridad,
--                  tiempo_estimado_horas, codigo_seguimiento,
--                  requiere_repuestos, fecha_compromiso,
--                  motivo_cancelacion_id, cancelado_por,
--                  notas_admin, estado_pago_id, estado_precio,
--                  precios unificados, nota_precio,
--                  observacion_pago, fechas del flujo
-- ============================================================
CREATE TABLE servicios (
    id                      SERIAL PRIMARY KEY,
    -- Identificación única legible para el cliente/técnico
    codigo_servicio         VARCHAR(20)  NOT NULL UNIQUE
                                DEFAULT ('SRV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(CAST(nextval('servicios_id_seq') AS TEXT), 5, '0')),
    cliente_id              INT          NOT NULL REFERENCES usuarios(id),
    tecnico_id              INT                   REFERENCES usuarios(id),
    tipo_equipo_id          INT          NOT NULL REFERENCES tipos_equipo(id),
    estado_id               INT          NOT NULL REFERENCES estados_servicio(id) DEFAULT 1,
    -- Descripción del problema
    descripcion_problema    TEXT         NOT NULL,
    -- Datos del equipo
    marca_equipo            VARCHAR(100),
    modelo_equipo           VARCHAR(100),
    numero_serie_equipo     VARCHAR(100),
    -- Modalidad y ubicación
    modalidad               VARCHAR(20)  NOT NULL CHECK (modalidad IN ('domicilio', 'taller')),
    direccion               TEXT,
    referencia_direccion    TEXT,
    latitud                 DECIMAL(10,7),
    longitud                DECIMAL(10,7),
    -- Prioridad
    prioridad               VARCHAR(20)  NOT NULL DEFAULT 'normal'
                                CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    -- Pago y precio
    estado_pago_id          INT          NOT NULL DEFAULT 1,
    estado_precio           VARCHAR(20)  NOT NULL DEFAULT 'sin_cotizar'
                                CHECK (estado_precio IN ('sin_cotizar','estimado','aceptado_inicial','final','pagado')),
    -- Precios del servicio
    precio_diagnostico      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    precio_mano_obra        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    precio_repuestos        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    precio_domicilio        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    precio_total            DECIMAL(10,2)
        GENERATED ALWAYS AS (
            COALESCE(precio_diagnostico, 0) +
            COALESCE(precio_mano_obra, 0) +
            COALESCE(precio_repuestos, 0) +
            COALESCE(precio_domicilio, 0)
        ) STORED,
    precio_acordado         DECIMAL(10,2),
    fecha_cotizacion        TIMESTAMP,
    fecha_aceptacion_precio TIMESTAMP,
    nota_precio             TEXT,
    observacion_pago             TEXT,
    -- Logística
    requiere_repuestos      BOOLEAN      NOT NULL DEFAULT FALSE,
    tiempo_estimado_horas   DECIMAL(5,1),
    fecha_compromiso        TIMESTAMP,
    -- Fechas del ciclo de vida
    fecha_solicitud         TIMESTAMP    NOT NULL DEFAULT NOW(),
    fecha_revision          TIMESTAMP,
    fecha_asignacion        TIMESTAMP,
    fecha_en_camino         TIMESTAMP,
    fecha_inicio_reparacion TIMESTAMP,
    fecha_fin_reparacion    TIMESTAMP,
    fecha_finalizacion      TIMESTAMP,
    fecha_pago              TIMESTAMP,
    fecha_cancelacion       TIMESTAMP,
    -- Cancelación
    motivo_cancelacion_id   INT          REFERENCES motivos_cancelacion(id),
    cancelado_por           INT          REFERENCES usuarios(id),
    detalle_cancelacion     TEXT,
    -- Notas
    notas_tecnico           TEXT,
    notas_admin             TEXT,
    asignado_por_admin      BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_servicios_cliente_id     ON servicios(cliente_id);
CREATE INDEX idx_servicios_tecnico_id     ON servicios(tecnico_id);
CREATE INDEX idx_servicios_estado_id      ON servicios(estado_id);
CREATE INDEX idx_servicios_estado_pago_id ON servicios(estado_pago_id);
CREATE INDEX idx_servicios_fecha          ON servicios(fecha_solicitud);
CREATE INDEX idx_servicios_codigo         ON servicios(codigo_servicio);
CREATE INDEX idx_servicios_prioridad      ON servicios(prioridad);


-- ============================================================
-- TABLA: repuestos_servicio
-- Detalle de repuestos usados en una reparación
-- ============================================================
CREATE TABLE repuestos_servicio (
    id              SERIAL PRIMARY KEY,
    servicio_id     INT           NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    nombre          VARCHAR(150)  NOT NULL,              -- Ej: "Pantalla LCD 6.1 pulgadas"
    cantidad        SMALLINT      NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal        DECIMAL(10,2)
                        GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    proveedor       VARCHAR(150),                        -- Dónde se consiguió el repuesto
    garantia_dias   INT           DEFAULT 0              -- Garantía del repuesto en días
);


-- ============================================================
-- TABLA: historial_estados_servicio
-- ============================================================
CREATE TABLE historial_estados_servicio (
    id           SERIAL PRIMARY KEY,
    servicio_id  INT       NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    estado_id    INT       NOT NULL REFERENCES estados_servicio(id),
    cambiado_por INT                REFERENCES usuarios(id),
    fecha        TIMESTAMP NOT NULL DEFAULT NOW(),
    observacion  TEXT
);

CREATE INDEX idx_historial_servicio_id ON historial_estados_servicio(servicio_id);


-- ============================================================
-- TABLA: estados_pago
-- Catálogo de estados de pago
-- ============================================================
CREATE TABLE estados_pago (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO estados_pago (nombre) VALUES
    ('pendiente'),
    ('parcial'),
    ('pagado'),
    ('reembolsado'),
    ('fallido');

ALTER TABLE servicios
    ADD CONSTRAINT servicios_estado_pago_id_fkey
    FOREIGN KEY (estado_pago_id) REFERENCES estados_pago(id);


-- ============================================================
-- TABLA: pagos
-- Registro de transacciones de pago por servicio
-- Campos: metodo_pago, referencia_transaccion, estado_pago,
--         monto, moneda, comprobante_url, pagado_en
-- ============================================================
CREATE TABLE pagos (
    id                    SERIAL PRIMARY KEY,
    servicio_id           INT           NOT NULL REFERENCES servicios(id),
    estado_pago_id        INT           NOT NULL REFERENCES estados_pago(id) DEFAULT 1,
    metodo_pago           VARCHAR(50)   NOT NULL
                              CHECK (metodo_pago IN ('efectivo','transferencia','tarjeta','qr','otro')),
    monto                 DECIMAL(10,2) NOT NULL,
    moneda                VARCHAR(10)   NOT NULL DEFAULT 'USD',
    referencia_transaccion VARCHAR(150),                  -- Número de transacción del banco / pasarela
    comprobante_url       TEXT,                           -- Imagen del comprobante subida
    notas                 TEXT,
    registrado_por        INT           REFERENCES usuarios(id),  -- Quién confirmó el pago
    pagado_en             TIMESTAMP,                      -- Fecha efectiva del pago
    fecha_registro        TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pagos_servicio_id ON pagos(servicio_id);


-- ============================================================
-- TABLA: garantias
-- Garantía otorgada al finalizar un servicio
-- ============================================================
CREATE TABLE garantias (
    id               SERIAL PRIMARY KEY,
    servicio_id      INT       NOT NULL UNIQUE REFERENCES servicios(id),
    descripcion      TEXT      NOT NULL,          -- Qué cubre la garantía
    duracion_dias    INT       NOT NULL DEFAULT 30,
    fecha_inicio     DATE      NOT NULL,
    fecha_fin        DATE      NOT NULL
                         GENERATED ALWAYS AS (fecha_inicio + duracion_dias) STORED,
    activa           BOOLEAN   NOT NULL DEFAULT TRUE,
    observaciones    TEXT
);


-- ============================================================
-- TABLA: archivos_servicio
-- Fotos/videos adjuntos a un servicio (antes, durante, después)
-- ============================================================
CREATE TABLE archivos_servicio (
    id           SERIAL PRIMARY KEY,
    servicio_id  INT          NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    subido_por   INT          NOT NULL REFERENCES usuarios(id),
    tipo         VARCHAR(20)  NOT NULL CHECK (tipo IN ('imagen','video','documento')),
    etapa        VARCHAR(20)  NOT NULL CHECK (etapa IN ('antes','durante','despues','otro')),
    url          TEXT         NOT NULL,
    descripcion  TEXT,
    fecha_subida TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_archivos_servicio_id ON archivos_servicio(servicio_id);


-- ============================================================
-- TABLA: calificaciones
-- ============================================================
CREATE TABLE calificaciones (
    id           SERIAL PRIMARY KEY,
    servicio_id  INT       NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    emisor_id    INT       NOT NULL REFERENCES usuarios(id),
    receptor_id  INT       NOT NULL REFERENCES usuarios(id),
    puntuacion   SMALLINT  NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
    comentario   TEXT,
    visible      BOOLEAN   NOT NULL DEFAULT TRUE,
    fecha        TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT calificaciones_servicio_emisor_unique UNIQUE (servicio_id, emisor_id),
    CONSTRAINT calificaciones_emisor_receptor_check CHECK (emisor_id <> receptor_id)
);

CREATE INDEX idx_calificaciones_receptor ON calificaciones(receptor_id);
CREATE INDEX idx_calificaciones_emisor   ON calificaciones(emisor_id);


-- ============================================================
-- TABLA: mensajes_chat
-- Campos añadidos: tipo_mensaje, archivo_url
-- ============================================================
CREATE TABLE mensajes_chat (
    id           SERIAL PRIMARY KEY,
    servicio_id  INT          NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    remitente_id INT          NOT NULL REFERENCES usuarios(id),
    tipo_mensaje VARCHAR(20)  NOT NULL DEFAULT 'texto'
                     CHECK (tipo_mensaje IN ('texto','imagen','archivo')),
    contenido    TEXT         NOT NULL,               -- Texto o descripción del archivo
    archivo_url  TEXT,                                -- URL del archivo si aplica
    leido        BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_envio  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_servicio_id ON mensajes_chat(servicio_id);
CREATE INDEX idx_chat_remitente   ON mensajes_chat(remitente_id);


-- ============================================================
-- TABLA: notificaciones
-- Campos añadidos: tipo, canal, url_accion
-- ============================================================
CREATE TABLE notificaciones (
    id           SERIAL PRIMARY KEY,
    usuario_id   INT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    servicio_id  INT                   REFERENCES servicios(id) ON DELETE SET NULL,
    tipo         VARCHAR(50)  NOT NULL DEFAULT 'info'
                     CHECK (tipo IN ('info','alerta','exito','error')),
    canal        VARCHAR(20)  NOT NULL DEFAULT 'interna'
                     CHECK (canal IN ('interna','email','sms','push')),
    titulo       VARCHAR(150) NOT NULL,
    mensaje      TEXT         NOT NULL,
    url_accion   TEXT,                                -- Deep link o ruta al que redirige
    leida        BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_usuario_id ON notificaciones(usuario_id);
CREATE INDEX idx_notif_leida      ON notificaciones(usuario_id, leida);


-- ============================================================
-- TABLA: dispositivos_push
-- Tokens de dispositivos para notificaciones push (FCM/APNs)
-- ============================================================
CREATE TABLE dispositivos_push (
    id           SERIAL PRIMARY KEY,
    usuario_id   INT          NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token        TEXT         NOT NULL UNIQUE,
    plataforma   VARCHAR(20)  NOT NULL CHECK (plataforma IN ('android','ios','web')),
    activo       BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_push_usuario_id ON dispositivos_push(usuario_id);


-- ============================================================
-- TABLA: zonas_cobertura
-- Zonas geográficas donde el sistema opera
-- ============================================================
CREATE TABLE zonas_cobertura (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(150)  NOT NULL,               -- Ej: "Ambato Centro", "Quito Norte"
    ciudad      VARCHAR(100)  NOT NULL,
    provincia   VARCHAR(100),
    pais        VARCHAR(100)  DEFAULT 'Ecuador',
    activa      BOOLEAN       NOT NULL DEFAULT TRUE
);

INSERT INTO zonas_cobertura (nombre, ciudad, provincia, pais, activa) VALUES
    ('Centro', 'Cobertura general', NULL, 'Ecuador', TRUE),
    ('Norte', 'Cobertura general', NULL, 'Ecuador', TRUE),
    ('Sur', 'Cobertura general', NULL, 'Ecuador', TRUE),
    ('Oeste y periferia', 'Cobertura general', NULL, 'Ecuador', TRUE),
    ('Atencion en taller y domicilio', 'Cobertura general', NULL, 'Ecuador', TRUE);


-- ============================================================
-- TABLA: configuracion_sistema
-- Parámetros globales editables por el admin
-- ============================================================
CREATE TABLE configuracion_sistema (
    clave       VARCHAR(100) PRIMARY KEY,
    valor       TEXT         NOT NULL,
    descripcion TEXT,
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
    ('tarifa_minima_servicio',     '5.00',   'Precio mínimo cobrable por cualquier servicio (USD)'),
    ('radio_sondeo_km',            '15',     'Radio en km para buscar técnicos cercanos al cliente'),
    ('tiempo_expiracion_solicitud','30',     'Minutos antes de que una solicitud sin técnico expire'),
    ('comision_plataforma_pct',    '10',     'Porcentaje de comisión que cobra la plataforma (%)'),
    ('max_cancelaciones_tecnico',  '5',      'Cancelaciones máximas antes de suspender al técnico'),
    ('dias_garantia_defecto',      '30',     'Días de garantía por defecto al finalizar servicio'),
    ('zona_horaria',               '-05:00', 'Zona horaria global del sistema (GMT-5 por defecto)'),
    ('moneda_sistema',             'USD',    'Moneda principal del sistema'),
    ('app_nombre',                 'RepaTech','Nombre de la plataforma'),
    ('contacto_correo',            'soporte@techrescue.app', 'Correo público de contacto'),
    ('contacto_telefono',          '+57 300 000 0000', 'Teléfono público de contacto'),
    ('contacto_instagram',         '@techrescue.app', 'Cuenta pública de Instagram'),
    ('contacto_instagram_url',     'https://instagram.com/techrescue.app', 'URL pública de Instagram'),
    ('contacto_linkedin',          'TechRescue', 'Nombre público en LinkedIn'),
    ('contacto_linkedin_url',      'https://linkedin.com/company/techrescue', 'URL pública de LinkedIn');


-- ============================================================
-- VISTAS
-- ============================================================

-- v_tecnicos_disponibles: sondeo con tarifas incluidas
CREATE VIEW v_tecnicos_disponibles AS
SELECT
    u.id                       AS usuario_id,
    u.nombre,
    u.apellido,
    u.foto_perfil_url,
    u.telefono,
    u.ciudad,
    pt.latitud_actual,
    pt.longitud_actual,
    pt.direccion_taller,
    pt.latitud_taller,
    pt.longitud_taller,
    pt.ultima_ubicacion_ts,
    pt.calificacion_prom,
    pt.total_servicios,
    pt.anios_experiencia,
    pt.tarifa_base,
    pt.tarifa_domicilio,
    pt.moneda,
    pt.radio_atencion_km,
    STRING_AGG(e.nombre, ', ') AS especialidades
FROM usuarios u
JOIN perfiles_tecnicos      pt  ON pt.usuario_id      = u.id
JOIN tecnico_especialidades te  ON te.tecnico_perfil_id = pt.id
JOIN especialidades         e   ON e.id                = te.especialidad_id
WHERE u.activo            = TRUE
  AND u.bloqueado         = FALSE
  AND pt.disponible       = TRUE
  AND pt.verificado_admin = TRUE
GROUP BY u.id, u.nombre, u.apellido, u.foto_perfil_url, u.telefono, u.ciudad,
         pt.latitud_actual, pt.longitud_actual, pt.direccion_taller, pt.latitud_taller, pt.longitud_taller, pt.ultima_ubicacion_ts,
         pt.calificacion_prom, pt.total_servicios, pt.anios_experiencia,
         pt.tarifa_base, pt.tarifa_domicilio, pt.moneda, pt.radio_atencion_km;


-- v_resumen_servicios: para reportes y estadísticas del admin
CREATE VIEW v_resumen_servicios AS
SELECT
    s.id                                     AS servicio_id,
    s.codigo_servicio,
    s.fecha_solicitud,
    s.fecha_finalizacion,
    s.modalidad,
    s.prioridad,
    te.nombre                                AS tipo_equipo,
    es.nombre                                AS estado,
    uc.nombre || ' ' || uc.apellido          AS cliente,
    ut.nombre || ' ' || ut.apellido          AS tecnico,
    s.estado_precio,
    s.precio_diagnostico,
    s.precio_mano_obra,
    s.precio_repuestos,
    s.precio_domicilio,
    s.precio_total,
    s.precio_acordado,
    p.metodo_pago,
    ep_servicio.nombre                       AS estado_pago,
    c.puntuacion,
    s.asignado_por_admin,
    mc.nombre                                AS motivo_cancelacion
FROM servicios s
JOIN tipos_equipo        te ON te.id = s.tipo_equipo_id
JOIN estados_servicio    es ON es.id = s.estado_id
JOIN estados_pago   ep_servicio ON ep_servicio.id = s.estado_pago_id
JOIN usuarios            uc ON uc.id = s.cliente_id
LEFT JOIN usuarios       ut ON ut.id = s.tecnico_id
LEFT JOIN calificaciones  c ON c.servicio_id  = s.id
LEFT JOIN pagos           p ON p.servicio_id  = s.id
LEFT JOIN motivos_cancelacion mc ON mc.id     = s.motivo_cancelacion_id;


-- v_ingresos_tecnicos: resumen de ingresos por técnico
CREATE VIEW v_ingresos_tecnicos AS
SELECT
    u.id                                          AS tecnico_id,
    u.nombre || ' ' || u.apellido                AS tecnico,
    COUNT(s.id)                                   AS total_servicios,
    SUM(s.precio_total)                           AS ingresos_brutos,
    SUM(s.precio_total) * (
        SELECT valor::DECIMAL FROM configuracion_sistema
        WHERE clave = 'comision_plataforma_pct'
    ) / 100                                       AS comision_plataforma,
    SUM(s.precio_total) * (
        1 - (SELECT valor::DECIMAL FROM configuracion_sistema
             WHERE clave = 'comision_plataforma_pct') / 100
    )                                             AS ingresos_netos,
    pt.calificacion_prom
FROM usuarios u
JOIN perfiles_tecnicos pt ON pt.usuario_id = u.id
JOIN servicios s ON s.tecnico_id = u.id
JOIN estados_servicio es ON es.id = s.estado_id AND es.nombre = 'finalizado'
GROUP BY u.id, u.nombre, u.apellido, pt.calificacion_prom;


-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Trigger: recalcula promedio de calificación del técnico
CREATE OR REPLACE FUNCTION actualizar_calificacion_tecnico()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE perfiles_tecnicos
    SET
        calificacion_prom = (
            SELECT ROUND(AVG(puntuacion)::NUMERIC, 2)
            FROM calificaciones
            WHERE receptor_id = NEW.receptor_id
        ),
        total_servicios = (
            SELECT COUNT(*)
            FROM calificaciones
            WHERE receptor_id = NEW.receptor_id
        )
    WHERE usuario_id = NEW.receptor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_calificacion
AFTER INSERT OR UPDATE ON calificaciones
FOR EACH ROW EXECUTE FUNCTION actualizar_calificacion_tecnico();


-- Trigger: registra en historial cada cambio de estado
CREATE OR REPLACE FUNCTION registrar_historial_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado_id IS DISTINCT FROM NEW.estado_id THEN
        INSERT INTO historial_estados_servicio (servicio_id, estado_id, fecha)
        VALUES (NEW.id, NEW.estado_id, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_estado
AFTER UPDATE OF estado_id ON servicios
FOR EACH ROW EXECUTE FUNCTION registrar_historial_estado();


-- Trigger: al cancelar un servicio incrementa contador del técnico
CREATE OR REPLACE FUNCTION incrementar_cancelaciones_tecnico()
RETURNS TRIGGER AS $$
DECLARE
    v_estado_cancelado INT;
BEGIN
    SELECT id INTO v_estado_cancelado FROM estados_servicio WHERE nombre = 'cancelado';
    IF NEW.estado_id = v_estado_cancelado
       AND OLD.estado_id != v_estado_cancelado
       AND NEW.cancelado_por = NEW.tecnico_id THEN
        UPDATE perfiles_tecnicos
        SET total_cancelaciones = total_cancelaciones + 1
        WHERE usuario_id = NEW.tecnico_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cancelacion_tecnico
AFTER UPDATE OF estado_id ON servicios
FOR EACH ROW EXECUTE FUNCTION incrementar_cancelaciones_tecnico();


-- Trigger: al crear garantía automáticamente al finalizar servicio
-- (El backend puede llamar esto o se inserta manualmente; este trigger
--  registra la fecha_inicio por defecto si no se indica)
CREATE OR REPLACE FUNCTION set_fecha_inicio_garantia()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_inicio IS NULL THEN
        NEW.fecha_inicio := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_garantia_fecha
BEFORE INSERT ON garantias
FOR EACH ROW EXECUTE FUNCTION set_fecha_inicio_garantia();


-- ============================================================
-- DATOS INICIALES: usuario administrador
-- ============================================================
INSERT INTO usuarios (rol_id, nombre, apellido, correo, telefono, password_hash, verificado_correo)
VALUES (
    (SELECT id FROM roles WHERE nombre = 'admin'),
    'Administrador',
    'Sistema',
    'admin@repatech.com',
    '0999999999',
    '$2b$12$placeholder_hash_bcrypt',  -- Reemplazar con hash bcrypt real
    TRUE
);
