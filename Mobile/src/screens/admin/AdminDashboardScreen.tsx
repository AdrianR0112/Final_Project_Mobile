import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getDashboard } from '../../services/admin.service';

interface DashboardStats {
  total_usuarios?: number;
  total_servicios?: number;
  total_tecnicos?: number;
  servicios_pendientes?: number;
  servicios_activos?: number;
}

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({});
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboard() {
    try {
      const response = await getDashboard();
      const data = await response.json();
      setStats(data.stats || data);
    } catch {
      // silently fail
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin: {user?.nombre?.split(' ')[0] || 'Admin'}</Text>
          <Text style={styles.role}>Administrador</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Resumen del Sistema</Text>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
            <Ionicons name="people" size={24} color="#1d4ed8" />
            <Text style={[styles.statNumber, { color: '#1d4ed8' }]}>{stats.total_usuarios || 0}</Text>
            <Text style={styles.statLabel}>Usuarios</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
            <Ionicons name="construct" size={24} color="#15803d" />
            <Text style={[styles.statNumber, { color: '#15803d' }]}>{stats.total_servicios || 0}</Text>
            <Text style={styles.statLabel}>Servicios</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time" size={24} color="#92400e" />
            <Text style={[styles.statNumber, { color: '#92400e' }]}>{stats.servicios_pendientes || 0}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#ede9fe' }]}>
            <Ionicons name="hammer" size={24} color="#5b21b6" />
            <Text style={[styles.statNumber, { color: '#5b21b6' }]}>{stats.servicios_activos || 0}</Text>
            <Text style={styles.statLabel}>Activos</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  greeting: { fontSize: 20, fontWeight: '700', color: '#111827' },
  role: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  content: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 4 },
  statNumber: { fontSize: 28, fontWeight: '800', marginTop: 8 },
  statLabel: { fontSize: 13, color: '#6b7280', marginTop: 4 },
});
