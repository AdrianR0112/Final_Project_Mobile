import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getServiceHistory } from '../../services/service.service';
import { getMyRatings } from '../../services/rating.service';
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
  tecnico_nombre_completo?: string;
}

interface RatingItem {
  id: number;
  servicio_id: number;
  puntuacion?: number;
  score?: number;
  comentario?: string;
  comment?: string;
  fecha?: string;
}

export default function ServiceHistoryScreen({ navigation }: { navigation: { navigate: (s: string, p: Record<string, unknown>) => void } }) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [ratings, setRatings] = useState<RatingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [sRes, rRes] = await Promise.all([
        getServiceHistory(),
        getMyRatings(),
      ]);
      const sData = await sRes.json().catch(() => ({}));
      const rData = await rRes.json().catch(() => ({}));
      setServices((sData.serviceHistory || sData.serviceRequests || sData.services || sData || []).filter((s: ServiceItem) => s.estado === 'finalizado' || s.estado === 'cancelado'));
      setRatings(rData.ratings || rData || []);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function getRating(serviceId: number): RatingItem | undefined {
    return ratings.find((r) => r.servicio_id === serviceId);
  }

  function getTypeName(s: ServiceItem): string {
    return s.tipo_equipo || 'Servicio';
  }

  if (loading) return <LoadingSpinner />;

  return (
    <View style={styles.container}>
      <FlatList
        data={services}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No tienes servicios pasados</Text>
          </View>
        }
        renderItem={({ item }) => {
          const r = getRating(Number(item.id));
          return (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ServiceDetail', { id: item.id })}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{getTypeName(item)} {[item.marca_equipo, item.modelo_equipo].filter(Boolean).join(' ')}</Text>
                <StatusBadge status={item.estado || 'finalizado'} />
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{item.descripcion_problema || 'Sin descripción'}</Text>
              {item.tecnico_nombre_completo ? <Text style={styles.cardSubtext}>Técnico: {item.tecnico_nombre_completo}</Text> : null}
              {r ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name={s <= (r.puntuacion || r.score || 0) ? 'star' : 'star-outline'} size={14} color="#f59e0b" />
                  ))}
                  {r.comentario || r.comment ? <Text style={styles.ratingText}>{(r.comentario || r.comment)?.substring(0, 40)}...</Text> : null}
                </View>
              ) : item.estado === 'finalizado' ? (
                <View style={styles.rateRow}>
                  <Text style={[styles.cardSubtext, { color: '#2563eb' }]}>Sin calificar</Text>
                  <TouchableOpacity style={styles.rateBtn} onPress={() => navigation.navigate('ServiceDetail', { id: item.id, openRating: true })}>
                    <Ionicons name="star-outline" size={14} color="#2563eb" />
                    <Text style={styles.rateBtnText}>Calificar</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <Text style={styles.cardDate}>{item.codigo_servicio ? `#${item.codigo_servicio}` : ''}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 16, paddingBottom: 80 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#6b7280', fontSize: 14, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  cardSubtext: { fontSize: 12, color: '#6b7280' },
  ratingText: { fontSize: 11, color: '#6b7280', marginLeft: 6 },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  rateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rateBtnText: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  cardDate: { fontSize: 11, color: '#9ca3af', marginTop: 6 },
});
