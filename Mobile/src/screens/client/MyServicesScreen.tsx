import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyServices, cancelServiceRequest } from '../../services/service.service';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../theme';

interface ServiceItem {
  id: number;
  codigo_servicio?: string;
  descripcion_problema?: string;
  tipo_equipo?: string;
  marca_equipo?: string;
  modelo_equipo?: string;
  estado?: string;
  fecha_solicitud?: string;
  tecnico_nombre_completo?: string;
  tecnico_id?: number;
}

export default function MyServicesScreen({ navigation }: { navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void } }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadServices() {
    try {
      const response = await getMyServices();
      const data = await response.json();
      const list = data.serviceRequests || data.services || data || [];
      setServices(list.filter((s: ServiceItem) => s.estado !== 'finalizado' && s.estado !== 'cancelado'));
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

  async function handleCancel(serviceId: number) {
    Alert.alert('Cancelar servicio', '¿Estás seguro de cancelar este servicio?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: async () => {
        try { await cancelServiceRequest(serviceId); await loadServices(); }
        catch { Alert.alert('Error', 'No se pudo cancelar'); }
      }},
    ]);
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
            <Ionicons name="construct-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No tienes servicios activos</Text>
            <Text style={styles.emptySubtext}>Solicita tu primer servicio</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ServiceDetail', { id: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {item.tipo_equipo || 'Servicio'}{' '}
                {[item.marca_equipo, item.modelo_equipo].filter(Boolean).join(' ')}
              </Text>
              <StatusBadge status={item.estado || 'solicitado'} />
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion_problema || 'Sin descripción'}</Text>
            <View style={styles.cardMeta}>
              {item.codigo_servicio ? <Text style={styles.cardCode}>#{item.codigo_servicio}</Text> : null}
              <Text style={styles.cardDate}>
                {item.fecha_solicitud ? new Date(item.fecha_solicitud).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }) : ''}
              </Text>
            </View>
            <View style={styles.cardActions}>
              {item.tecnico_id ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Chat')}>
                  <Ionicons name="chatbubbles" size={14} color={colors.primary} />
                  <Text style={styles.actionBtnText}>Chat</Text>
                </TouchableOpacity>
              ) : null}
              {item.estado !== 'finalizado' && item.estado !== 'cancelado' ? (
                <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                  <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              ) : null}
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
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  cardCode: { fontSize: 11, color: '#9ca3af' },
  cardDate: { fontSize: 11, color: '#9ca3af' },
  cardActions: { flexDirection: 'row', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelBtnText: { fontSize: 13, fontWeight: '600', color: colors.danger },
});
