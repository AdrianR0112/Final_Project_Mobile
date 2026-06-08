import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, Modal, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getUsers, toggleUserStatus, updateUser, deleteUser,
} from '../../services/admin.service';
import { colors } from '../../theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import LoadingSpinner from '../../components/LoadingSpinner';

interface User {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
  rol_nombre?: string;
  activo: boolean;
  bloqueado: boolean;
  cedula?: string;
  ciudad?: string;
  pais?: string;
  direccion_principal?: string;
}

const ROLE_CHIPS = [
  { key: 'todos', label: 'Todos' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'tecnico', label: 'Técnico' },
  { key: 'admin', label: 'Admin' },
] as const;

const EDIT_FIELDS: { key: string; label: string; placeholder: string; keyboardType?: 'email-address' | 'phone-pad' }[] = [
  { key: 'nombre', label: 'Nombre', placeholder: 'Nombre' },
  { key: 'apellido', label: 'Apellido', placeholder: 'Apellido' },
  { key: 'correo', label: 'Correo', placeholder: 'correo@ejemplo.com', keyboardType: 'email-address' },
  { key: 'telefono', label: 'Teléfono', placeholder: 'Teléfono', keyboardType: 'phone-pad' },
  { key: 'cedula', label: 'Cédula', placeholder: 'Cédula' },
  { key: 'ciudad', label: 'Ciudad', placeholder: 'Ciudad' },
  { key: 'pais', label: 'País', placeholder: 'País' },
  { key: 'direccion_principal', label: 'Dirección principal', placeholder: 'Dirección' },
];

function roleBadge(role?: string) {
  if (role === 'admin') return { bg: '#fce7f3', color: '#9d174d', label: 'Admin' };
  if (role === 'tecnico') return { bg: '#ede9fe', color: '#5b21b6', label: 'Técnico' };
  return { bg: '#dbeafe', color: '#1d4ed8', label: 'Cliente' };
}

function pickForm(user: User): Record<string, string> {
  const form: Record<string, string> = {};
  for (const f of EDIT_FIELDS) {
    form[f.key] = String((user as any)[f.key] || '');
  }
  return form;
}

