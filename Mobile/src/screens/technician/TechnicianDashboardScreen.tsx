import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
  getAssignedServiceRequests,
  getOpenServiceRequests,
  updateAssignedServiceStatus,
} from '../../services/service.service';
import { getTechnicianProfile, updateTechnicianProfile } from '../../services/technician.service';
import { getMyNotifications } from '../../services/notification.service';
import StatusBadge from '../../components/StatusBadge';

interface ServiceItem {
  id: number;
  descripcion: string;
  direccion: string;
  tipo_equipo?: { nombre: string };
  estado_servicio?: { id: number; nombre: string };
  cliente?: { usuario?: { nombre: string } };
  created_at: string;
}

interface NotificationItem {
  id: number;
  message: string;
  tipo: string;
  read: boolean;
  date: string;
}

interface TechnicianProfileData {
  calificacion_promedio?: number;
  disponible?: boolean;
  servicios_completados?: number;
}

type Navigation = {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
};

const STATUS_BUTTONS: Record<string, { label: string; nextEstado: string; icon: keyof typeof Ionicons.glyphMap }> = {
  asignado: { label: 'Enviar cotización', nextEstado: 'cotizacion_inicial_enviada', icon: 'document-text-outline' },
  aceptado: { label: 'En camino', nextEstado: 'en_camino', icon: 'navigate-outline' },
  en_camino: { label: 'En reparación', nextEstado: 'en_reparacion', icon: 'construct-outline' },
  en_reparacion: { label: 'Pendiente de pago', nextEstado: 'pendiente_pago', icon: 'card-outline' },
  pendiente_pago: { label: 'Validar pago', nextEstado: 'pago_enviado', icon: 'checkmark-circle-outline' },
};

