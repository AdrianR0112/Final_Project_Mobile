import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { getAssignedServiceRequests } from '../../services/service.service';
import { getServiceMessages, sendServiceMessage } from '../../services/chat.service';
import LoadingSpinner from '../../components/LoadingSpinner';

interface ServiceItem {
  id: number;
  tipo_equipo?: { nombre: string };
  cliente?: { usuario?: { nombre: string } };
}

interface Message {
  id: number;
  mensaje: string;
  remitente_id: number;
  created_at: string;
  usuario?: { nombre: string };
}

export default function TechnicianChatScreen() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const userId = user?.id;

  useFocusEffect(
    useCallback(() => {
      async function load() {
        try {
          const response = await getAssignedServiceRequests();
          const data = await response.json();
          setServices(data.services || []);
        } catch {
          // silently fail
        } finally {
          setLoading(false);
        }
      }
      load();
    }, [])
  );

  useEffect(() => {
    if (!selectedService) return;

    async function loadMessages() {
      try {
        const response = await getServiceMessages(selectedService!);
        const data = await response.json();
        setMessages(data.mensajes || data.messages || []);
      } catch {
        // silently fail
      }
    }
    loadMessages();
  }, [selectedService]);

  async function handleSend() {
    if (!newMessage.trim() || !selectedService || sending) return;

    setSending(true);
    try {
      const response = await sendServiceMessage(selectedService, { mensaje: newMessage.trim() });
      const data = await response.json();
      if (data.messageData || data.message || data.mensaje) {
        setMessages((prev) => [...prev, (data.messageData || data.message || data.mensaje)]);
      }
      setNewMessage('');
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  if (services.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="chatbubble-outline" size={48} color="#d1d5db" />
        <Text style={styles.emptyText}>No tienes servicios activos para chatear</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.serviceSelector}>
        <FlatList
          horizontal
          data={services}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.serviceChip, selectedService === item.id && styles.serviceChipActive]}
              onPress={() => setSelectedService(item.id)}
            >
              <Text style={[styles.serviceChipText, selectedService === item.id && styles.serviceChipTextActive]}>
                {item.cliente?.usuario?.nombre || item.tipo_equipo?.nombre || `#${item.id}`}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {!selectedService ? (
        <View style={styles.centered}>
          <Text style={styles.selectText}>Selecciona un servicio para ver mensajes</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMine = item.remitente_id === userId;
              return (
                <View style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage]}>
                  {!isMine && <Text style={styles.senderName}>{item.usuario?.nombre || 'Usuario'}</Text>}
                  <Text style={[styles.messageText, isMine && styles.myMessageText]}>{item.mensaje}</Text>
                  <Text style={[styles.messageTime, isMine && styles.myMessageTime]}>
                    {new Date(item.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>No hay mensajes aún</Text>
              </View>
            }
          />

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#9ca3af"
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
              style={[styles.sendBtn, !newMessage.trim() && styles.sendDisabled]}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: '#6b7280', fontSize: 14, marginTop: 8 },
  selectText: { color: '#6b7280', fontSize: 16 },
  serviceSelector: { padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  serviceChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  serviceChipActive: { backgroundColor: '#2563eb' },
  serviceChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  serviceChipTextActive: { color: '#fff' },
  messageList: { padding: 12, flexGrow: 1 },
  messageBubble: { maxWidth: '80%', borderRadius: 12, padding: 10, marginBottom: 8 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#2563eb' },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  senderName: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 2 },
  messageText: { fontSize: 15, color: '#111827' },
  myMessageText: { color: '#fff' },
  messageTime: { fontSize: 10, color: '#9ca3af', alignSelf: 'flex-end', marginTop: 4 },
  myMessageTime: { color: '#bfdbfe' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 80, fontSize: 15, backgroundColor: '#f9fafb' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  sendDisabled: { backgroundColor: '#9ca3af' },
});
