'use client';

import { useEffect, useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import { sendServiceMessage } from '../../services/chat.service';

export default function MessageInput({ serviceId, onMessageSent }) {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null;

    setFile(selectedFile);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
      return;
    }

    setPreviewUrl('');
  }

  function clearAttachment() {
    setFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!serviceId) {
      setError('ID de servicio no especificado');
      return;
    }
    if (!message.trim() && !file) {
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.set('contenido', message);
      if (file) {
        payload.set('archivo', file);
      }

      const response = await sendServiceMessage(serviceId, payload);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar el mensaje');
      }

      setMessage('');
      clearAttachment();
      if (onMessageSent) {
        onMessageSent(data.messageData || null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card shrink-0 p-4">
      <div className="flex flex-col gap-4">
        {error ? <div className="text-sm text-[#93000a]">{error}</div> : null}
        {file ? (
          <div className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p>Adjunto: <span className="font-semibold text-[#0b1c30]">{file.name}</span></p>
                {previewUrl ? <img src={previewUrl} alt="Vista previa del archivo" className="mt-3 max-h-40 rounded-2xl object-contain" /> : null}
              </div>
              <button type="button" onClick={clearAttachment} className="inline-flex rounded-full p-1 text-[#737688] transition-colors hover:bg-white hover:text-[#0b1c30]">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <Input
            type="text"
            placeholder="Escribe un mensaje"
            className="flex-1"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSubmitting}
          />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#c3c5d9] px-4 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">
            <span className="material-symbols-outlined text-[18px]">attach_file</span>
            Adjuntar
            <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileChange} disabled={isSubmitting} />
          </label>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </div>
    </form>
  );
}
