import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getServices } from '../../services/admin.service';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Service {
  id: number;
  descripcion: string;
  tipo_equipo?: { nombre: string };
  estado_servicio?: { id: number; nombre: string };
  cliente?: { usuario?: { nombre: string } };
  created_at: string;
}

export default function ServicesScreen({ navigation }: { navigation: { navigate: (s: string, p: Record<string, unknown>) => void } }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadServices() {
    try {
      const response = await getServices();
      const data = await response.json();
      setServices(data.servicios || data.services || []);
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

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={services}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="construct-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No hay servicios</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ServiceDetail', { id: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.tipo_equipo?.nombre || 'Servicio'}</Text>
              <StatusBadge status={item.estado_servicio?.nombre || 'solicitado'} />
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion}</Text>
            <View style={styles.metaRow}>
              {item.cliente?.usuario?.nombre && (
                <Text style={styles.clientName}>Cliente: {item.cliente.usuario.nombre}</Text>
              )}
              <Text style={styles.cardDate}>
                {new Date(item.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, paddingBottom: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  clientName: { fontSize: 13, fontWeight: '500', color: '#374151' },
  cardDate: { fontSize: 12, color: '#9ca3af' },
});
