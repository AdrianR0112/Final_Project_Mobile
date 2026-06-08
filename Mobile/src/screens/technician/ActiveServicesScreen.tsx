import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getAssignedServiceRequests,
  sendInitialQuote,
  updateAssignedServiceStatus,
  cancelServiceRequest,
} from '../../services/service.service';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../theme';

interface ServiceItem {
  id: number;
  descripcion: string;
  direccion?: string;
  tipo_equipo?: { nombre: string };
  estado_servicio?: { id: number; nombre: string };
  cliente?: { usuario?: { nombre: string; telefono?: string } };
  created_at: string;
}

type ActionEstado = 'asignado' | 'aceptado' | 'en_camino' | 'en_reparacion' | 'pendiente_pago';

const ACTION_CONFIG: Record<ActionEstado, { label: string; nextEstado: string }> = {
  asignado: { label: 'Enviar cotización', nextEstado: '' },
  aceptado: { label: 'En camino', nextEstado: 'en_camino' },
  en_camino: { label: 'En reparación', nextEstado: 'en_reparacion' },
  en_reparacion: { label: 'Pendiente de pago', nextEstado: 'pendiente_pago' },
  pendiente_pago: { label: 'Finalizar', nextEstado: 'finalizado' },
};

export default function ActiveServicesScreen({ navigation }: { navigation: { navigate: (screen: string, params: { id: number }) => void } }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [quoteForm, setQuoteForm] = useState({ precioManoObra: '', precioDomicilio: '', precioDiagnostico: '', notaPrecio: '' });
  const [sendingQuote, setSendingQuote] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  async function loadServices() {
    try {
      const response = await getAssignedServiceRequests();
      const data = await response.json();
      setServices(data.serviceRequests || data.services || []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadServices();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  }

  function openQuoteModal(id: number) {
    setSelectedServiceId(id);
    setQuoteForm({ precioManoObra: '', precioDomicilio: '', precioDiagnostico: '', notaPrecio: '' });
    setQuoteModalVisible(true);
  }

  async function handleSendQuote() {
    if (selectedServiceId === null) return;
    const manoObra = parseFloat(quoteForm.precioManoObra);
    const domicilio = parseFloat(quoteForm.precioDomicilio);
    const diagnostico = parseFloat(quoteForm.precioDiagnostico);

    if (isNaN(manoObra) || isNaN(domicilio) || isNaN(diagnostico)) {
      Alert.alert('Campos requeridos', 'Debes ingresar los tres precios.');
      return;
    }

    setSendingQuote(true);
    try {
      await sendInitialQuote(selectedServiceId, {
        precioManoObra: manoObra,
        precioDomicilio: domicilio,
        precioDiagnostico: diagnostico,
        notaPrecio: quoteForm.notaPrecio || undefined,
      });
      setQuoteModalVisible(false);
      await loadServices();
    } catch {
      Alert.alert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setSendingQuote(false);
    }
  }

  function setQuoteField(field: keyof typeof quoteForm, value: string) {
    setQuoteForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleStatusUpdate(id: number, estado: string) {
    setActionLoading(id);
    try {
      await updateAssignedServiceStatus(id, { estado });
      await loadServices();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el estado.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel(id: number) {
    Alert.alert('Cancelar servicio', '¿Estás seguro de cancelar este servicio?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(id);
          try {
            await cancelServiceRequest(id);
            await loadServices();
          } catch {
            Alert.alert('Error', 'No se pudo cancelar el servicio.');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }

  function isActionLoading(id: number) {
    return actionLoading === id;
  }

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <FlatList
          data={services}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="hammer-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No tienes servicios activos</Text>
            </View>
          }
          renderItem={({ item }) => {
            const estado = (item.estado_servicio?.nombre || 'asignado') as string;
            const isFinalizado = estado === 'finalizado' || estado === 'cancelado';
            const action = ACTION_CONFIG[estado as ActionEstado];

            return (
              <View style={styles.card}>
                <TouchableOpacity onPress={() => navigation.navigate('ServiceDetail', { id: item.id })}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.tipo_equipo?.nombre || 'Servicio'}</Text>
                    <StatusBadge status={estado} />
                  </View>
                  <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
                  {item.cliente?.usuario?.nombre && (
                    <Text style={styles.clientName}>
                      {item.cliente.usuario.nombre}
                      {item.cliente.usuario.telefono ? ` - ${item.cliente.usuario.telefono}` : ''}
                    </Text>
                  )}
                  <Text style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                </TouchableOpacity>

                {!isFinalizado && (
                  <View style={styles.actionRow}>
                    {action && (
                      <TouchableOpacity
                        style={[styles.primaryBtn, isActionLoading(item.id) && styles.btnDisabled]}
                        onPress={() => {
                          if (estado === 'asignado') {
                            openQuoteModal(item.id);
                          } else {
                            handleStatusUpdate(item.id, action.nextEstado);
                          }
                        }}
                        disabled={isActionLoading(item.id)}
                      >
                        <Text style={styles.primaryBtnText}>
                          {isActionLoading(item.id) ? 'Actualizando...' : action.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.cancelBtn, isActionLoading(item.id) && styles.btnDisabled]}
                      onPress={() => handleCancel(item.id)}
                      disabled={isActionLoading(item.id)}
                    >
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />

        {/* Quote modal */}
        <Modal visible={quoteModalVisible} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enviar cotización</Text>
                <TouchableOpacity onPress={() => setQuoteModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Precio mano de obra</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={quoteForm.precioManoObra}
                onChangeText={(v) => setQuoteField('precioManoObra', v)}
              />

              <Text style={styles.fieldLabel}>Precio domicilio</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={quoteForm.precioDomicilio}
                onChangeText={(v) => setQuoteField('precioDomicilio', v)}
              />

              <Text style={styles.fieldLabel}>Precio diagnóstico</Text>
              <TextInput
                style={styles.fieldInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={quoteForm.precioDiagnostico}
                onChangeText={(v) => setQuoteField('precioDiagnostico', v)}
              />

              <Text style={styles.fieldLabel}>Nota (opcional)</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextArea]}
                multiline
                numberOfLines={3}
                placeholder="Nota sobre el precio..."
                placeholderTextColor="#9ca3af"
                value={quoteForm.notaPrecio}
                onChangeText={(v) => setQuoteField('notaPrecio', v)}
              />

              <TouchableOpacity
                style={[styles.sendQuoteBtn, sendingQuote && styles.sendQuoteBtnDisabled]}
                onPress={handleSendQuote}
                disabled={sendingQuote}
              >
                <Text style={styles.sendQuoteBtnText}>
                  {sendingQuote ? 'Enviando...' : 'Enviar cotización'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, paddingBottom: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  clientName: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#9ca3af' },

  /* Actions */
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryBtn: {
    flex: 1, backgroundColor: '#2563eb', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelBtn: {
    backgroundColor: '#fee2e2', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center',
  },
  cancelBtnText: { color: '#b42318', fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },

  /* Modal */
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  fieldInput: {
    backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#111827',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  fieldTextArea: { minHeight: 80, textAlignVertical: 'top' },
  sendQuoteBtn: {
    backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  sendQuoteBtnDisabled: { opacity: 0.6 },
  sendQuoteBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