export default function UsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');

  async function loadUsers() {
    try {
      const res = await getUsers();
      const data = await res.json();
      setUsers(data.usuarios || data.users || []);
    } catch { /* */ } finally { setLoading(false); }
  }

  useFocusEffect(useCallback(() => { loadUsers(); }, []));

  async function onRefresh() { setRefreshing(true); await loadUsers(); setRefreshing(false); }

  const filteredUsers = useMemo(() => {
    const s = searchText.toLowerCase().trim();
    return users.filter((u) => {
      if (s) {
        if (
          !(u.nombre || '').toLowerCase().includes(s) &&
          !(u.apellido || '').toLowerCase().includes(s) &&
          !(u.correo || '').toLowerCase().includes(s) &&
          !(u.telefono || '').includes(searchText.trim())
        ) return false;
      }
      if (roleFilter !== 'todos' && (u.rol_nombre || 'cliente') !== roleFilter) return false;
      return true;
    });
  }, [users, searchText, roleFilter]);

  function openEdit(user: User) { setEditingUser(user); setEditForm(pickForm(user)); }
  function closeEdit() { setEditingUser(null); setEditForm({}); }
  function setField(key: string, val: string) { setEditForm((f) => ({ ...f, [key]: val })); }

  async function handleSave() {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, editForm);
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...editForm } : u)));
      closeEdit();
    } catch { Alert.alert('Error', 'No se pudo actualizar el usuario'); }
    finally { setSaving(false); }
  }

  function handleDelete(userId: number) {
    Alert.alert('Eliminar usuario', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteUser(userId); setUsers((prev) => prev.filter((u) => u.id !== userId)); }
        catch { Alert.alert('Error', 'No se pudo eliminar'); }
      }},
    ]);
  }

  async function handleToggleActive(u: User) {
    try {
      await toggleUserStatus(u.id, { activo: !u.activo });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, activo: !u.activo } : x)));
    } catch { Alert.alert('Error', 'No se pudo cambiar el estado'); }
  }

  async function handleToggleBlock(u: User) {
    try {
      await toggleUserStatus(u.id, { bloqueado: !u.bloqueado });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, bloqueado: !u.bloqueado } : x)));
    } catch { Alert.alert('Error', 'No se pudo cambiar el bloqueo'); }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <View style={S.container}>
        {/* Filter bar */}
        <View style={S.filterBar}>
          <View style={S.searchRow}>
            <Ionicons name="search-outline" size={20} color={colors.mutedSoft} />
            <TextInput style={S.searchInput} value={searchText} onChangeText={setSearchText} placeholder="Buscar usuarios..." placeholderTextColor={colors.mutedSoft} />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color={colors.mutedSoft} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.chipRow}>
            {ROLE_CHIPS.map((c) => (
              <TouchableOpacity key={c.key} style={[S.chip, roleFilter === c.key && S.chipActive]} onPress={() => setRoleFilter(c.key)}>
                <Text style={[S.chipText, roleFilter === c.key && S.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* User list */}
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={S.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={S.emptyContainer}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text style={S.emptyText}>No se encontraron usuarios</Text>
            </View>
          }
          renderItem={({ item }) => {
            const rb = roleBadge(item.rol_nombre);
            return (
              <View style={[S.card, !item.activo && S.cardInactive]}>
                <View style={S.cardBody}>
                  <View style={S.cardHeader}>
                    <Text style={S.cardName}>{item.nombre} {item.apellido}</Text>
                    <View style={[S.roleBadge, { backgroundColor: rb.bg }]}>
                      <Text style={[S.roleText, { color: rb.color }]}>{rb.label}</Text>
                    </View>
                  </View>
                  <Text style={S.cardEmail}>{item.correo}</Text>
                  {item.telefono ? <Text style={S.cardPhone}>{item.telefono}</Text> : null}
                  <View style={S.badges}>
                    <View style={[S.statusBadge, { backgroundColor: item.activo ? colors.successSoft : colors.dangerSoft }]}>
                      <Text style={[S.statusBadgeText, { color: item.activo ? colors.success : colors.danger }]}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </Text>
                    </View>
                    {item.bloqueado ? (
                      <View style={[S.statusBadge, { backgroundColor: colors.warningSoft }]}>
                        <Text style={[S.statusBadgeText, { color: colors.warning }]}>Bloqueado</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={S.cardActions}>
                    <TouchableOpacity style={[S.actionBtn, S.editBtn]} onPress={() => openEdit(item)}>
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                      <Text style={[S.actionText, { color: colors.primary }]}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[S.actionBtn, S.deleteBtn]} onPress={() => handleDelete(item.id)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={[S.actionText, { color: colors.danger }]}>Eliminar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[S.actionBtn, { backgroundColor: item.activo ? colors.dangerSoft : colors.successSoft }]}
                      onPress={() => handleToggleActive(item)}
                    >
                      <Ionicons name={item.activo ? 'close-circle-outline' : 'checkmark-circle-outline'} size={16} color={item.activo ? colors.danger : colors.success} />
                      <Text style={[S.actionText, { color: item.activo ? colors.danger : colors.success }]}>
                        {item.activo ? 'Desactivar' : 'Activar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[S.actionBtn, { backgroundColor: item.bloqueado ? colors.successSoft : colors.warningSoft }]}
                      onPress={() => handleToggleBlock(item)}
                    >
                      <Ionicons name={item.bloqueado ? 'lock-open-outline' : 'lock-closed-outline'} size={16} color={item.bloqueado ? colors.success : colors.warning} />
                      <Text style={[S.actionText, { color: item.bloqueado ? colors.success : colors.warning }]}>
                        {item.bloqueado ? 'Desbloquear' : 'Bloquear'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Edit modal */}
        <Modal visible={!!editingUser} animationType="slide" transparent>
          <View style={S.modalOverlay}>
            <View style={S.modalContent}>
              <View style={S.modalHeader}>
                <Text style={S.modalTitle}>Editar usuario</Text>
                <TouchableOpacity onPress={closeEdit}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={S.modalBody} contentContainerStyle={S.modalBodyContent} showsVerticalScrollIndicator={false}>
                {EDIT_FIELDS.map((f) => (
                  <Input
                    key={f.key}
                    label={f.label}
                    value={editForm[f.key] || ''}
                    onChangeText={(t) => setField(f.key, t)}
                    placeholder={f.placeholder}
                    keyboardType={f.keyboardType}
                  />
                ))}
                <Button title="Guardar cambios" onPress={handleSave} loading={saving} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  filterBar: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 12, height: 40, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, marginLeft: 8, paddingVertical: 0 },
  chipRow: { gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, paddingBottom: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardInactive: { opacity: 0.6 },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between' },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '600' },
  cardEmail: { fontSize: 13, color: '#6b7280' },
  cardPhone: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, gap: 4 },
  editBtn: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border },
  deleteBtn: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#f5c2bd' },
  actionText: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 16 },
  modalBodyContent: { paddingBottom: 32 },
});
