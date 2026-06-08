import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getOpenServiceRequests, getAssignedServiceRequests, sendInitialQuote } from '../../services/service.service';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../theme';

interface ServiceItem {
  id: number;
  descripcion: string;
  direccion: string;
  modalidad?: string;
  tipo_equipo?: { nombre: string };
  cliente?: { usuario?: { nombre: string } };
  created_at: string;
}

type ModalityFilter = 'todas' | 'domicilio' | 'taller';

export default function OpenRequestsScreen({ navigation }: { navigation: { navigate: (screen: string, params: { id: number }) => void } }) {
  const [requests, setRequests] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalityFilter, setModalityFilter] = useState<ModalityFilter>('todas');
  const [searchText, setSearchText] = useState('');
  const [activeCount, setActiveCount] = useState(0);

  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [quoteForm, setQuoteForm] = useState({ precioManoObra: '', precioDomicilio: '', precioDiagnostico: '', notaPrecio: '' });
  const [sendingQuote, setSendingQuote] = useState(false);

  async function loadRequests() {
    try {
      const [openRes, assignedRes] = await Promise.all([
        getOpenServiceRequests(),
        getAssignedServiceRequests(),
      ]);
      const openData = await openRes.json();
      const assignedData = await assignedRes.json();
      setRequests(openData.serviceRequests || openData.services || openData || []);
      const assigned: unknown[] = assignedData.serviceRequests || assignedData.services || assignedData || [];
      setActiveCount(assigned.length);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }

  function openQuoteModal(id: number) {
    setSelectedRequestId(id);
    setQuoteForm({ precioManoObra: '', precioDomicilio: '', precioDiagnostico: '', notaPrecio: '' });
    setQuoteModalVisible(true);
  }

  async function handleSendQuote() {
    if (selectedRequestId === null) return;
    const manoObra = parseFloat(quoteForm.precioManoObra);
    const domicilio = parseFloat(quoteForm.precioDomicilio);
    const diagnostico = parseFloat(quoteForm.precioDiagnostico);

    if (isNaN(manoObra) || isNaN(domicilio) || isNaN(diagnostico)) {
      Alert.alert('Campos requeridos', 'Debes ingresar los tres precios.');
      return;
    }

    setSendingQuote(true);
    try {
      await sendInitialQuote(selectedRequestId, {
        precioManoObra: manoObra,
        precioDomicilio: domicilio,
        precioDiagnostico: diagnostico,
        notaPrecio: quoteForm.notaPrecio || undefined,
      });
      setQuoteModalVisible(false);
      await loadRequests();
    } catch {
      Alert.alert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setSendingQuote(false);
    }
  }

  function setQuoteField(field: keyof typeof quoteForm, value: string) {
    setQuoteForm((prev) => ({ ...prev, [field]: value }));
  }

  const filteredRequests = requests.filter((item) => {
    if (modalityFilter !== 'todas' && item.modalidad !== modalityFilter) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const name = item.cliente?.usuario?.nombre?.toLowerCase() || '';
      const dir = item.direccion?.toLowerCase() || '';
      const desc = item.descripcion?.toLowerCase() || '';
      if (!name.includes(q) && !dir.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  const capacityWarning = activeCount >= 2;

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Filter bar */}
        <View style={styles.filterBar}>
          <View style={styles.modalityTabs}>
            {(['todas', 'domicilio', 'taller'] as ModalityFilter[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modalityTab, modalityFilter === m && styles.modalityTabActive]}
                onPress={() => setModalityFilter(m)}
              >
                <Text style={[styles.modalityTabText, modalityFilter === m && styles.modalityTabTextActive]}>
                  {m === 'todas' ? 'Todas' : m === 'domicilio' ? 'Domicilio' : 'Taller'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por cliente, dirección o descripción..."
              placeholderTextColor="#9ca3af"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Capacity warning */}
        {capacityWarning && (
          <View style={styles.warningBar}>
            <Ionicons name="warning" size={16} color="#9a6700" />
            <Text style={styles.warningText}>
              Tienes {activeCount} servicios activos. Considera tu capacidad antes de cotizar.
            </Text>
          </View>
        )}

        {/* Results count */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredRequests.length} {filteredRequests.length === 1 ? 'solicitud' : 'solicitudes'}
          </Text>
        </View>

        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No hay solicitudes abiertas</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => navigation.navigate('ServiceDetail', { id: item.id })}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.tipo_equipo?.nombre || 'Servicio'}</Text>
                  <StatusBadge status="solicitado" />
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
                <View style={styles.metaRow}>
                  {item.cliente?.usuario?.nombre && (
                    <Text style={styles.clientName}>{item.cliente.usuario.nombre}</Text>
                  )}
                  <Text style={styles.cardDate}>
                    {new Date(item.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.address} numberOfLines={1}>
                    <Ionicons name="location" size={12} color="#6b7280" /> {item.direccion}
                  </Text>
                  {item.modalidad && (
                    <Text style={styles.modalityBadge}>
                      {item.modalidad === 'domicilio' ? 'Domicilio' : 'Taller'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quoteBtn} onPress={() => openQuoteModal(item.id)}>
                <Text style={styles.quoteText}>Enviar cotización</Text>
              </TouchableOpacity>
            </View>
          )}
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

  /* Filter bar */
  filterBar: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  modalityTabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modalityTab: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#f3f4f6', alignItems: 'center',
  },
  modalityTabActive: { backgroundColor: colors.primary },
  modalityTabText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  modalityTabTextActive: { color: '#fff' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10,
    paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 10 },

  /* Warning */
  warningBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    padding: 10, borderRadius: 8, backgroundColor: '#fff4d6',
  },
  warningText: { fontSize: 13, color: '#9a6700', flex: 1 },

  /* Count */
  countRow: { paddingHorizontal: 16, marginBottom: 4 },
  countText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  /* List */
  list: { padding: 16, paddingTop: 4, paddingBottom: 80 },
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
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clientName: { fontSize: 13, fontWeight: '500', color: '#374151' },
  cardDate: { fontSize: 12, color: '#9ca3af' },
  address: { fontSize: 12, color: '#6b7280', flex: 1 },
  modalityBadge: {
    fontSize: 11, fontWeight: '500', color: '#2563eb',
    backgroundColor: '#eff4ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  quoteBtn: {
    backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12,
    alignItems: 'center', marginTop: 12,
  },
  quoteText: { color: '#fff', fontSize: 15, fontWeight: '600' },

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
