import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getMyNotifications,
  markAllNotificationsRead,
} from '../../services/notification.service';
import { colors } from '../../theme';
import Button from '../../components/Button';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Notification {
  id: number;
  message: string;
  read: boolean;
  date: string;
  tipo?: string;
}

export default function AdminNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  async function loadNotifications() {
    try {
      const response = await getMyNotifications();
      const data = await response.json();
      setNotifications(
        data.notificaciones || data.notifications || data || []
      );
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }

  async function handleMarkAllRead() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      Alert.alert('Error', 'No se pudieron marcar como leídas');
    } finally {
      setMarkingAll(false);
    }
  }

  function formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `Hace ${diffMins} min`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Hace ${diffHours}h`;

      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `Hace ${diffDays}d`;

      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  if (loading) return <LoadingSpinner />;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {notifications.length > 0 && unreadCount > 0 && (
          <View style={styles.markAllBar}>
            <Button
              title="Marcar todas como leídas"
              onPress={handleMarkAllRead}
              variant="secondary"
              loading={markingAll}
              style={styles.markAllButton}
            />
          </View>
        )}

        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No hay notificaciones</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, item.read && styles.cardRead]}>
              <View style={styles.dotCol}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: item.read ? '#d1d5db' : colors.primary },
                  ]}
                />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardMessage}>{item.message}</Text>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              </View>
              <View style={styles.iconCol}>
                <Ionicons
                  name={item.read ? 'mail-open-outline' : 'mail-outline'}
                  size={20}
                  color={item.read ? '#d1d5db' : colors.primary}
                />
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 10,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  markAllBar: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#f9fafb' },
  markAllButton: { paddingVertical: 10 },
  list: { padding: 16, paddingBottom: 80 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#6b7280', marginTop: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  cardRead: { opacity: 0.55 },
  dotCol: { marginRight: 10, paddingTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { flex: 1, marginRight: 8 },
  cardMessage: { fontSize: 14, fontWeight: '500', color: '#111827', lineHeight: 20 },
  cardDate: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  iconCol: { paddingTop: 4 },
});
