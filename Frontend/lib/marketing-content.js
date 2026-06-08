export const publicNavLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/servicios', label: 'Servicios' },
  { href: '/tecnicos', label: 'Tecnicos' },
  { href: '/sobre-nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

export const serviceMenuLinks = [
  { href: '/servicios', label: 'Catalogo de servicios' },
  { href: '/como-funciona', label: 'Como funciona' },
];

export const workflowSteps = [
  {
    title: 'Solicita el servicio',
    description: 'Describe el equipo, la falla, el lugar de atencion y el horario que mejor te funcione.',
    icon: 'edit_square',
  },
  {
    title: 'Asignamos al tecnico',
    description: 'La plataforma deriva el caso a un tecnico disponible segun especialidad, cobertura y prioridad.',
    icon: 'person_search',
  },
  {
    title: 'Sigue, paga y califica',
    description: 'Recibe actualizaciones, valida la cotizacion final, paga y deja una calificacion al cerrar el trabajo.',
    icon: 'verified',
  },
];

export const detailedWorkflow = [
  {
    title: '1. Solicitud',
    description: 'El cliente registra el tipo de equipo, sintomas, direccion y urgencia para iniciar el caso.',
  },
  {
    title: '2. Asignacion tecnica',
    description: 'Un tecnico compatible revisa la solicitud, confirma disponibilidad y prepara el diagnostico.',
  },
  {
    title: '3. Seguimiento',
    description: 'Durante la reparacion se comparten avances, evidencias, repuestos y cambios de estado.',
  },
  {
    title: '4. Pago',
    description: 'El costo final contempla diagnostico, mano de obra, repuestos y domicilio cuando corresponda.',
  },
  {
    title: '5. Calificacion',
    description: 'Al finalizar, el cliente califica el servicio y el tecnico puede responder para cerrar la experiencia.',
  },
];

export const serviceCatalog = [
  {
    title: 'Laptops y PC',
    description: 'Pantallas, baterias, mantenimiento interno, formateo, lentitud y fallas de encendido.',
    eta: '2 a 24 horas',
    priceRange: '$20 a $120',
    icon: 'laptop_mac',
  },
  {
    title: 'Celulares',
    description: 'Cambio de display, puertos de carga, baterias, camaras y recuperacion por humedad.',
    eta: '1 a 12 horas',
    priceRange: '$15 a $180',
    icon: 'smartphone',
  },
  {
    title: 'Electrodomesticos',
    description: 'Lavadoras, microondas, licuadoras, cafeteras y pequenos equipos con fallas electricas o mecanicas.',
    eta: '4 a 48 horas',
    priceRange: '$25 a $200',
    icon: 'home_repair_service',
  },
  {
    title: 'Tablets',
    description: 'Pantallas partidas, problemas tactiles, conectores, carga y actualizaciones de sistema.',
    eta: '2 a 24 horas',
    priceRange: '$20 a $140',
    icon: 'tablet_mac',
  },
  {
    title: 'Consolas',
    description: 'Sobrecalentamiento, lectores, mantenimiento preventivo, controles y errores de firmware.',
    eta: '6 a 48 horas',
    priceRange: '$30 a $160',
    icon: 'sports_esports',
  },
  {
    title: 'TV y Smart devices',
    description: 'Smart TV, streaming boxes, sonido, configuracion de apps y problemas de conectividad.',
    eta: '2 a 24 horas',
    priceRange: '$20 a $130',
    icon: 'tv',
  },
  {
    title: 'Impresoras',
    description: 'Atascos, cabezales, red, configuracion, mantenimiento y errores de alimentacion.',
    eta: '4 a 24 horas',
    priceRange: '$18 a $90',
    icon: 'print',
  },
  {
    title: 'Redes y WiFi',
    description: 'Routers, repetidores, cableado interno, puntos ciegos y optimizacion de cobertura.',
    eta: '2 a 8 horas',
    priceRange: '$20 a $110',
    icon: 'router',
  },
];

export const technicianBenefits = [
  'Recibes solicitudes filtradas por especialidad y zona de cobertura.',
  'Muestras tu perfil profesional, tarifas base y experiencia en un solo lugar.',
  'Gestionas avances, historial, pagos y calificaciones desde la plataforma.',
  'Construyes reputacion con resenas verificadas al finalizar cada servicio.',
];

export const technicianRequirements = [
  'Documento o certificacion para revisar tu perfil.',
  'Experiencia demostrable en al menos una especialidad tecnica.',
  'Disponibilidad para atenciones a domicilio o en taller.',
  'Definicion inicial de cobertura, tarifas y datos de contacto.',
];

export const technicianEarnings = [
  { title: 'Servicios puntuales', detail: 'Ideal para reparaciones rapidas como cambios de bateria, mantenimiento o configuraciones.' },
  { title: 'Casos de mayor valor', detail: 'Incluyen repuestos, trabajos en placa, redes o electrodomesticos con mayor complejidad.' },
  { title: 'Clientes recurrentes', detail: 'Una buena calificacion facilita repetir servicios y fortalecer tu perfil profesional.' },
];

export const companyValues = [
  {
    title: 'Confianza',
    description: 'Validamos perfiles tecnicos y dejamos trazabilidad de cada caso, mensaje y actualizacion.',
  },
  {
    title: 'Garantia',
    description: 'La plataforma centraliza historial, repuestos y cierre del trabajo para respaldar acuerdos.',
  },
  {
    title: 'Rapidez',
    description: 'Priorizamos asignacion agil, seguimiento claro y tiempos estimados visibles desde el inicio.',
  },
];

export const teamMembers = [
  { name: 'Producto', role: 'Define la experiencia de clientes y tecnicos para que pedir soporte sea simple.' },
  { name: 'Tecnologia', role: 'Construye la plataforma web y movil para trazabilidad, seguridad y operacion diaria.' },
  { name: 'Operaciones', role: 'Acompana la aprobacion de tecnicos, cobertura y calidad del servicio entregado.' },
];

export const coverageAreas = ['Centro', 'Norte', 'Sur', 'Oeste y periferia', 'Atencion en taller y domicilio'];
