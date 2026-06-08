import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAssignedServiceRequestById, sendInitialQuote, updateAssignedServiceStatus, cancelServiceRequest } from '../../services/service.service';
import { getPaymentsForService, createPayment } from '../../services/payment.service';
import { getSparePartsForService, addSparePart, deleteSparePart } from '../../services/spare-part.service';
import { getServiceFiles, uploadServiceFile, deleteServiceFile } from '../../services/service-file.service';
import { getWarrantyForService, createWarranty } from '../../services/warranty.service';
import { getMyRatingForService } from '../../services/rating.service';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../theme';

interface ServiceDetail {
  id: number;
  descripcion: string;
  direccion: string;
  codigo_servicio?: string;
  tipo_equipo?: { nombre: string };
  marca_equipo?: string;
  modelo_equipo?: string;
  numero_serie_equipo?: string;
  modalidad?: string;
  prioridad?: string;
  estado_servicio?: { id: number; nombre: string };
  cliente?: { usuario?: { nombre: string; apellido?: string; telefono?: string; correo?: string } };
  created_at: string;
  updated_at?: string;
}

interface Payment {
  id: number;
  metodo_pago?: string;
  monto?: number;
  moneda?: string;
  estado_pago?: string;
  notas?: string;
}

interface SparePart {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario?: number;
  proveedor?: string;
}

interface ServiceFile {
  id: number;
  url: string;
  tipo?: string;
  etapa?: string;
  descripcion?: string;
}

interface Warranty {
  id: number;
  descripcion: string;
  duracion_dias?: number;
  activa?: boolean;
}

type ModalType = 'quote' | 'parts' | 'files' | 'warranty' | 'payment' | 'close' | null;

const STATUS_STEPS: { estado: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { estado: 'en_camino', label: 'En camino', icon: 'car' },
  { estado: 'en_reparacion', label: 'En reparación', icon: 'construct' },
  { estado: 'pendiente_pago', label: 'Pendiente de pago', icon: 'card' },
  { estado: 'finalizado', label: 'Finalizar', icon: 'checkmark-circle' },
];

