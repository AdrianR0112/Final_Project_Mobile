'use client';

import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { deleteAdminUser, getAdminUsers, updateAdminUser, updateAdminUserStatus } from '../../services/admin.service';

const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  correo: '',
  telefono: '',
  cedula: '',
  direccionPrincipal: '',
  ciudad: '',
  pais: '',
};

function formatRole(role) {
  return role === 'tecnico' ? 'Tecnico' : role === 'cliente' ? 'Cliente' : role === 'admin' ? 'Admin' : 'Sin rol';
}

function formatStatus(user) {
  if (user.bloqueado) {
    return 'Bloqueado';
  }

  if (user.activo === false) {
    return 'Inactivo';
  }

  return 'Activo';
}

function fullName(user) {
  return [user.nombre, user.apellido].filter(Boolean).join(' ').trim() || `Usuario #${user.id}`;
}

export default function UserTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ search: '', role: '', activo: '', bloqueado: '' });
  const [selectedUser, setSelectedUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);

  async function loadUsers(nextFilters = filters) {
    try {
      setLoading(true);
      setError('');
      const params = {
        search: nextFilters.search || undefined,
        role: nextFilters.role || undefined,
        activo: nextFilters.activo === '' ? undefined : nextFilters.activo,
        bloqueado: nextFilters.bloqueado === '' ? undefined : nextFilters.bloqueado,
        limit: 100,
      };
      const response = await getAdminUsers(params);
      const data = await response.json().catch(() => ({ users: [] }));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar los usuarios');
      }

      setRows(data.users || []);
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openEditModal(user) {
    setSelectedUser(user);
    setForm({
      nombre: user.nombre || '',
      apellido: user.apellido || '',
      correo: user.correo || '',
      telefono: user.telefono || '',
      cedula: user.cedula || '',
      direccionPrincipal: user.direccionPrincipal || '',
      ciudad: user.ciudad || '',
      pais: user.pais || '',
    });
    setMessage('');
    setError('');
  }

  function updateLocalUser(updatedUser) {
    setRows((current) => current.map((item) => (item.id === updatedUser.id ? updatedUser : item)));
    setSelectedUser(updatedUser);
  }

  async function handleSaveUser(event) {
    event.preventDefault();

    if (!selectedUser) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const response = await updateAdminUser(selectedUser.id, form);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar el usuario');
      }

      updateLocalUser(data.user);
      setMessage(data.message || 'Usuario actualizado correctamente');
    } catch (saveError) {
      setError(saveError.message || 'No se pudo actualizar el usuario');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusUpdate(user, payload) {
    try {
      setUpdatingStatusId(user.id);
      setError('');
      setMessage('');

      const response = await updateAdminUserStatus(user.id, payload);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar el estado');
      }

      setRows((current) => current.map((item) => (item.id === user.id ? data.user : item)));
      if (selectedUser?.id === user.id) {
        setSelectedUser(data.user);
      }
      setMessage(data.message || 'Estado actualizado correctamente');
    } catch (statusError) {
      setError(statusError.message || 'No se pudo actualizar el estado');
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleDeleteUser(user) {
    const confirmed = window.confirm(`Se eliminara por completo la cuenta de ${fullName(user)} y toda su informacion relacionada. Esta accion no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    try {
      setDeletingUserId(user.id);
      setError('');
      setMessage('');

      const response = await deleteAdminUser(user.id);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar el usuario');
      }

      setRows((current) => current.filter((item) => item.id !== user.id));
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
      }
      setMessage(data.message || 'Usuario eliminado correctamente');
    } catch (deleteError) {
      setError(deleteError.message || 'No se pudo eliminar el usuario');
    } finally {
      setDeletingUserId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="surface-card p-5">
        <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
          <Input placeholder="Buscar por nombre, correo o telefono" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          <select className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
            <option value="">Todos los roles</option>
            <option value="cliente">Clientes</option>
            <option value="tecnico">Tecnicos</option>
            <option value="admin">Admins</option>
          </select>
          <select className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" value={filters.activo} onChange={(event) => setFilters((current) => ({ ...current, activo: event.target.value }))}>
            <option value="">Activo o inactivo</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          <select className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" value={filters.bloqueado} onChange={(event) => setFilters((current) => ({ ...current, bloqueado: event.target.value }))}>
            <option value="">Bloqueado o no</option>
            <option value="true">Bloqueados</option>
            <option value="false">No bloqueados</option>
          </select>
          <Button className="w-full" onClick={() => loadUsers(filters)}>Aplicar filtros</Button>
        </div>
      </div>

      {message ? <div className="rounded-2xl bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#ba1a1a]">{error}</div> : null}

      <div className="surface-card overflow-x-auto">
        {loading ? (
          <div className="px-6 py-8 text-center text-[#737688]">Cargando usuarios...</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#737688]">No se encontraron usuarios con los filtros actuales.</div>
        ) : (
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#eff4ff] text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656]">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Cuenta</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#c3c5d9] bg-white align-top text-sm text-[#0b1c30]">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{fullName(row)}</p>
                    <p className="mt-1 text-xs text-[#737688]">{row.correo}</p>
                    {row.cedula ? <p className="mt-1 text-xs text-[#737688]">Cedula: {row.cedula}</p> : null}
                  </td>
                  <td className="px-6 py-4">{formatRole(row.rol?.nombre)}</td>
                  <td className="px-6 py-4 text-[#434656]">{row.telefono || 'Sin telefono'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.bloqueado ? 'bg-[#ffdad6] text-[#ba1a1a]' : row.activo === false ? 'bg-[#fff4cc] text-[#7a5b00]' : 'bg-[#d7f8ef] text-[#00695c]'}`}>
                      {formatStatus(row)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[#434656]">{row.activo ? 'Habilitada' : 'Desactivada'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" className="rounded-full border border-[#c3c5d9] px-3 py-2 text-xs font-semibold text-[#0b1c30] hover:bg-[#eff4ff]" onClick={() => openEditModal(row)}>Editar</button>
                      <button type="button" disabled={updatingStatusId === row.id} className="rounded-full border border-[#003ec7] px-3 py-2 text-xs font-semibold text-[#003ec7] hover:bg-[#eff4ff] disabled:opacity-70" onClick={() => handleStatusUpdate(row, { activo: !row.activo })}>{row.activo ? 'Desactivar' : 'Activar'}</button>
                      <button type="button" disabled={updatingStatusId === row.id} className="rounded-full bg-[#003ec7] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0052ff] disabled:opacity-70" onClick={() => handleStatusUpdate(row, { bloqueado: !row.bloqueado })}>{row.bloqueado ? 'Desbloquear' : 'Bloquear'}</button>
                      <button type="button" disabled={deletingUserId === row.id} className="rounded-full border border-[#ba1a1a] px-3 py-2 text-xs font-semibold text-[#ba1a1a] hover:bg-[#fff3f1] disabled:opacity-70" onClick={() => handleDeleteUser(row)}>{deletingUserId === row.id ? 'Eliminando...' : 'Eliminar'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title="Editar usuario" widthClassName="max-w-3xl">
        {selectedUser ? (
          <form className="space-y-4" onSubmit={handleSaveUser}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Nombre" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} />
              <Input placeholder="Apellido" value={form.apellido} onChange={(event) => setForm((current) => ({ ...current, apellido: event.target.value }))} />
              <Input placeholder="Correo" type="email" value={form.correo} onChange={(event) => setForm((current) => ({ ...current, correo: event.target.value }))} />
              <Input placeholder="Telefono" value={form.telefono} onChange={(event) => setForm((current) => ({ ...current, telefono: event.target.value }))} />
              <Input placeholder="Cedula" value={form.cedula} onChange={(event) => setForm((current) => ({ ...current, cedula: event.target.value }))} />
              <Input placeholder="Ciudad" value={form.ciudad} onChange={(event) => setForm((current) => ({ ...current, ciudad: event.target.value }))} />
              <Input placeholder="Pais" value={form.pais} onChange={(event) => setForm((current) => ({ ...current, pais: event.target.value }))} />
              <Input placeholder="Direccion principal" value={form.direccionPrincipal} onChange={(event) => setForm((current) => ({ ...current, direccionPrincipal: event.target.value }))} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="rounded-2xl border border-[#c3c5d9] px-5 py-3 text-sm font-semibold text-[#0b1c30] hover:bg-[#eff4ff]" onClick={() => setSelectedUser(null)}>Cerrar</button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
