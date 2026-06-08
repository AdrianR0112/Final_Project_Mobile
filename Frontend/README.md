# Frontend - RepaTech

Panel web (Next.js) con dashboards para cliente, técnico y administrador.

## Requisitos

- **Node.js** 18+
- **npm**
- Backend corriendo en `http://localhost:3001`

## Configuración

```bash
cd Frontend

# Instalar dependencias
npm install
```

La URL del backend se configura en `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

> Si el backend corre en otra IP o puerto, cambiar este valor.

## Ejecutar

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

El frontend corre en `http://localhost:3000`.

## Dashboards

| Ruta | Rol | Descripción |
|------|-----|-------------|
| `/login` | Público | Inicio de sesión |
| `/client` | Cliente | Solicitar servicios, ver estado, chat, calificar |
| `/technician` | Técnico | Gestionar servicios asignados, actualizar estado, chat |
| `/admin` | Admin | Panel de control, gestión de usuarios, reportes |

## Credenciales de prueba

Las mismas del backend:

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Admin | `admin@repatech.com` | `admin123` |
| Cliente | `cliente1@demo.com` | `cliente123` |
| Técnico | `tecnico1@demo.com` | `tecnico123` |