export default function ServiceDetailScreen({ route, navigation }: { route: { params: { id: number } }; navigation: { navigate: (s: string, p?: Record<string, unknown>) => void } }) {
  const { id } = route.params;
  const [service, setService] = useState<ServiceDetail | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);
  const [files, setFiles] = useState<ServiceFile[]>([]);
  const [warranty, setWarranty] = useState<Warranty | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<'resumen' | 'pagos' | 'repuestos' | 'archivos' | 'garantia'>('resumen');

  // Quote form
  const [precioManoObra, setPrecioManoObra] = useState('');
  const [precioDomicilio, setPrecioDomicilio] = useState('');
  const [precioDiagnostico, setPrecioDiagnostico] = useState('');
  const [notaPrecio, setNotaPrecio] = useState('');

  // Part form
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');

  // File form
  const [fileUrl, setFileUrl] = useState('');
  const [fileDesc, setFileDesc] = useState('');

  // Warranty form
  const [warrantyDesc, setWarrantyDesc] = useState('');
  const [warrantyDuration, setWarrantyDuration] = useState('');

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');

  async function loadAll() {
    try {
      const [sRes, pRes, spRes, sfRes, wRes] = await Promise.all([
        getAssignedServiceRequestById(id),
        getPaymentsForService(id).catch(() => ({ json: async () => ({}) } as Response)),
        getSparePartsForService(id).catch(() => ({ json: async () => ({}) } as Response)),
        getServiceFiles(id).catch(() => ({ json: async () => ({}) } as Response)),
        getWarrantyForService(id).catch(() => ({ json: async () => ({}) } as Response)),
      ]);
      const sData = await sRes.json();
      const pData = pRes ? await (pRes as Response).json().catch(() => ({})) : {};
      const spData = spRes ? await (spRes as Response).json().catch(() => ({})) : {};
      const sfData = sfRes ? await (sfRes as Response).json().catch(() => ({})) : {};
      const wData = wRes ? await (wRes as Response).json().catch(() => ({})) : {};

      setService(sData.serviceRequest || sData.service || sData);
      setPayments(pData.payments || pData.pagos || pData || []);
      setParts(spData.parts || spData.repuestos || spData || []);
      setFiles(sfData.files || sfData.archivos || sfData || []);
      setWarranty(Array.isArray(wData?.warranties) ? wData.warranties[0] : wData.warranty || wData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [id]);

  async function onRefresh() { setRefreshing(true); await loadAll(); setRefreshing(false); }

  async function handleSendQuote() {
    if (!precioManoObra || !precioDiagnostico) { Alert.alert('Error', 'Completa mano de obra y diagnóstico'); return; }
    setActionLoading(true);
    try {
      await sendInitialQuote(id, {
        precioManoObra: Number(precioManoObra),
        precioDomicilio: Number(precioDomicilio) || 0,
        precioDiagnostico: Number(precioDiagnostico),
        notaPrecio: notaPrecio || undefined,
      });
      Alert.alert('Cotización enviada', 'El cliente revisará tu propuesta.');
      setModal(null);
      await loadAll();
    } catch { Alert.alert('Error', 'No se pudo enviar la cotización'); }
    finally { setActionLoading(false); }
  }

  async function handleUpdateStatus(estado: string) {
    setActionLoading(true);
    try {
      await updateAssignedServiceStatus(id, { estado });
      Alert.alert('Estado actualizado', `El servicio ahora está en estado "${estado}".`);
      await loadAll();
    } catch { Alert.alert('Error', 'No se pudo actualizar el estado'); }
    finally { setActionLoading(false); }
  }

  async function handleCancel() {
    Alert.alert('Cancelar servicio', '¿Estás seguro de cancelar este servicio?', [
      { text: 'No', style: 'cancel' },
      { text: 'Sí, cancelar', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try { await cancelServiceRequest(id); Alert.alert('Servicio cancelado'); await loadAll(); }
        catch { Alert.alert('Error', 'No se pudo cancelar'); }
        finally { setActionLoading(false); }
      }},
    ]);
  }

  async function handleAddPart() {
    if (!partName) return;
    setActionLoading(true);
    try {
      await addSparePart(id, { nombre: partName, cantidad: Number(partQty) || 1, precioUnitario: Number(partPrice) || 0 });
      await loadAll();
      setPartName(''); setPartQty('1'); setPartPrice('');
    } catch { Alert.alert('Error', 'No se pudo agregar el repuesto'); }
    finally { setActionLoading(false); }
  }

  async function handleDeletePart(partId: number) {
    try { await deleteSparePart(partId); await loadAll(); }
    catch { Alert.alert('Error', 'No se pudo eliminar'); }
  }

  async function handleAddFile() {
    if (!fileUrl) return;
    setActionLoading(true);
    try {
      await uploadServiceFile(id, { url: fileUrl, descripcion: fileDesc, tipo: 'documento', etapa: 'reparacion' });
      await loadAll();
      setFileUrl(''); setFileDesc('');
    } catch { Alert.alert('Error', 'No se pudo agregar el archivo'); }
    finally { setActionLoading(false); }
  }

  async function handleDeleteFile(fileId: number) {
    try { await deleteServiceFile(fileId); await loadAll(); }
    catch { Alert.alert('Error', 'No se pudo eliminar'); }
  }

  async function handleAddWarranty() {
    if (!warrantyDesc) return;
    setActionLoading(true);
    try {
      await createWarranty(id, { descripcion: warrantyDesc, duracionDias: Number(warrantyDuration) || undefined });
      await loadAll();
      setWarrantyDesc(''); setWarrantyDuration('');
      setModal(null);
    } catch { Alert.alert('Error', 'No se pudo crear la garantía'); }
    finally { setActionLoading(false); }
  }

  async function handleAddPayment() {
    if (!paymentAmount) return;
    setActionLoading(true);
    try {
      await createPayment(id, { monto: Number(paymentAmount), metodoPago: paymentMethod });
      await loadAll();
      setPaymentAmount('');
      setModal(null);
    } catch { Alert.alert('Error', 'No se pudo registrar el pago'); }
    finally { setActionLoading(false); }
  }

  if (loading) return <LoadingSpinner />;
  if (!service) return <View style={styles.centered}><Text style={styles.errorText}>Servicio no encontrado</Text></View>;

  const statusName = service.estado_servicio?.nombre || '';
  const isActive = !['finalizado', 'cancelado'].includes(statusName);
  const clientName = [service.cliente?.usuario?.nombre, service.cliente?.usuario?.apellido].filter(Boolean).join(' ') || 'N/D';

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.estado === statusName);
  const nextSteps = STATUS_STEPS.filter((_, i) => i > currentStepIndex);

  const TABS: { key: 'resumen' | 'pagos' | 'repuestos' | 'archivos' | 'garantia'; label: string }[] = [
    { key: 'resumen', label: 'Resumen' },
    { key: 'pagos', label: 'Pagos' },
    { key: 'repuestos', label: 'Repuestos' },
    { key: 'archivos', label: 'Archivos' },
    { key: 'garantia', label: 'Garantía' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Text style={styles.type}>{service.tipo_equipo?.nombre || 'Servicio'}</Text>
              {service.codigo_servicio ? <Text style={styles.code}>#{service.codigo_servicio}</Text> : null}
            </View>
            <StatusBadge status={statusName || 'solicitado'} />
          </View>
          {service.modalidad ? (
            <Text style={styles.meta}>Modalidad: {service.modalidad === 'domicilio' ? 'A domicilio' : 'En taller'}</Text>
          ) : null}
          {service.prioridad ? <Text style={styles.meta}>Prioridad: {service.prioridad}</Text> : null}
        </View>

        {/* Summary */}
        {tab === 'resumen' && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Descripción del problema</Text>
              <Text style={styles.text}>{service.descripcion || 'Sin descripción'}</Text>
            </View>

            {service.direccion ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Dirección</Text>
                <Text style={styles.text}>{service.direccion}</Text>
              </View>
            ) : null}

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <Text style={styles.text}>{clientName}</Text>
              {service.cliente?.usuario?.telefono ? <Text style={styles.subtext}>{service.cliente.usuario.telefono}</Text> : null}
              {service.cliente?.usuario?.correo ? <Text style={styles.subtext}>{service.cliente.usuario.correo}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Equipo</Text>
              {service.marca_equipo ? <Text style={styles.text}>Marca: {service.marca_equipo}</Text> : null}
              {service.modelo_equipo ? <Text style={styles.text}>Modelo: {service.modelo_equipo}</Text> : null}
              {service.numero_serie_equipo ? <Text style={styles.text}>Serie: {service.numero_serie_equipo}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Fechas</Text>
              <Text style={styles.text}>Solicitado: {new Date(service.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              {service.updated_at ? <Text style={styles.text}>Actualizado: {new Date(service.updated_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</Text> : null}
            </View>
          </>
        )}

        {/* Payments tab */}
        {tab === 'pagos' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Pagos registrados</Text>
            {payments.length === 0 ? (
              <Text style={styles.emptyText}>Sin pagos registrados</Text>
            ) : payments.map((p) => (
              <View key={p.id} style={styles.listItem}>
                <Text style={styles.listTitle}>{p.metodo_pago || 'Pago'}</Text>
                <Text style={styles.listValue}>{p.monto ? `$${Number(p.monto).toFixed(2)} ${p.moneda || ''}` : ''}</Text>
                {p.estado_pago ? <StatusBadge status={p.estado_pago} /> : null}
              </View>
            ))}
            <Button title="+ Registrar pago" onPress={() => setModal('payment')} variant="secondary" style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Spare parts tab */}
        {tab === 'repuestos' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Repuestos utilizados</Text>
            {parts.length === 0 ? (
              <Text style={styles.emptyText}>Sin repuestos registrados</Text>
            ) : parts.map((p) => (
              <View key={p.id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{p.nombre}</Text>
                  <Text style={styles.listValue}>x{p.cantidad} {p.precio_unitario ? `- $${Number(p.precio_unitario).toFixed(2)} c/u` : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeletePart(p.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <Button title="+ Agregar repuesto" onPress={() => setModal('parts')} variant="secondary" style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Files tab */}
        {tab === 'archivos' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Archivos y evidencia</Text>
            {files.length === 0 ? (
              <Text style={styles.emptyText}>Sin archivos adjuntos</Text>
            ) : files.map((f) => (
              <View key={f.id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listTitle}>{f.descripcion || f.tipo || 'Archivo'}</Text>
                  <Text style={styles.listValue} numberOfLines={1}>{f.url}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteFile(f.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            <Button title="+ Agregar archivo" onPress={() => setModal('files')} variant="secondary" style={{ marginTop: 12 }} />
          </View>
        )}

        {/* Warranty tab */}
        {tab === 'garantia' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Garantía</Text>
            {warranty ? (
              <>
                <Text style={styles.text}>{warranty.descripcion}</Text>
                {warranty.duracion_dias ? <Text style={styles.subtext}>Duración: {warranty.duracion_dias} días</Text> : null}
                <StatusBadge status={warranty.activa ? 'activo' : 'inactivo'} />
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>Sin garantía registrada</Text>
                <Button title="+ Crear garantía" onPress={() => setModal('warranty')} variant="secondary" style={{ marginTop: 12 }} />
              </>
            )}
          </View>
        )}

        {/* Tab switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
              <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Actions */}
        {isActive && (
          <View style={styles.actions}>
            <Text style={styles.sectionTitle}>Acciones</Text>

            {statusName === 'solicitado' && (
              <Button title="Enviar cotización" onPress={() => setModal('quote')} style={{ marginBottom: 8 }} />
            )}

            {nextSteps.map((step) => (
              <Button
                key={step.estado}
                title={step.label}
                onPress={() => handleUpdateStatus(step.estado)}
                loading={actionLoading}
                variant="secondary"
                style={{ marginBottom: 8 }}
              />
            ))}

            <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate('Chat')}>
              <Ionicons name="chatbubbles" size={18} color={colors.primary} />
              <Text style={styles.chatBtnText}>Abrir chat con el cliente</Text>
            </TouchableOpacity>

            {statusName !== 'finalizado' && statusName !== 'cancelado' && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                <Text style={styles.cancelBtnText}>Cancelar servicio</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* MODALS */}
      <Modal visible={modal === 'quote'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar cotización</Text>
              <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            <Input label="Mano de obra ($)" value={precioManoObra} onChangeText={setPrecioManoObra} keyboardType="numeric" placeholder="0" />
            <Input label="Domicilio ($)" value={precioDomicilio} onChangeText={setPrecioDomicilio} keyboardType="numeric" placeholder="0" />
            <Input label="Diagnóstico ($)" value={precioDiagnostico} onChangeText={setPrecioDiagnostico} keyboardType="numeric" placeholder="0" />
            <Input label="Nota (opcional)" value={notaPrecio} onChangeText={setNotaPrecio} placeholder="Detalles adicionales..." multiline numberOfLines={2} />
            <Button title="Enviar" onPress={handleSendQuote} loading={actionLoading} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'parts'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar repuesto</Text>
              <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            <Input label="Nombre" value={partName} onChangeText={setPartName} placeholder="Ej: Pantalla LCD" />
            <Input label="Cantidad" value={partQty} onChangeText={setPartQty} keyboardType="numeric" />
            <Input label="Precio unitario" value={partPrice} onChangeText={setPartPrice} keyboardType="numeric" placeholder="0" />
            <Button title="Agregar" onPress={handleAddPart} loading={actionLoading} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'files'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar archivo</Text>
              <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            <Input label="URL del archivo" value={fileUrl} onChangeText={setFileUrl} placeholder="https://..." autoCapitalize="none" />
            <Input label="Descripción (opcional)" value={fileDesc} onChangeText={setFileDesc} placeholder="Ej: Foto del equipo" />
            <Button title="Agregar" onPress={handleAddFile} loading={actionLoading} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'warranty'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear garantía</Text>
              <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            <Input label="Descripción" value={warrantyDesc} onChangeText={setWarrantyDesc} placeholder="Garantía del trabajo realizado..." multiline numberOfLines={3} />
            <Input label="Duración (días)" value={warrantyDuration} onChangeText={setWarrantyDuration} keyboardType="numeric" placeholder="30" />
            <Button title="Crear garantía" onPress={handleAddWarranty} loading={actionLoading} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={modal === 'payment'} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Registrar pago</Text>
              <TouchableOpacity onPress={() => setModal(null)}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
            </View>
            <Input label="Monto" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="numeric" placeholder="0" />
            <Text style={styles.label}>Método de pago</Text>
            <View style={styles.chipRow}>
              {['efectivo', 'transferencia', 'tarjeta', 'otro'].map((m) => (
                <TouchableOpacity key={m} style={[styles.chip, paymentMethod === m && styles.chipSelected]} onPress={() => setPaymentMethod(m)}>
                  <Text style={[styles.chipText, paymentMethod === m && styles.chipTextSelected]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Button title="Registrar" onPress={handleAddPayment} loading={actionLoading} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#6b7280', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  headerInfo: { flex: 1, marginRight: 8 },
  type: { fontSize: 20, fontWeight: '700', color: '#111827' },
  code: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  meta: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  text: { fontSize: 15, color: '#111827', marginBottom: 4 },
  subtext: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginVertical: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  listValue: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  tabsRow: { marginBottom: 12, flexGrow: 0 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  tabActive: { backgroundColor: '#2563eb' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  tabTextActive: { color: '#fff' },
  actions: { marginTop: 4 },
  chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginTop: 8 },
  chatBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginTop: 4 },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.danger },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  chipSelected: { backgroundColor: '#dbeafe' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextSelected: { color: '#1d4ed8' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
});
