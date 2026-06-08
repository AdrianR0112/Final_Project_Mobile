# Mobile - RepaTech

App móvil (Expo / React Native) para clientes y técnicos.

## Requisitos

- **Node.js** 18+
- **npm**
- **Expo Go** en el celular (iOS/Android) o emulador
- Backend corriendo y accesible desde la red local

## Configuración

```bash
cd Mobile

# Instalar dependencias
npm install
```

La IP y puerto del backend se configuran en `.env`:

```
EXPO_PUBLIC_API_HOST=192.168.x.x
EXPO_PUBLIC_API_PORT=3001
```

> En emulador Android usar `10.0.2.2` como host (mapea al `localhost` de la PC).
> En dispositivo físico usar la IP local de la PC en la red WiFi.

## Ejecutar

```bash
# Iniciar Expo
npx expo start
```

Luego escanear el QR con Expo Go o presionar `a` (Android) / `i` (iOS) para abrir en emulador.

## Pantallas principales

### Cliente
- Solicitar reparación (seleccionar tipo de equipo, describir problema, ubicación)
- Ver técnicos cercanos en mapa
- Seguir estado del servicio
- Chat con el técnico
- Calificar servicio
- Ver garantías

### Técnico
- Activar/desactivar disponibilidad
- Recibir y aceptar solicitudes
- Actualizar ubicación en tiempo real
- Gestionar estados del servicio (en camino, reparación, cotización, etc.)
- Chat con el cliente
- Ver historial de servicios e ingresos

## Credenciales de prueba

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Admin | `admin@repatech.com` | `admin123` |
| Cliente | `cliente1@demo.com` | `cliente123` |
| Técnico | `tecnico1@demo.com` | `tecnico123` |
