export function normalizePublicAuthMessage(message) {
  if (!message) {
    return '';
  }

  if (message.includes('Tu cuenta de tecnico aun no fue aprobada por el administrador')) {
    return 'Tu cuenta tecnica aun no esta habilitada para ingresar.';
  }

  if (message.includes('Debes esperar aprobacion del administrador')) {
    return 'Tu solicitud fue enviada. Cuando tu cuenta este habilitada podras ingresar.';
  }

  if (message.includes('revision administrativa')) {
    return message.replaceAll('revision administrativa', 'revision del perfil');
  }

  if (message.includes('administrador')) {
    return message.replaceAll('administrador', 'equipo de validacion');
  }

  if (message.includes('administracion')) {
    return message.replaceAll('administracion', 'equipo de validacion');
  }

  return message;
}

export function getPasswordValidationMessage(password) {
  const normalizedPassword = String(password || '');

  if (normalizedPassword.length < 7) {
    return 'La contrasena debe tener al menos 7 caracteres';
  }

  if (!/[A-Za-z]/.test(normalizedPassword)) {
    return 'La contrasena debe incluir al menos una letra';
  }

  if (!/\d/.test(normalizedPassword)) {
    return 'La contrasena debe incluir al menos un numero';
  }

  return '';
}
