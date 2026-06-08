'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Button from '../common/Button';
import Input from '../common/Input';
import { useLocation } from '../../hooks/useLocation';
import { getServiceTypes, requestService } from '../../services/service.service';

const LocationMapPicker = dynamic(() => import('./LocationMapPicker'), { ssr: false });

export default function ServiceRequestForm() {
  const router = useRouter();
  const { location, isLoading: locationLoading, error: locationError, requestLocation } = useLocation();
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    tipoEquipoId: '',
    marcaEquipo: '',
    modeloEquipo: '',
    numeroSerieEquipo: '',
    descripcionProblema: '',
    modalidad: 'domicilio',
    direccion: '',
    referenciaDireccion: '',
    prioridad: 'normal',
    fechaCompromiso: '',
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  useEffect(() => {
    async function loadServiceTypes() {
      try {
        setLoadingTypes(true);
        const response = await getServiceTypes();
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron cargar los tipos de equipo');
        }

        setServiceTypes(data.serviceTypes || []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoadingTypes(false);
      }
    }

    loadServiceTypes();
  }, []);

  useEffect(() => {
    if (!location) {
      return;
    }

    setSelectedLocation((current) => ({
      lat: location.lat,
      lng: location.lng,
      address: current?.address || '',
    }));
  }, [location]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handlePhotoChange(event) {
    const files = Array.from(event.target.files || []);
    if (photos.length + files.length > 5) {
      setError('Maximo 5 fotos permitidas');
      return;
    }

    const newPhotos = [...photos, ...files].slice(0, 5);
    setPhotos(newPhotos);

    const urls = newPhotos.map((file) => URL.createObjectURL(file));
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls(urls);
  }

  function removePhoto(index) {
    const updatedPhotos = photos.filter((_, i) => i !== index);
    setPhotos(updatedPhotos);

    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setPreviewUrls((current) => current.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (form.modalidad === 'domicilio' && !selectedLocation) {
      setError('Para solicitudes a domicilio debes permitir el acceso a tu ubicacion');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.set('tipoEquipoId', String(Number(form.tipoEquipoId)));
      payload.set('descripcionProblema', form.descripcionProblema);
      payload.set('modalidad', form.modalidad);
      if (form.modalidad === 'domicilio') {
        payload.set('direccion', selectedLocation?.address || form.direccion);
        if (form.referenciaDireccion) payload.set('referenciaDireccion', form.referenciaDireccion);
        payload.set('latitud', String(selectedLocation?.lat ?? ''));
        payload.set('longitud', String(selectedLocation?.lng ?? ''));
      }
      if (form.marcaEquipo) payload.set('marcaEquipo', form.marcaEquipo);
      if (form.modeloEquipo) payload.set('modeloEquipo', form.modeloEquipo);
      if (form.numeroSerieEquipo) payload.set('numeroSerieEquipo', form.numeroSerieEquipo);
      payload.set('prioridad', form.prioridad);
      if (form.fechaCompromiso) payload.set('fechaCompromiso', form.fechaCompromiso);
      photos.forEach((photo) => payload.append('fotos', photo));

      const response = await requestService(payload);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo crear la solicitud');
      }

      setSuccess(data.message || 'Solicitud creada correctamente');
      router.push(`/client/services/${data.serviceRequest?.id}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="surface-card p-6 md:p-8" onSubmit={handleSubmit}>
      <div className="mb-6">
        <h2 className="section-title">Solicitar nuevo servicio</h2>
        <p className="muted-copy mt-2">Describe el problema del equipo y registra la informacion para coordinar atencion a domicilio o en taller.</p>
      </div>
      {error ? <div className="mb-4 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}
      {success ? <div className="mb-4 rounded-2xl bg-[#d8f8e1] px-4 py-3 text-sm text-[#00695c]">{success}</div> : null}

      <section className="space-y-5">
        <h3 className="text-[18px] font-semibold text-[#0b1c30]">Datos del equipo</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tipo de equipo</label>
            <select
              className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none focus:border-[#003ec7]"
              value={form.tipoEquipoId}
              onChange={(event) => updateField('tipoEquipoId', event.target.value)}
              disabled={loadingTypes}
              required
            >
              <option value="">{loadingTypes ? 'Cargando tipos...' : 'Selecciona un tipo de equipo'}</option>
              {serviceTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.nombre}</option>
              ))}
            </select>
            <p className="text-xs text-[#737688]">Ej: Laptop, Celular, Impresora. Elige el que mejor describa tu equipo.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Modalidad de atencion</label>
            <select
              className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none focus:border-[#003ec7]"
              value={form.modalidad}
              onChange={(event) => updateField('modalidad', event.target.value)}
              required
            >
              <option value="domicilio">Domicilio</option>
              <option value="taller">Taller</option>
            </select>
            <p className="text-xs text-[#737688]">Domicilio: el tecnico va a tu casa. Taller: llevas el equipo al local del tecnico.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Marca</label>
            <Input placeholder="Ej: Dell, Samsung, HP" value={form.marcaEquipo} onChange={(event) => updateField('marcaEquipo', event.target.value)} />
            <p className="text-xs text-[#737688]">Fabricante del equipo. Opcional pero ayuda al tecnico.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Modelo</label>
            <Input placeholder="Ej: Inspiron 15, Galaxy S22" value={form.modeloEquipo} onChange={(event) => updateField('modeloEquipo', event.target.value)} />
            <p className="text-xs text-[#737688]">Modelo especifico del equipo si lo conoces.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Numero de serie</label>
            <Input placeholder="Ej: SN-123456789" value={form.numeroSerieEquipo} onChange={(event) => updateField('numeroSerieEquipo', event.target.value)} />
            <p className="text-xs text-[#737688]">Suele estar en una etiqueta debajo o detras del equipo.</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Descripcion del problema</label>
          <textarea
            className="min-h-36 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none transition-colors placeholder:text-[#737688] focus:border-[#003ec7]"
            placeholder="Describe que falla tiene, desde cuando, si suena raro, no enciende, se apaga, etc."
            value={form.descripcionProblema}
            onChange={(event) => updateField('descripcionProblema', event.target.value)}
            required
          />
          <p className="text-xs text-[#737688]">Cuanto mas detalle des, mejor preparado llegara el tecnico. Incluye sintomas, frecuencia y cualquier intento de reparacion previo.</p>
        </div>
      </section>

      {form.modalidad === 'domicilio' ? (
        <section className="mt-5 space-y-4">
          <h3 className="text-[18px] font-semibold text-[#0b1c30]">Ubicacion para la visita</h3>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-[#737688]">
              {selectedLocation
                ? `Ubicacion detectada: ${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`
                : 'Permite el acceso a tu ubicacion para que el tecnico llegue sin confusion.'}
            </div>
              <button type="button" onClick={requestLocation} className="inline-flex items-center justify-center rounded-2xl border border-[#c3c5d9] px-4 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]" disabled={locationLoading}>
                {locationLoading ? 'Detectando...' : 'Detectar mi ubicacion'}
              </button>
          </div>
          {locationError ? <p className="text-sm text-[#93000a]">{locationError}</p> : null}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Direccion</label>
              <Input placeholder="Calle, numero, barrio" value={selectedLocation?.address || form.direccion} onChange={(event) => updateField('direccion', event.target.value)} required />
              <p className="text-xs text-[#737688]">Direccion exacta donde el tecnico debe llegar.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Referencia</label>
              <Input placeholder="Ej: Casa azul, junto a la farmacia" value={form.referenciaDireccion} onChange={(event) => updateField('referenciaDireccion', event.target.value)} />
              <p className="text-xs text-[#737688]">Punto de referencia para ubicar mas facil tu domicilio.</p>
            </div>
          </div>
          <LocationMapPicker value={selectedLocation} onChange={(nextLocation) => {
            setSelectedLocation(nextLocation);
            if (nextLocation?.address) {
              updateField('direccion', nextLocation.address);
            }
          }} />
        </section>
      ) : null}

      {form.modalidad === 'taller' ? <p className="mt-5 text-sm text-[#737688]">Para modalidad taller no se requiere ubicacion. El tecnico te indicara la direccion de su local.</p> : null}

      <section className="mt-5 space-y-5">
        <h3 className="text-[18px] font-semibold text-[#0b1c30]">Preferencias y fotos</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Prioridad</label>
            <select
              className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none focus:border-[#003ec7]"
              value={form.prioridad}
              onChange={(event) => updateField('prioridad', event.target.value)}
            >
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
            <p className="text-xs text-[#737688]">Indica que tan urgente es la reparacion para ti.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Fecha deseada</label>
            <Input type="date" value={form.fechaCompromiso} onChange={(event) => updateField('fechaCompromiso', event.target.value)} />
            <p className="text-xs text-[#737688]">Fecha en la que prefieres que se realice el servicio.</p>
          </div>
        </div>

        <div className="space-y-4 rounded-[28px] border border-[#d8dbeb] bg-white p-4 md:p-5">
          <div>
            <h3 className="text-[16px] font-semibold text-[#0b1c30]">Fotos del equipo o falla</h3>
            <p className="mt-1 text-sm text-[#434656]">Adjunta hasta 5 fotos mostrando el estado del equipo o la falla que necesita reparacion.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {previewUrls.map((url, index) => (
              <div key={url} className="relative h-24 w-24 overflow-hidden rounded-2xl border border-[#d8dbeb]">
                <img src={url} alt={`Foto ${index + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => removePhoto(index)} className="absolute right-1 top-1 inline-flex rounded-full bg-[#0b1c30]/60 p-0.5 text-white hover:bg-[#0b1c30]/80">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            ))}
            {photos.length < 5 ? (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#c3c5d9] text-[#737688] transition-colors hover:border-[#003ec7] hover:text-[#003ec7]">
                <span className="material-symbols-outlined text-[28px]">add_a_photo</span>
                <span className="text-xs font-semibold">Agregar</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handlePhotoChange} />
              </label>
            ) : null}
          </div>
          <p className="text-xs text-[#737688]">{photos.length} de 5 fotos seleccionadas. Formatos: JPG, PNG, WEBP.</p>
        </div>
      </section>

      <Button type="submit" className="mt-6" disabled={isSubmitting || loadingTypes}>
        {isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
      </Button>
    </form>
  );
}
