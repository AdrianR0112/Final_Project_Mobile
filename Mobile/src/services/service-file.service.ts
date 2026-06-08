import { apiRequest } from '../api/client';

export function getServiceFiles(serviceId: number) {
  return apiRequest(`/service-files/services/${serviceId}`);
}

export function uploadServiceFile(
  serviceId: number,
  payload: {
    archivo?: { uri: string; name: string; type: string };
    tipo?: string;
    etapa?: string;
    descripcion?: string;
    url?: string;
  },
) {
  const formData = new FormData();

  if (payload.archivo) {
    formData.append('archivo', payload.archivo as unknown as Blob);
  }

  if (payload.tipo) {
    formData.append('tipo', payload.tipo);
  }

  if (payload.etapa) {
    formData.append('etapa', payload.etapa);
  }

  if (payload.descripcion) {
    formData.append('descripcion', payload.descripcion);
  }

  if (payload.url) {
    formData.append('url', payload.url);
  }

  return apiRequest(`/service-files/services/${serviceId}`, {
    method: 'POST',
    body: formData,
  });
}

export function deleteServiceFile(fileId: number) {
  return apiRequest(`/service-files/${fileId}`, {
    method: 'DELETE',
  });
}
