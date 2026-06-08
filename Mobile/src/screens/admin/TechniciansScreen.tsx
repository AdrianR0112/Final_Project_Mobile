import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
  getTechnicians,
  approveTechnician,
  deleteUser,
  updateTechnician,
} from '../../services/admin.service';
import { getSpecialties } from '../../services/technician.service';
import { colors } from '../../theme';
import Button from '../../components/Button';
import Input from '../../components/Input';
import LoadingSpinner from '../../components/LoadingSpinner';

interface TechnicianProfile {
  descripcion: string;
  aniosExperiencia: number;
  radioAtencionKm: number;
  tarifaBase: number;
  tarifaDomicilio: number;
  direccionTaller: string;
  moneda: string;
}

interface Technician {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  especialidades?: string;
  disponible: boolean;
  aprobado?: boolean;
  verificado?: boolean;
  perfil?: TechnicianProfile;
}

export default function TechniciansScreen() {
  const { logout } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTechId, setRejectTechId] = useState<number | null>(null);
  const [motivoRechazoText, setMotivoRechazoText] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);
  const [specialties, setSpecialties] = useState<{ id: number; nombre: string }[]>([]);
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<number[]>([]);

  async function loadTechnicians() {
    try {
      const response = await getTechnicians();
      const data = await response.json();
      setTechnicians(data.tecnicos || data.technicians || data || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadTechnicians();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadTechnicians();
    setRefreshing(false);
  }

  async function handleApprove(techId: number, approve: boolean, motivoRechazo?: string) {
    try {
      await approveTechnician(techId, { approve, motivoRechazo });
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === techId ? { ...t, aprobado: approve, verificado: approve } : t
        )
      );
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la aprobación');
    }
  }

  function handleDelete(techId: number) {
    Alert.alert('Eliminar técnico', '¿Estás seguro de eliminar este técnico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteUser(techId);
            setTechnicians((prev) => prev.filter((t) => t.id !== techId));
          } catch {
            Alert.alert('Error', 'No se pudo eliminar el técnico');
          }
        },
      },
    ]);
  }

  async function openEditModal(tech: Technician) {
    setEditingTech(tech);
    setEditForm({
      descripcion: tech.perfil?.descripcion || '',
      aniosExperiencia: tech.perfil?.aniosExperiencia || 0,
      radioAtencionKm: tech.perfil?.radioAtencionKm || 0,
      tarifaBase: tech.perfil?.tarifaBase || 0,
      tarifaDomicilio: tech.perfil?.tarifaDomicilio || 0,
      direccionTaller: tech.perfil?.direccionTaller || '',
      moneda: tech.perfil?.moneda || 'MXN',
      documentoUrl: (tech as any).documentoUrl || '',
      latitudTaller: (tech as any).latitudTaller || (tech as any).latitud || 0,
      longitudTaller: (tech as any).longitudTaller || (tech as any).longitud || 0,
      disponible: tech.disponible,
    });
    setSelectedSpecialtyIds((tech as any).specialtyIds || []);
    try {
      const res = await getSpecialties();
      const data = await res.json();
      setSpecialties(data.specialties || data || []);
    } catch {
      setSpecialties([]);
    }
  }

  function closeEditModal() {
    setEditingTech(null);
    setEditForm({});
    setSelectedSpecialtyIds([]);
  }

  async function confirmReject() {
    if (rejectTechId === null) return;
    setRejectLoading(true);
    try {
      await handleApprove(rejectTechId, false, motivoRechazoText || undefined);
      setRejectModalVisible(false);
      setRejectTechId(null);
      setMotivoRechazoText('');
    } catch {
      Alert.alert('Error', 'No se pudo rechazar el técnico');
    } finally {
      setRejectLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!editingTech) return;
    setSaving(true);
    try {
      await updateTechnician(editingTech.id, {
        ...editForm,
        specialtyIds: selectedSpecialtyIds,
      });
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === editingTech.id
            ? {
                ...t,
                perfil: { ...t.perfil, ...editForm } as TechnicianProfile,
                disponible: editForm.disponible ?? t.disponible,
              }
            : t
        )
      );
      closeEditModal();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Técnicos</Text>
          <TouchableOpacity onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={technicians}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No hay técnicos registrados</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{item.nombre} {item.apellido}</Text>
                  <View style={styles.badges}>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: item.disponible
                            ? colors.successSoft
                            : colors.dangerSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: item.disponible ? colors.success : colors.danger },
                        ]}
                      >
                        {item.disponible ? 'Disponible' : 'No disponible'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: item.aprobado || item.verificado
                            ? colors.successSoft
                            : colors.warningSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          {
                            color: item.aprobado || item.verificado
                              ? colors.success
                              : colors.warning,
                          },
                        ]}
                      >
                        {item.aprobado || item.verificado ? 'Verificado' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.cardEmail}>{item.correo}</Text>
                {item.especialidades && (
                  <Text style={styles.cardSpecialty}>{item.especialidades}</Text>
                )}
                <View style={styles.cardActions}>
                  {!(item.aprobado || item.verificado) ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(item.id, true)}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Aprobar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => {
                        setRejectTechId(item.id);
                        setMotivoRechazoText('');
                        setRejectModalVisible(true);
                      }}
                    >
                      <Ionicons name="close-circle" size={18} color="#fff" />
                      <Text style={styles.actionBtnText}>Rechazar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => openEditModal(item)}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>
                      Editar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    <Text style={[styles.actionBtnText, { color: colors.danger }]}>
                      Eliminar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />

        <Modal visible={!!editingTech} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar perfil</Text>
                <TouchableOpacity onPress={closeEditModal}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalBodyContent}
                showsVerticalScrollIndicator={false}
              >
                <Input
                  label="Descripción"
                  value={editForm.descripcion || ''}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, descripcion: t }))}
                  placeholder="Descripción del técnico"
                  multiline
                  numberOfLines={3}
                />
                <Input
                  label="Años de experiencia"
                  value={String(editForm.aniosExperiencia || '')}
                  onChangeText={(t) =>
                    setEditForm((f) => ({ ...f, aniosExperiencia: Number(t) || 0 }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Input
                  label="Radio de atención (km)"
                  value={String(editForm.radioAtencionKm || '')}
                  onChangeText={(t) =>
                    setEditForm((f) => ({ ...f, radioAtencionKm: Number(t) || 0 }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Input
                  label="Tarifa base"
                  value={String(editForm.tarifaBase || '')}
                  onChangeText={(t) =>
                    setEditForm((f) => ({ ...f, tarifaBase: Number(t) || 0 }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Input
                  label="Tarifa a domicilio"
                  value={String(editForm.tarifaDomicilio || '')}
                  onChangeText={(t) =>
                    setEditForm((f) => ({ ...f, tarifaDomicilio: Number(t) || 0 }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Input
                  label="Dirección del taller"
                  value={editForm.direccionTaller || ''}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, direccionTaller: t }))}
                  placeholder="Dirección"
                />
                <Input
                  label="URL Documento"
                  value={editForm.documentoUrl || ''}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, documentoUrl: t }))}
                  placeholder="https://..."
                  autoCapitalize="none"
                />
                <Input
                  label="Latitud del taller"
                  value={String(editForm.latitudTaller || '')}
                  onChangeText={(t) =>
                    setEditForm((f) => ({ ...f, latitudTaller: Number(t) || 0 }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Input
                  label="Longitud del taller"
                  value={String(editForm.longitudTaller || '')}
                  onChangeText={(t) =>
                    setEditForm((f) => ({ ...f, longitudTaller: Number(t) || 0 }))
                  }
                  placeholder="0"
                  keyboardType="numeric"
                />
                <Input
                  label="Moneda"
                  value={editForm.moneda || ''}
                  onChangeText={(t) => setEditForm((f) => ({ ...f, moneda: t }))}
                  placeholder="MXN"
                  autoCapitalize="characters"
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Disponible</Text>
                  <Switch
                    value={editForm.disponible ?? false}
                    onValueChange={(v) => setEditForm((f) => ({ ...f, disponible: v }))}
                    trackColor={{ false: '#d1d5db', true: colors.success }}
                    thumbColor="#fff"
                  />
                </View>
                <Text style={styles.sectionTitle}>Especialidades</Text>
                <View style={styles.specialtiesContainer}>
                  {specialties.map((sp) => {
                    const selected = selectedSpecialtyIds.includes(sp.id);
                    return (
                      <TouchableOpacity
                        key={sp.id}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() =>
                          setSelectedSpecialtyIds((prev) =>
                            selected
                              ? prev.filter((id) => id !== sp.id)
                              : [...prev, sp.id]
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {sp.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Button
                  title="Guardar"
                  onPress={handleSaveProfile}
                  loading={saving}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>

        <Modal visible={rejectModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.rejectModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Motivo de rechazo</Text>
                <TouchableOpacity
                  onPress={() => {
                    setRejectModalVisible(false);
                    setRejectTechId(null);
                    setMotivoRechazoText('');
                  }}
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              <View style={styles.rejectModalBody}>
                <Input
                  label="Motivo"
                  value={motivoRechazoText}
                  onChangeText={setMotivoRechazoText}
                  placeholder="Explica por qué se rechaza al técnico"
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.rejectActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setRejectModalVisible(false);
                      setRejectTechId(null);
                      setMotivoRechazoText('');
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.confirmRejectBtn, !motivoRechazoText.trim() && styles.btnDisabled]}
                    onPress={confirmReject}
                    disabled={rejectLoading || !motivoRechazoText.trim()}
                  >
                    <Text style={styles.confirmRejectBtnText}>
                      {rejectLoading ? 'Rechazando...' : 'Confirmar rechazo'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  list: { padding: 16, paddingBottom: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBody: { flex: 1 },
  cardHeader: { marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 6 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardEmail: { fontSize: 13, color: '#6b7280', marginBottom: 2 },
  cardSpecialty: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  approveBtn: { backgroundColor: colors.success },
  rejectBtn: { backgroundColor: colors.warning },
  editBtn: { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border },
  deleteBtn: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: '#f5c2bd' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 16 },
  modalBodyContent: { paddingBottom: 32 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabel: { fontSize: 14, fontWeight: '500', color: '#111827' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginTop: 8, marginBottom: 8 },
  specialtiesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextSelected: { color: colors.primary, fontWeight: '600' },
  rejectModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 24,
    alignSelf: 'center',
    width: '90%',
  },
  rejectModalBody: { padding: 16, paddingBottom: 24 },
  rejectActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  confirmRejectBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.danger,
  },
  confirmRejectBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnDisabled: { opacity: 0.5 },
});
