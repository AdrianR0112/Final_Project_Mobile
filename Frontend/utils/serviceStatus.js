export const STATE_LABELS = {
  solicitado: 'Solicitado',
  asignado: 'Asignado a tecnico',
  cotizacion_inicial_enviada: 'Esperando aceptacion del cliente',
  aceptado: 'Cotizacion aceptada por el cliente',
  en_camino: 'Tecnico en camino',
  en_reparacion: 'En reparacion',
  pendiente_pago: 'Pendiente de pago',
  pago_enviado: 'Pago enviado, pendiente validacion',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
};

export function getStateLabel(state) {
  return STATE_LABELS[state] || String(state || '').replaceAll('_', ' ');
}
