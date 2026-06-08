# Backend - RepaTech

API REST + WebSockets para la plataforma de reparación tecnológica on-demand.

## Requisitos

- **Node.js** 18+
- **Docker** + Docker Compose
- **npm**

## Configuración inicial

```bash
# 1. Clonar el proyecto y entrar al backend
cd Backend

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Instalar dependencias
npm install
```

## Base de datos

La DB se levanta con Docker. Los scripts en `database/` se ejecutan automáticamente al iniciar el contenedor por primera vez:

| Archivo | Qué contiene |
|---------|-------------|
| `schema.sql` | Tablas, vistas, funciones, triggers y catálogos (roles, especialidades, estados, etc.) |
| `seed.sql` | Datos de prueba (usuarios demo, servicio de muestra) |

```bash
# Levantar PostgreSQL
docker compose up -d

# Verificar que está corriendo
docker compose ps
```

> Si la DB ya existe y querés reiniciarla desde cero:
> ```bash
> docker compose down -v
> docker compose up -d
> ```

## Ejecutar el backend

```bash
npm start
# o
npm run dev
```

El servidor corre en `http://localhost:3001`.

## Endpoints principales

| Ruta | Auth | Descripción |
|------|------|-------------|
| `GET /` | No | Health check |
| `POST /api/auth/login` | No | Iniciar sesión |
| `POST /api/auth/register` | No | Registro de usuario |
| `GET /api/public-config` | No | Configuración pública del sistema |
| `GET /api/technicians` | No* | Listar técnicos disponibles |
| `GET /api/users/me` | Sí | Perfil del usuario autenticado |
| `GET /api/services` | Sí | Servicios del usuario |
| `POST /api/services` | Sí | Crear solicitud de servicio |
| `GET /api/chat/:serviceId` | Sí | Mensajes del chat de un servicio |
| `GET /api/notifications` | Sí | Notificaciones del usuario |
| `POST /api/payments` | Sí | Registrar pago |
| `POST /api/ratings` | Sí | Calificar servicio |
| `GET /api/admin/*` | Admin | Panel administrativo |

\* Algunos endpoints de technicians requieren auth para operaciones de escritura.

## WebSockets

Socket.IO en el mismo puerto `3001`. Eventos principales:

- `chat:message` — Enviar/recibir mensajes del chat
- `notification` — Recibir notificaciones en tiempo real
- `location:update` — Actualizar ubicación del técnico

---

## Credenciales de prueba

Al levantar la base de datos por primera vez, `seed.sql` crea los siguientes usuarios:

### Administrador

| Campo | Valor |
|-------|-------|
| Correo | `admin@repatech.com` |
| Contraseña | `admin123` |
| Rol | `admin` |
| Nombre | Administrador Sistema |

### Cliente de prueba

| Campo | Valor |
|-------|-------|
| Correo | `cliente1@demo.com` |
| Contraseña | `cliente123` |
| Rol | `cliente` |
| Nombre | Juan Perez |
| Teléfono | 0991001001 |

### Técnico de prueba

| Campo | Valor |
|-------|-------|
| Correo | `tecnico1@demo.com` |
| Contraseña | `tecnico123` |
| Rol | `tecnico` |
| Nombre | Carlos Gonzalez |
| Teléfono | 0992002002 |
| Especialidad | Celulares y tablets |
| Ubicación | Quito (-0.180653, -78.467838) |
| Perfil | Verificado, disponible |

### Servicio de muestra

| Campo | Valor |
|-------|-------|
| Cliente | Juan Perez |
| Técnico | Carlos Gonzalez |
| Equipo | Celular |
| Problema | Pantalla rota y no enciende |
| Modalidad | Domicilio |
| Dirección | Av. Principal 123, Quito |

---

## Login de prueba

```bash
# Admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"admin@repatech.com","password":"admin123"}'

# Cliente
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"cliente1@demo.com","password":"cliente123"}'

# Técnico
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"tecnico1@demo.com","password":"tecnico123"}'
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3001` | Puerto del servidor |
| `DB_HOST` | `localhost` | Host de PostgreSQL |
| `DB_PORT` | `5433` | Puerto de PostgreSQL |
| `DB_USER` | `postgres` | Usuario de PostgreSQL |
| `DB_PASSWORD` | `postgres` | Contraseña de PostgreSQL |
| `DB_NAME` | `reparaciones_db` | Nombre de la base de datos |
| `JWT_SECRET` | (cambiar) | Secreto para firmar tokens JWT |
| `JWT_EXPIRES_IN` | `7d` | Expiración de tokens JWT |
| `BCRYPT_SALT_ROUNDS` | `12` | Rounds de bcrypt para hash de contraseñas |
