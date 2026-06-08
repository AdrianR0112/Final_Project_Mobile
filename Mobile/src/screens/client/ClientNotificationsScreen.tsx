import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getMyNotifications, markNotificationRead, markAllNotificationsRead } from '../../services/notification.service';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Notification {
  id: number;
  message: string;
  read: boolean;
  date: string;
  servicio_id?: number;
}

export default function ClientNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadNotifications() {
    try {
      const response = await getMyNotifications();
      const data = await response.json();
      setNotifications(data.notificaciones || data.notifications || []);
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

  async function handleMarkRead(id: number) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // silently fail
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  }

  if (loading) return <LoadingSpinner />;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Marcar todas como leídas ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No tienes notificaciones</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.read && styles.cardRead]}
            onPress={() => !item.read && handleMarkRead(item.id)}
          >
            <View style={styles.cardLeft}>
              <View style={[styles.dot, item.read && styles.dotRead]} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardText, item.read && styles.cardTextRead]}>{item.message}</Text>
              <Text style={styles.cardDate}>
                {new Date(item.date).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#6b7280', fontSize: 14, marginTop: 8 },
  markAllBtn: { padding: 12, alignItems: 'center', backgroundColor: '#eff6ff', borderBottomWidth: 1, borderBottomColor: '#bfdbfe' },
  markAllText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 80 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRead: { opacity: 0.6 },
  cardLeft: { marginRight: 12, justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb' },
  dotRead: { backgroundColor: '#d1d5db' },
  cardContent: { flex: 1 },
  cardText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  cardTextRead: { fontWeight: '400', color: '#6b7280' },
  cardDate: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
