import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getServiceHistory } from '../../services/service.service';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';

interface ServiceItem {
  id: number;
  codigo_servicio?: string;
  descripcion_problema?: string;
  tipo_equipo?: string;
  marca_equipo?: string;
  modelo_equipo?: string;
  estado?: string;
  fecha_solicitud?: string;
  cliente_nombre_completo?: string;
  calificacion_prom?: number;
}

export default function ServiceHistoryScreen({ navigation }: { navigation: { navigate: (s: string, p: Record<string, unknown>) => void } }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const response = await getServiceHistory();
      const data = await response.json().catch(() => ({}));
      const allServices = data.serviceHistory || data.serviceRequests || data.services || data || [];
      setServices(
        Array.isArray(allServices)
          ? allServices.filter((s: ServiceItem) => s.estado === 'finalizado' || s.estado === 'cancelado')
          : []
      );
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function getTypeName(s: ServiceItem): string {
    return s.tipo_equipo || 'Servicio';
  }

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={services}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No tienes historial de servicios</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ServiceDetail', { id: item.id })}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{getTypeName(item)} {[item.marca_equipo, item.modelo_equipo].filter(Boolean).join(' ')}</Text>
              <StatusBadge status={item.estado || 'finalizado'} />
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion_problema || 'Sin descripción'}</Text>
            {item.cliente_nombre_completo ? <Text style={styles.cardSubtext}>Cliente: {item.cliente_nombre_completo}</Text> : null}
            {item.calificacion_prom ? (
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name={s <= item.calificacion_prom! ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
                ))}
                <Text style={styles.ratingText}>{Number(item.calificacion_prom).toFixed(1)}</Text>
              </View>
            ) : null}
            <Text style={styles.cardDate}>
              {item.codigo_servicio ? `#${item.codigo_servicio}  ` : ''}
              {item.fecha_solicitud ? new Date(item.fecha_solicitud).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, paddingBottom: 80 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#6b7280', fontSize: 14, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  cardSubtext: { fontSize: 12, color: '#6b7280' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  ratingText: { fontSize: 12, color: '#6b7280', marginLeft: 6, fontWeight: '600' },
  cardDate: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
});
