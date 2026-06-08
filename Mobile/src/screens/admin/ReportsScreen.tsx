import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getDashboard, getReports } from '../../services/admin.service';
import { colors } from '../../theme';
import LoadingSpinner from '../../components/LoadingSpinner';

interface ServiceState {
  nombre?: string;
  estado?: string;
  total?: number;
  count?: number;
}

interface TopTechnician {
  tecnico_id: number;
  nombre: string;
  ingresos: number;
  servicios: number;
}

interface DashboardData {
  users?: { total_usuarios?: number; total_tecnicos?: number; total_clientes?: number };
  ratings?: { promedio?: number; total_calificaciones?: number };
  serviceStates?: ServiceState[];
  recentServices?: unknown[];
  topTechnicians?: TopTechnician[];
}

const STATE_COLORS: Record<string, string> = {
  solicitado: '#fef3c7',
  asignado: '#e6edff',
  en_camino: '#e0e7ff',
  en_reparacion: '#fce7f3',
  finalizado: '#d8f8e1',
  cancelado: '#ffdad6',
  cotizacion_inicial_enviada: '#fef3c7',
  aceptado: '#e6edff',
  pendiente_pago: '#ede9fe',
  pago_enviado: '#d8f8e1',
};

const STATE_TEXT_COLORS: Record<string, string> = {
  solicitado: '#92400e',
  asignado: colors.primary,
  en_camino: '#3730a3',
  en_reparacion: '#9d174d',
  finalizado: colors.success,
  cancelado: colors.danger,
  cotizacion_inicial_enviada: '#92400e',
  aceptado: colors.primary,
  pendiente_pago: '#5b21b6',
  pago_enviado: colors.success,
};

function formatState(estado: string): string {
  return estado.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function ReportsScreen() {
  const { logout } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard() {
    try {
      const [dashRes, repRes] = await Promise.all([
        getDashboard(),
        getReports(),
      ]);
      const dData = await dashRes.json().catch(() => ({}));
      const rData = await repRes.json().catch(() => ({}));

      const d = dData.dashboard || dData.stats || dData;
      const r = rData.reports || rData;

      // Map technicianIncome to topTechnicians
      const incomeList: unknown[] = r.technicianIncome || r.tecnicosIngresos || [];
      const mapped: TopTechnician[] = (incomeList as Record<string, unknown>[]).map((t: Record<string, unknown>) => ({
        tecnico_id: (t.tecnico_id as number) || 0,
        nombre: (t.tecnico as string) || (t.nombre as string) || '',
        ingresos: Number(t.ingresos_netos || t.ingresos || 0),
        servicios: Number((t as Record<string, unknown>).total_servicios || (t as Record<string, unknown>).servicios || 0),
      }));

      setDashboard({ ...(d as DashboardData), topTechnicians: mapped });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }

  if (loading) return <LoadingSpinner />;

  const usersData = dashboard.users || {};
  const totalUsers = Number(usersData.total_usuarios || 0);
  const totalTechnicians = Number(usersData.total_tecnicos || 0);
  const avgRating = dashboard.ratings?.promedio ?? 0;
  const rawStates = dashboard.serviceStates ?? [];
  const serviceStates: { estado: string; count: number }[] = rawStates.map((s) => ({
    estado: s.nombre || s.estado || '',
    count: s.total ?? s.count ?? 0,
  }));
  const topTechnicians = dashboard.topTechnicians ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reportes</Text>
          <Ionicons
            name="log-out-outline"
            size={24}
            color={colors.danger}
            onPress={logout}
          />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentPadding}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={styles.sectionTitle}>Estadísticas generales</Text>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="people" size={24} color={colors.primary} />
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {totalUsers}
              </Text>
              <Text style={styles.statLabel}>Usuarios</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="construct" size={24} color={colors.success} />
              <Text style={[styles.statNumber, { color: colors.success }]}>
                {totalTechnicians}
              </Text>
              <Text style={styles.statLabel}>Técnicos</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.warningSoft }]}>
              <Ionicons name="star" size={24} color={colors.warning} />
              <Text style={[styles.statNumber, { color: colors.warning }]}>
                {Number(avgRating).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Rating promedio</Text>
            </View>
          </View>

          {serviceStates.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Servicios por estado</Text>
              <View style={styles.stateGrid}>
                {serviceStates.map((s, i) => (
                  <View
                    key={i}
                    style={[
                      styles.stateCard,
                      { backgroundColor: STATE_COLORS[s.estado] || '#f3f4f6' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.stateNumber,
                        { color: STATE_TEXT_COLORS[s.estado] || '#374151' },
                      ]}
                    >
                      {s.count}
                    </Text>
                    <Text
                      style={[
                        styles.stateLabel,
                        { color: STATE_TEXT_COLORS[s.estado] || '#374151' },
                      ]}
                    >
                      {formatState(s.estado)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {topTechnicians.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Top 5 técnicos por ingresos</Text>
              {topTechnicians.slice(0, 5).map((tech, i) => (
                <View key={tech.tecnico_id} style={styles.rankCard}>
                  <View style={styles.rankLeft}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankNumber}>#{i + 1}</Text>
                    </View>
                    <View style={styles.rankInfo}>
                      <Text style={styles.rankName}>{tech.nombre}</Text>
                      <Text style={styles.rankServices}>
                        {tech.servicios} servicios
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rankIncome}>
                    ${tech.ingresos?.toLocaleString?.() ?? tech.ingresos}
                  </Text>
                </View>
              ))}
            </>
          )}

          {serviceStates.length === 0 && topTechnicians.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No hay datos de reportes</Text>
            </View>
          )}
        </ScrollView>
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
  content: { flex: 1 },
  contentPadding: { padding: 16, paddingBottom: 80 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16, marginTop: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard: {
    width: '47%',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  statNumber: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  stateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  stateCard: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    minWidth: '30%',
    flex: 1,
  },
  stateNumber: { fontSize: 24, fontWeight: '800' },
  stateLabel: { fontSize: 11, fontWeight: '600', marginTop: 4, textAlign: 'center' },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rankLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankNumber: { fontSize: 13, fontWeight: '700', color: colors.primary },
  rankInfo: { flex: 1 },
  rankName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  rankServices: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rankIncome: { fontSize: 16, fontWeight: '700', color: colors.success },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 12 },
});
