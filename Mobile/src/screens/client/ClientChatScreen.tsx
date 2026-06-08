import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../hooks/useAuth';
import { getMyServices } from '../../services/service.service';
import { getServiceMessages, sendServiceMessage } from '../../services/chat.service';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors, radii, shadows } from '../../theme';
import { toUploadFile } from '../../utils/uploads';

interface ServiceItem {
  id: number;
  tipo_equipo?: string;
  marca_equipo?: string;
  modelo_equipo?: string;
}

interface Message {
  id: number;
  mensaje?: string;
  contenido?: string;
  remitente_id?: number;
  remitenteId?: number;
  created_at?: string;
  fechaEnvio?: string;
  fecha_envio?: string;
  usuario?: { nombre?: string };
  remitente?: { nombre?: string; apellido?: string };
  archivo_url?: string;
  archivoUrl?: string;
}

export default function ClientChatScreen() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const userId = user?.id;

  useEffect(() => {
  async function load() {
    try {
      const res = await getMyServices();
      const data = await res.json();
      setServices(data.serviceRequests || data.services || []);
      } catch { /* fail */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    async function loadMessages() {
      try {
        const res = await getServiceMessages(selectedService!);
        const data = await res.json();
        setMessages(data.messages || data.mensajes || []);
      } catch { /* fail */ }
    }
    loadMessages();
  }, [selectedService]);

  async function handleSend() {
    if (!newMessage.trim() || !selectedService || sending) return;
    setSending(true);
    try {
      const res = await sendServiceMessage(selectedService, { mensaje: newMessage.trim() });
      const data = await res.json();
      if (data.messageData || data.message || data.mensaje) setMessages((prev) => [...prev, (data.messageData || data.message || data.mensaje)]);
      setNewMessage('');
    } catch { /* fail */ }
    finally { setSending(false); }
  }

  async function handleAttach() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      multiple: false,
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets[0] && selectedService) {
      setSending(true);
      try {
        const formData = new FormData();
        formData.append('contenido', '');
        formData.append('archivo', toUploadFile(result.assets[0], 'chat_attachment') as unknown as Blob);
        const res = await sendServiceMessage(selectedService, formData);
        const data = await res.json();
        if (data.messageData || data.message || data.mensaje) setMessages((prev) => [...prev, (data.messageData || data.message || data.mensaje)]);
      } catch { /* fail */ }
      finally { setSending(false); }
    }
  }

  function getTypeName(s: ServiceItem): string {
    return s.tipo_equipo || `#${s.id}`;
  }

  if (loading) return <LoadingSpinner />;
  if (services.length === 0) return <View style={styles.centered}><Ionicons name="chatbubble-outline" size={48} color="#d1d5db" /><Text style={styles.emptyText}>No tienes servicios para chatear</Text></View>;

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
            <TouchableOpacity style={[styles.serviceChip, selectedService === item.id && styles.serviceChipActive]} onPress={() => setSelectedService(item.id)}>
              <Text style={[styles.serviceChipText, selectedService === item.id && styles.serviceChipTextActive]}>
                {getTypeName(item)} {[item.marca_equipo, item.modelo_equipo].filter(Boolean).join(' ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {!selectedService ? (
        <View style={styles.centered}><Text style={styles.emptyText}>Selecciona un servicio</Text></View>
      ) : (
        <>
          <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No hay mensajes aún</Text></View>}
            renderItem={({ item }) => {
              const isMine = (item.remitente_id || item.remitenteId) === userId;
              const text = item.mensaje || item.contenido || '';
              const attachmentUrl = item.archivo_url || item.archivoUrl || '';
              const messageTime = item.created_at || item.fechaEnvio || item.fecha_envio || '';
              return (
                <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                  {!isMine && <Text style={styles.senderName}>{item.usuario?.nombre || item.remitente?.nombre || 'Usuario'}</Text>}
                  {text ? <Text style={[styles.messageText, isMine && styles.myText]}>{text}</Text> : null}
                  {attachmentUrl ? (
                    <TouchableOpacity onPress={() => Linking.openURL(attachmentUrl)}>
                      <Text style={[styles.attachmentText, isMine && styles.myText]}>Abrir adjunto</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text style={[styles.time, isMine && styles.myTime]}>
                    {messageTime ? new Date(messageTime).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                </View>
              );
            }}
          />
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={handleAttach} style={styles.attachBtn}>
              <Ionicons name="attach" size={22} color="#6b7280" />
            </TouchableOpacity>
            <TextInput style={styles.input} value={newMessage} onChangeText={setNewMessage} placeholder="Mensaje..." placeholderTextColor="#9ca3af" multiline />
            <TouchableOpacity onPress={handleSend} disabled={!newMessage.trim() || sending} style={[styles.sendBtn, !newMessage.trim() && styles.sendDisabled]}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { color: colors.muted, fontSize: 14, marginTop: 8 },
  serviceSelector: { padding: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  serviceChipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  serviceChipTextActive: { color: colors.primary },
  messageList: { padding: 12, flexGrow: 1 },
  bubble: { maxWidth: '78%', borderRadius: 12, padding: 10, marginBottom: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  senderName: { fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: 2 },
  messageText: { fontSize: 15, color: colors.text },
  attachmentText: { fontSize: 13, fontWeight: '700', color: colors.primary, marginTop: 4 },
  myText: { color: '#fff' },
  time: { fontSize: 10, color: colors.mutedSoft, alignSelf: 'flex-end', marginTop: 4 },
  myTime: { color: '#bfdbfe' },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  attachBtn: { padding: 6 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 80, fontSize: 15, backgroundColor: colors.surfaceAlt },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  sendDisabled: { backgroundColor: '#9ca3af' },
});
