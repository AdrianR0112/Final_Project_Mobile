import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getService, getTechnicians, assignTechnician } from '../../services/admin.service';
import { colors } from '../../theme';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';
import StatusBadge from '../../components/StatusBadge';

interface ServiceDetail {
  id: number;
  tipo_servicio?: string;
  tipo?: string;
  estado?: string;
  modalidad?: string;
  prioridad?: string;
  fecha_creacion?: string;
  fecha_servicio?: string;
  cliente?: { id: number; nombre: string; correo: string; telefono?: string };
  tecnico?: { id: number; nombre: string; correo: string };
  descripcion_problema?: string;
  problema?: string;
}

interface Technician {
  id: number;
  nombre: string;
  correo: string;
  especialidades?: string;
  disponible: boolean;
}

export default function ServiceDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params as { id: number };

  const [service, setService] = useState<ServiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechs, setLoadingTechs] = useState(false);
  const [assigning, setAssigning] = useState(false);

  async function loadService() {
    try {
      const response = await getService(id);
      const data = await response.json();
      setService(data.servicio || data.service || data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadService();
    }, [id])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadService();
    setRefreshing(false);
  }

  async function openAssignModal() {
    setAssignModal(true);
    setLoadingTechs(true);
    try {
      const response = await getTechnicians();
      const data = await response.json();
      const list = data.tecnicos || data.technicians || data || [];
      setTechnicians(list.filter((t: Technician) => t.disponible));
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los técnicos');
    } finally {
      setLoadingTechs(false);
    }
  }

  async function handleAssign(techId: number) {
    setAssigning(true);
    try {
      await assignTechnician(id, { tecnico_id: techId });
      setAssignModal(false);
      Alert.alert('Éxito', 'Técnico asignado correctamente');
      loadService();
    } catch {
      Alert.alert('Error', 'No se pudo asignar el técnico');
    } finally {
      setAssigning(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!service) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>Servicio no encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const client = service.cliente;
  const tech = service.tecnico;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Servicio #{service.id}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Resumen del servicio</Text>
              {service.estado && <StatusBadge status={service.estado} />}
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Tipo</Text>
              <Text style={styles.value}>
                {service.tipo_servicio || service.tipo || '-'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Modalidad</Text>
              <Text style={styles.value}>{service.modalidad || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Prioridad</Text>
              <Text style={styles.value}>{service.prioridad || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Fecha creación</Text>
              <Text style={styles.value}>
                {service.fecha_creacion
                  ? new Date(service.fecha_creacion).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </Text>
            </View>
            {service.fecha_servicio && (
              <View style={styles.row}>
                <Text style={styles.label}>Fecha servicio</Text>
                <Text style={styles.value}>
                  {new Date(service.fecha_servicio).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>

          {client && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Nombre</Text>
                <Text style={styles.value}>{client.nombre}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Correo</Text>
                <Text style={styles.value}>{client.correo}</Text>
              </View>
              {client.telefono && (
                <View style={styles.row}>
                  <Text style={styles.label}>Teléfono</Text>
                  <Text style={styles.value}>{client.telefono}</Text>
                </View>
              )}
            </View>
          )}

          {tech && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Técnico asignado</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Nombre</Text>
                <Text style={styles.value}>{tech.nombre}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Correo</Text>
                <Text style={styles.value}>{tech.correo}</Text>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Descripción del problema</Text>
            <Text style={styles.description}>
              {service.descripcion_problema || service.problema || 'Sin descripción'}
            </Text>
          </View>

          {!tech && (
            <Button
              title="Asignar técnico"
              onPress={openAssignModal}
              style={styles.assignButton}
            />
          )}
        </ScrollView>

        <Modal visible={assignModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar técnico</Text>
                <TouchableOpacity onPress={() => setAssignModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {loadingTechs ? (
                <LoadingSpinner fullScreen={false} />
              ) : (
                <FlatList
                  data={technicians}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={styles.techList}
                  ListEmptyComponent={
                    <View style={styles.emptyTech}>
                      <Ionicons name="construct-outline" size={40} color="#d1d5db" />
                      <Text style={styles.emptyText}>
                        No hay técnicos disponibles
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.techCard}
                      onPress={() => handleAssign(item.id)}
                      disabled={assigning}
                    >
                      <View style={styles.techInfo}>
                        <Text style={styles.techName}>{item.nombre}</Text>
                        <Text style={styles.techEmail}>{item.correo}</Text>
                        {item.especialidades && (
                          <Text style={styles.techSpecialty}>
                            {item.especialidades}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="add-circle"
                        size={28}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                />
              )}
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  content: { flex: 1 },
  contentPadding: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: { fontSize: 14, color: '#6b7280' },
  value: { fontSize: 14, fontWeight: '500', color: '#111827', maxWidth: '55%', textAlign: 'right' },
  description: { fontSize: 14, color: '#374151', lineHeight: 20 },
  assignButton: { marginTop: 4, marginBottom: 20 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
  techList: { padding: 16 },
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  techInfo: { flex: 1, marginRight: 12 },
  techName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  techEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  techSpecialty: { fontSize: 12, color: colors.muted, marginTop: 2 },
  emptyTech: { alignItems: 'center', paddingVertical: 40 },
});
