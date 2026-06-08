import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getMyServices } from '../../services/service.service';
import { getPaymentsForService } from '../../services/payment.service';
import { getWarrantyForService } from '../../services/warranty.service';
import { getUnreadNotificationCount } from '../../services/notification.service';
import StatusBadge from '../../components/StatusBadge';
import { colors, radii, shadows } from '../../theme';

interface ServiceItem {
  id: number;
  descripcion_problema?: string;
  tipo_equipo?: string;
  marca_equipo?: string;
  modelo_equipo?: string;
  estado?: string;
  fecha_solicitud?: string;
  tecnico_id?: number;
}

export default function ClientDashboardScreen({ navigation }: { navigation: { navigate: (s: string, p?: Record<string, unknown>) => void } }) {
  const { user, logout } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [stats, setStats] = useState({ active: 0, finalized: 0 });
  const [warrantyCount, setWarrantyCount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [sRes, nRes] = await Promise.all([getMyServices({ limit: 20 }), getUnreadNotificationCount()]);
      const sData = await sRes.json().catch(() => ({}));
      const nData = await nRes.json().catch(() => ({}));
      const allServices: ServiceItem[] = sData.serviceRequests || sData.services || [];
      setServices(allServices);
      const active = allServices.filter((s) => !['finalizado', 'cancelado'].includes(s.estado || '')).length;
      const finalized = allServices.filter((s) => s.estado === 'finalizado').length;
      setStats({ active, finalized });
      if (nData.count !== undefined) setUnreadNotif(nData.count);

      // Load warranties/payments counts in background
      let wCount = 0;
      let pCount = 0;
      try {
        const activeList = allServices.filter((s) => !['finalizado', 'cancelado'].includes(s.estado || ''));
        const results = await Promise.allSettled(
          activeList.map((s) => getWarrantyForService(s.id).then((r) => r.json().catch(() => ({}))))
        );
        wCount = results.filter((r) => r.status === 'fulfilled' && (r.value?.warranty || r.value?.garantia)).length;
      } catch { /* ignore */ }
      try {
        const resultsPay = await Promise.allSettled(
          allServices.slice(0, 5).map((s) => getPaymentsForService(s.id).then((r) => r.json().catch(() => ({}))))
        );
        pCount = resultsPay.reduce((acc, r) => {
          if (r.status === 'fulfilled') {
            const payments = r.value?.payments || r.value?.pagos || [];
            return acc + (Array.isArray(payments) ? payments.length : 0);
          }
          return acc;
        }, 0);
      } catch { /* ignore */ }
      setWarrantyCount(wCount);
      setPaymentCount(pCount);
    } catch { /* fail silently */ }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  const activeServices = services.filter((s) => !['finalizado', 'cancelado'].includes(s.estado || '')).slice(0, 3);

  function getTypeName(s: ServiceItem): string {
    return s.tipo_equipo || 'Servicio';
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0] || 'Usuario'}</Text>
          <Text style={styles.role}>Cliente</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadData(); setRefreshing(false); }} />} contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.statNum, { color: colors.accent }]}>{stats.finalized}</Text>
            <Text style={styles.statLabel}>Finalizados</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.warningSoft }]}>
            <Text style={[styles.statNum, { color: colors.warning }]}>{warrantyCount}</Text>
            <Text style={styles.statLabel}>Garantías</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.infoSoft }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{paymentCount}</Text>
            <Text style={styles.statLabel}>Pagos</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('RequestService')}>
            <Ionicons name="add-circle" size={28} color={colors.primary} /><Text style={styles.actionText}>Solicitar Servicio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Services')}>
            <Ionicons name="construct" size={28} color={colors.primary} /><Text style={styles.actionText}>Mis Servicios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('ServiceHistory')}>
            <Ionicons name="time" size={28} color={colors.primary} /><Text style={styles.actionText}>Historial</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('NearbyTechnicians')}>
            <Ionicons name="location" size={28} color={colors.primary} /><Text style={styles.actionText}>Técnicos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Chat')}>
            <Ionicons name="chatbubbles" size={28} color={colors.primary} /><Text style={styles.actionText}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Notifications')}>
            <View><Ionicons name="notifications" size={28} color={colors.primary} />
            {unreadNotif > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadNotif > 99 ? '99+' : unreadNotif}</Text></View>}</View>
            <Text style={styles.actionText}>Alertas</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Servicios Activos</Text>
        {loading ? <Text style={styles.emptyText}>Cargando...</Text> :
          activeServices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={40} color={colors.border} />
              <Text style={styles.emptyText}>No tienes servicios activos</Text>
              <TouchableOpacity onPress={() => navigation.navigate('RequestService')}><Text style={styles.link}>Solicitar un servicio</Text></TouchableOpacity>
            </View>
          ) : activeServices.map((s) => (
            <TouchableOpacity key={s.id} style={styles.serviceCard} onPress={() => navigation.navigate('ServiceDetail', { id: s.id })}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceName}>{getTypeName(s)} {[s.marca_equipo, s.modelo_equipo].filter(Boolean).join(' ')}</Text>
                <StatusBadge status={s.estado || 'solicitado'} />
              </View>
              <Text style={styles.serviceDesc} numberOfLines={2}>{s.descripcion_problema || 'Sin descripción'}</Text>
              <Text style={styles.serviceDate}>{s.fecha_solicitud ? new Date(s.fecha_solicitud).toLocaleDateString('es-CO') : ''}</Text>
            </TouchableOpacity>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#111827' },
  role: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  logoutButton: {
    padding: 8,
  },
  content: { padding: 16, paddingBottom: 40, backgroundColor: '#f9fafb' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: radii.lg, padding: 16, alignItems: 'center', ...shadows.card },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '700' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  actionCard: { width: '30%', backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.card },
  actionText: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 6 },
  badge: { position: 'absolute', top: -6, right: -8, backgroundColor: colors.danger, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, marginBottom: 12 },
  emptyCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.border, ...shadows.card },
  emptyText: { color: colors.muted, fontSize: 14, marginTop: 8 },
  link: { color: colors.primary, fontSize: 14, fontWeight: '800', marginTop: 8 },
  serviceCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  serviceName: { fontSize: 15, fontWeight: '800', color: colors.text, flex: 1, marginRight: 8 },
  serviceDesc: { fontSize: 13, color: colors.muted, marginBottom: 6 },
  serviceDate: { fontSize: 11, color: colors.mutedSoft },
});