export default function TechnicianDashboardScreen({ navigation }: { navigation: Navigation }) {
  const { user, logout } = useAuth();
  const [activeJobs, setActiveJobs] = useState<ServiceItem[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isAvailable, setIsAvailable] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingAvailability, setTogglingAvailability] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  async function loadData() {
    try {
      const [assignedRes, openRes, profileRes, notifRes] = await Promise.all([
        getAssignedServiceRequests(),
        getOpenServiceRequests(),
        getTechnicianProfile(),
        getMyNotifications(),
      ]);

      const [assignedData, openData, profileData, notifData] = await Promise.all([
        assignedRes.json(),
        openRes.json(),
        profileRes.json(),
        notifRes.json(),
      ]);

      setActiveJobs((assignedData.serviceRequests || assignedData.services || []).slice(0, 3));
      setOpenCount((openData.serviceRequests || openData.services || openData || []).length);

      const profile: TechnicianProfileData = profileData.technician || profileData;
      setCompletedCount(profile.servicios_completados ?? 0);
      setAverageRating(profile.calificacion_promedio ?? 0);
      setIsAvailable(profile.disponible ?? true);

      const notifs: NotificationItem[] = notifData.notifications || notifData || [];
      setNotifications(notifs.slice(0, 3));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  async function handleToggleAvailability(value: boolean) {
    setTogglingAvailability(true);
    try {
      await updateTechnicianProfile({ disponible: value });
      setIsAvailable(value);
    } catch {
      // revert on failure
    } finally {
      setTogglingAvailability(false);
    }
  }

  async function handleAdvanceStatus(serviceId: number, nextEstado: string) {
    setUpdatingStatusId(serviceId);
    try {
      await updateAssignedServiceStatus(serviceId, { estado: nextEstado });
      await loadData();
    } catch {
      // silently fail
    } finally {
      setUpdatingStatusId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hola, {user?.nombre?.split(' ')[0] || 'Técnico'}</Text>
          <Text style={styles.role}>Técnico</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={24} color="#dc2626" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityLeft}>
            <View
              style={[
                styles.availabilityDot,
                { backgroundColor: isAvailable ? '#16a34a' : '#9ca3af' },
              ]}
            />
            <View>
              <Text style={styles.availabilityLabel}>
                {isAvailable ? 'Disponible' : 'No disponible'}
              </Text>
              <Text style={styles.availabilityHint}>
                {isAvailable ? 'Recibiendo solicitudes' : 'No recibirás nuevas solicitudes'}
              </Text>
            </View>
          </View>
          {togglingAvailability ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={isAvailable ? '#2563eb' : '#f9fafb'}
            />
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#eff6ff' }]}>
            <Text style={[styles.statNumber, { color: '#1d4ed8' }]}>{openCount}</Text>
            <Text style={styles.statLabel}>Solicitudes{'\n'}Abiertas</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#f0fdf4' }]}>
            <Text style={[styles.statNumber, { color: '#15803d' }]}>{activeJobs.length}</Text>
            <Text style={styles.statLabel}>Servicios{'\n'}Activos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <Text style={[styles.statNumber, { color: '#b45309' }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#fce7f3' }]}>
            <Text style={[styles.statNumber, { color: '#be185d' }]}>
              {averageRating > 0 ? averageRating.toFixed(1) : '-'}
            </Text>
            <Text style={styles.statLabel}>Calificación{'\n'}Promedio</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Solicitudes')}
          >
            <Ionicons name="list" size={28} color="#2563eb" />
            <Text style={styles.actionText}>Ver Solicitudes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Activos')}
          >
            <Ionicons name="hammer" size={28} color="#2563eb" />
            <Text style={styles.actionText}>Servicios Activos</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Servicios Activos</Text>
        {loading ? (
          <Text style={styles.emptyText}>Cargando...</Text>
        ) : activeJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="construct-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyText}>No tienes servicios activos</Text>
          </View>
        ) : (
          activeJobs.map((job) => {
            const estado = job.estado_servicio?.nombre;
            const action = estado ? STATUS_BUTTONS[estado] : null;

            return (
              <TouchableOpacity
                key={job.id}
                style={styles.serviceCard}
                onPress={() => navigation.navigate('ServiceDetail', { id: job.id })}
                activeOpacity={0.7}
              >
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>
                    {job.tipo_equipo?.nombre || 'Servicio'}
                  </Text>
                  <StatusBadge status={estado || 'asignado'} />
                </View>
                <Text style={styles.serviceDesc} numberOfLines={2}>
                  {job.descripcion}
                </Text>
                {job.cliente?.usuario?.nombre && (
                  <Text style={styles.clientName}>
                    Cliente: {job.cliente.usuario.nombre}
                  </Text>
                )}
                <Text style={styles.serviceDate}>
                  {new Date(job.created_at).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>

                {action && (
                  <TouchableOpacity
                    style={styles.statusButton}
                    onPress={() => handleAdvanceStatus(job.id, action.nextEstado)}
                    disabled={updatingStatusId === job.id}
                  >
                    {updatingStatusId === job.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name={action.icon} size={16} color="#fff" />
                        <Text style={styles.statusButtonText}>{action.label}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {notifications.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Últimas Notificaciones</Text>
            {notifications.map((notif) => (
              <View
                key={notif.id}
                style={[
                  styles.notifCard,
                  !notif.read && styles.notifUnread,
                ]}
              >
                <View style={styles.notifDotRow}>
                  {!notif.read && <View style={styles.notifDot} />}
                  <Text style={styles.notifText} numberOfLines={2}>
                    {notif.message}
                  </Text>
                </View>
                <Text style={styles.notifDate}>
                  {new Date(notif.date).toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
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
  greeting: { fontSize: 20, fontWeight: '700', color: '#111827' },
  role: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  logoutBtn: { padding: 8 },
  content: { flex: 1, padding: 16 },

  availabilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  availabilityLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  availabilityLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  availabilityHint: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statNumber: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 4 },

  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 8 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { color: '#6b7280', fontSize: 14, marginTop: 8 },

  serviceCard: {
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  serviceDesc: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  clientName: { fontSize: 13, color: '#374151', fontWeight: '500', marginBottom: 4 },
  serviceDate: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },

  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 4,
  },
  statusButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  notifCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  notifUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#2563eb',
  },
  notifDotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginTop: 6,
  },
  notifText: { fontSize: 13, color: '#374151', flex: 1, lineHeight: 18 },
  notifDate: { fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'right' },
});
