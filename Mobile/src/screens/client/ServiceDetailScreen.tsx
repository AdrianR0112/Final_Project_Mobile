import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, RefreshControl, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { getMyServiceById, getServiceHistoryById, acceptInitialQuote, rejectInitialQuote, cancelServiceRequest } from '../../services/service.service';
import { getPaymentsForService, createPayment } from '../../services/payment.service';
import { getWarrantyForService } from '../../services/warranty.service';
import { getServiceFiles, uploadServiceFile } from '../../services/service-file.service';
import { getSparePartsForService } from '../../services/spare-part.service';
import { getMyRatingForService, rateService } from '../../services/rating.service';
import { markServiceMessagesAsRead } from '../../services/chat.service';
import StatusBadge from '../../components/StatusBadge';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ErrorMessage from '../../components/ErrorMessage';
import LoadingSpinner from '../../components/LoadingSpinner';
import ServiceLocationMap from '../../components/maps/ServiceLocationMap';
import { colors, radii, shadows } from '../../theme';
import { toUploadFile } from '../../utils/uploads';

type Props = {
  route: { params: { id: number } };
  navigation: { navigate: (screen: string, params?: Record<string, unknown>) => void; goBack: () => void };
};

interface ServiceData {
  id: number;
  codigo_servicio?: string;
  descripcion_problema?: string;
  direccion?: string;
  tipo_equipo?: string;
  marca_equipo?: string;
  modelo_equipo?: string;
  estado?: string;
  estado_pago?: string;
  estado_precio?: string;
  modalidad?: string;
  prioridad?: string;
  fecha_solicitud?: string;
  latitud?: number;
  longitud?: number;
  notas_tecnico?: string;
  precio_diagnostico?: number;
  precio_mano_obra?: number;
  precio_repuestos?: number;
  precio_domicilio?: number;
  precio_acordado?: number;
  nota_precio?: string;
  tecnico_nombre_completo?: string;
  tecnico_id?: number;
}

function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    solicitado: 'Solicitado',
    asignado: 'Asignado',
    cotizacion_inicial_enviada: 'Cotización enviada',
    aceptado: 'Aceptado',
    en_camino: 'Técnico en camino',
    en_reparacion: 'En reparación',
    pendiente_pago: 'Pendiente de pago',
    pago_enviado: 'Pago enviado',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
  };
  return labels[state] || state.replace(/_/g, ' ');
}

function formatAmount(value: number): string {
  return Number(value || 0).toLocaleString('es-CO', { minimumFractionDigits: 2 });
}

function getServiceTitle(s: ServiceData): string {
  const type = s.tipo_equipo || 'Servicio';
  const brandModel = [s.marca_equipo, s.modelo_equipo].filter(Boolean).join(' ');
  return brandModel ? `${type} ${brandModel}` : type;
}

const TABS = ['Resumen', 'Acciones', 'Pagos', 'Repuestos', 'Archivos', 'Garantía', 'Historial'];

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];

export default function ServiceDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [service, setService] = useState<ServiceData | null>(null);
  const [history, setHistory] = useState<{ id: number; estado: string; observacion: string; fecha: string }[]>([]);
  const [payments, setPayments] = useState<{ id: number; method: string; amount: number; currency: string; state: string; reference?: string; receiptUrl?: string; notes?: string }[]>([]);
  const [warranty, setWarranty] = useState<{ description: string; durationDays: number; startDate: string; endDate: string; active: boolean; observations?: string } | null>(null);
  const [files, setFiles] = useState<{ id: number; url: string; type: string; description?: string }[]>([]);
  const [parts, setParts] = useState<{ id: number; name: string; quantity: number; subtotal: number }[]>([]);
  const [rating, setRating] = useState<{ score: number; comment?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('Resumen');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [paymentMsg, setPaymentMsg] = useState('');
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);
  const [serviceFile, setServiceFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [serviceFileType, setServiceFileType] = useState('imagen');
  const [serviceFileStage, setServiceFileStage] = useState('durante');
  const [serviceFileDescription, setServiceFileDescription] = useState('');
  const [fileUploading, setFileUploading] = useState(false);
  const [fileMessage, setFileMessage] = useState('');

  const diagnosticPrice = Number(service?.precio_diagnostico || 0);
  const laborPrice = Number(service?.precio_mano_obra || 0);
  const partsPrice = parts.reduce((t, p) => t + (p.subtotal || 0), 0) || Number(service?.precio_repuestos || 0);
  const travelPrice = Number(service?.precio_domicilio || 0);
  const totalPrice = diagnosticPrice + laborPrice + partsPrice + travelPrice;
  const agreedPrice = service?.precio_acordado ?? null;
  const hasRating = Boolean(rating);
  const status = service?.estado || '';
  const imageFiles = files.filter((f) => f.type?.toLowerCase() === 'imagen');
  const extraFiles = files.filter((f) => f.type?.toLowerCase() !== 'imagen');
  const canCancel = service && !['en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado', 'finalizado', 'cancelado'].includes(status);
  const paymentRequiresReceipt = ['transferencia', 'tarjeta', 'otro'].includes(paymentMethod);

  async function loadAll() {
    if (!id) return;
    try {
      setError('');
      const [serviceRes, historyRes, paymentsRes, warrantyRes, filesRes, partsRes, ratingRes] = await Promise.all([
        getMyServiceById(id),
        getServiceHistoryById(id),
        getPaymentsForService(id),
        getWarrantyForService(id),
        getServiceFiles(id),
        getSparePartsForService(id),
        getMyRatingForService(id),
      ]);

      const sData = await serviceRes.json().catch(() => ({}));
      const hData = await historyRes.json().catch(() => ({}));
      const pData = await paymentsRes.json().catch(() => ({}));
      const wData = await warrantyRes.json().catch(() => ({}));
      const fData = await filesRes.json().catch(() => ({}));
      const ptData = await partsRes.json().catch(() => ({}));
      const rData = await ratingRes.json().catch(() => ({}));

      if (serviceRes.ok) setService(sData.serviceRequest || sData.service || sData);
      if (historyRes.ok) setHistory(hData.history || []);
      if (paymentsRes.ok) setPayments(pData.payments || []);
      if (warrantyRes.ok) setWarranty(wData.warranty || null);
      if (filesRes.ok) setFiles(fData.files || []);
      if (partsRes.ok) setParts(ptData.parts || []);
      if (ratingRes.ok) setRating(rData.rating || null);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { loadAll(); }, [id]));
  useEffect(() => { loadAll(); }, [id]);

  // Auto-open modals based on service status
  useEffect(() => {
    if (!service || loading) return;
    if (service.estado === 'cotizacion_inicial_enviada') {
      setShowQuoteModal(true);
    } else if (service.estado === 'pendiente_pago') {
      setShowPaymentModal(true);
    } else if (service.estado === 'finalizado' && !rating) {
      setShowRatingModal(true);
    }
  }, [service?.estado, loading]);

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  async function handleAcceptQuote() {
    setActionLoading(true);
    try {
      const res = await acceptInitialQuote(id);
      const data = await res.json();
      if (res.ok) { setService(data.serviceRequest || data); setShowQuoteModal(false); }
      else setError(data.message || 'Error');
    } catch { setError('Error al aceptar'); }
    finally { setActionLoading(false); }
  }

  async function handleRejectQuote() {
    setActionLoading(true);
    try {
      const res = await rejectInitialQuote(id);
      const data = await res.json();
      if (res.ok) { setService(data.serviceRequest || data); setShowQuoteModal(false); }
      else setError(data.message || 'Error');
    } catch { setError('Error al rechazar'); }
    finally { setActionLoading(false); }
  }

  async function handleCancel() {
    setActionLoading(true);
    try {
      const res = await cancelServiceRequest(id);
      const data = await res.json();
      if (res.ok) { setService(data.serviceRequest || data); }
      else setError(data.message || 'Error');
    } catch { setError('Error al cancelar'); }
    finally { setActionLoading(false); }
  }

  async function handlePaymentSubmit() {
    if (paymentRequiresReceipt && !paymentReceipt) {
      setPaymentMsg('Debes adjuntar el comprobante para este método.');
      return;
    }
    setActionLoading(true);
    setPaymentMsg('');
    try {
      const formData = new FormData();
      formData.append('metodoPago', paymentMethod);
      formData.append('monto', String(totalPrice));
      if (paymentMethod !== 'efectivo' && paymentRef.trim()) formData.append('referenciaTransaccion', paymentRef.trim());
      if (paymentNotes.trim()) formData.append('notas', paymentNotes.trim());
      if (paymentRequiresReceipt && paymentReceipt) {
        formData.append('comprobante', { uri: paymentReceipt.uri, name: 'comprobante.jpg', type: 'image/jpeg' } as unknown as Blob);
      }
      const res = await createPayment(id, formData);
      const data = await res.json();
      if (res.ok) {
        setPayments((prev) => [data.payment, ...prev]);
        setService(data.serviceRequest || service);
        setPaymentMsg(data.message || 'Pago registrado');
        setPaymentRef(''); setPaymentNotes(''); setPaymentReceipt(null);
        await loadAll();
      } else setPaymentMsg(data.message || 'Error');
    } catch { setPaymentMsg('Error al registrar pago'); }
    finally { setActionLoading(false); }
  }

  async function handleRate() {
    if (ratingScore === 0) return;
    setRatingLoading(true);
    try {
      const res = await rateService(id, { calificacion: ratingScore, comentario: ratingComment });
      const data = await res.json();
      if (res.ok) { setRating(data.rating || { score: ratingScore, comment: ratingComment }); setShowRatingModal(false); }
    } catch { /* fail silently */ }
    finally { setRatingLoading(false); }
  }

  async function pickReceipt() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setPaymentReceipt(result.assets[0]);
  }

  async function pickServiceFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: ['image/*', 'application/pdf'],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setServiceFile(asset);
      setServiceFileType(asset.mimeType?.startsWith('image/') ? 'imagen' : 'documento');
      setFileMessage('');
    }
  }

  async function handleUploadServiceFile() {
    if (!serviceFile) {
      setFileMessage('Selecciona un archivo primero');
      return;
    }

    setFileUploading(true);
    setFileMessage('');

    try {
      const payload = {
        archivo: toUploadFile(serviceFile, 'service_file'),
        tipo: serviceFileType,
        etapa: serviceFileStage,
        descripcion: serviceFileDescription.trim() || undefined,
      };

      const response = await uploadServiceFile(id, payload);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo agregar el archivo');
      }

      setFiles((current) => [data.file, ...current]);
      setServiceFile(null);
      setServiceFileDescription('');
      setServiceFileStage('durante');
      setServiceFileType('imagen');
      setFileMessage(data.message || 'Archivo agregado correctamente');
    } catch (uploadError) {
      setFileMessage(uploadError instanceof Error ? uploadError.message : 'No se pudo agregar el archivo');
    } finally {
      setFileUploading(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!service) return <View style={styles.centered}><Text style={styles.emptyText}>Servicio no encontrado</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} contentContainerStyle={styles.content}>
        <ErrorMessage message={error} />

        <View style={styles.header}>
          <Text style={styles.serviceTitle}>{getServiceTitle(service)}</Text>
          <StatusBadge status={status} />
        </View>

        <Text style={styles.code}>Código: {service.codigo_servicio || `#${service.id}`}</Text>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Tab Content */}
        {activeTab === 'Resumen' && (
          <View style={styles.tabContent}>
            <View style={styles.summaryHero}>
              <View style={styles.summaryHeroTop}>
                <Text style={styles.summaryTitle}>Descripción</Text>
                <StatusBadge status={status} />
              </View>
              <Text style={styles.text}>{service.descripcion_problema || 'Sin descripción'}</Text>
            </View>

            <View style={styles.detailGrid}>
              <DetailItem label="Modalidad" value={service.modalidad || '—'} />
              <DetailItem label="Prioridad" value={service.prioridad || 'normal'} />
              <DetailItem label="Dirección" value={service.direccion || '—'} />
              <DetailItem label="Técnico" value={service.tecnico_nombre_completo || 'Sin asignar'} />
              <DetailItem label="Estado pago" value={service.estado_pago || 'pendiente'} />
              <DetailItem label="Estado precio" value={service.estado_precio || 'sin_cotizar'} />
              <DetailItem label="Solicitado" value={service.fecha_solicitud ? new Date(service.fecha_solicitud).toLocaleDateString('es-CO') : '—'} />
            </View>

            <View style={{ marginTop: 16 }}>
              <ServiceLocationMap
                location={service?.latitud && service?.longitud ? {
                  lat: service.latitud,
                  lng: service.longitud,
                  address: service.direccion,
                } : null}
              />
            </View>

            {service.notas_tecnico ? <><Text style={styles.sectionTitle}>Notas del técnico</Text><Text style={styles.text}>{service.notas_tecnico}</Text></> : null}
          </View>
        )}

        {activeTab === 'Acciones' && (
          <View style={styles.tabContent}>
            {status === 'cotizacion_inicial_enviada' && (
              <View style={{ gap: 10 }}>
                <Button title="Ver cotización" onPress={() => setShowQuoteModal(true)} variant="secondary" />
                <Button title="Aceptar cotización" onPress={handleAcceptQuote} loading={actionLoading} />
                <Button title="Rechazar cotización" onPress={handleRejectQuote} variant="danger" loading={actionLoading} />
              </View>
            )}
            {status === 'pendiente_pago' && (
              <Button title="Ver cobro final" onPress={() => setShowPaymentModal(true)} variant="secondary" />
            )}
            {status === 'pago_enviado' && (
              <View style={styles.infoBox}><Text style={styles.infoText}>El pago ya fue enviado. El técnico debe validarlo para finalizar el servicio.</Text></View>
            )}
            {status === 'finalizado' && !hasRating && (
              <Button title="Calificar servicio" onPress={() => setShowRatingModal(true)} variant="secondary" />
            )}
            {canCancel && (
              <Button title="Cancelar solicitud" variant="danger" onPress={handleCancel} loading={actionLoading} style={{ marginTop: 10 }} />
            )}
            {service.tecnico_id && (
              <Button title="Abrir chat" variant="secondary" onPress={() => navigation.navigate('Chat', { serviceId: id })} style={{ marginTop: 10 }} />
            )}
          </View>
        )}

        {activeTab === 'Pagos' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Desglose de costos</Text>
            <View style={styles.costRow}><Text style={styles.costLabel}>Diagnóstico</Text><Text style={styles.costValue}>${formatAmount(diagnosticPrice)}</Text></View>
            <View style={styles.costRow}><Text style={styles.costLabel}>Mano de obra</Text><Text style={styles.costValue}>${formatAmount(laborPrice)}</Text></View>
            <View style={styles.costRow}><Text style={styles.costLabel}>Repuestos</Text><Text style={styles.costValue}>${formatAmount(partsPrice)}</Text></View>
            <View style={styles.costRow}><Text style={styles.costLabel}>Domicilio</Text><Text style={styles.costValue}>${formatAmount(travelPrice)}</Text></View>
            <View style={[styles.costRow, { borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 10, marginTop: 4 }]}>
              <Text style={[styles.costLabel, { fontWeight: '700' }]}>Total</Text>
              <Text style={[styles.costValue, { fontWeight: '700', color: '#2563eb' }]}>${formatAmount(totalPrice)}</Text>
            </View>
            {agreedPrice !== null && (
              <View style={styles.costRow}><Text style={styles.costLabel}>Acordado</Text><Text style={styles.costValue}>${formatAmount(agreedPrice)}</Text></View>
            )}
            {service.nota_precio ? <Text style={[styles.text, { marginTop: 10 }]}>{service.nota_precio}</Text> : null}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Pagos registrados</Text>
            {payments.length === 0 ? (
              <Text style={styles.emptyText}>No hay pagos</Text>
            ) : payments.map((p) => (
              <View key={p.id} style={styles.card}>
                <Text style={styles.cardTitle}>{p.method} · ${formatAmount(p.amount)} {p.currency}</Text>
                <Text style={styles.cardSubtext}>Estado: {p.state}</Text>
                {p.reference ? <Text style={styles.cardSubtext}>Ref: {p.reference}</Text> : null}
                {p.notes ? <Text style={styles.cardSubtext}>{p.notes}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Repuestos' && (
          <View style={styles.tabContent}>
            {parts.length === 0 ? <Text style={styles.emptyText}>No hay repuestos registrados</Text> :
              parts.map((p) => (
                <View key={p.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{p.name}</Text>
                  <Text style={styles.cardSubtext}>Cantidad: {p.quantity} · Subtotal: ${formatAmount(p.subtotal)}</Text>
                </View>
              ))}
          </View>
        )}

        {activeTab === 'Archivos' && (
          <View style={styles.tabContent}>
            <View style={styles.uploadCard}>
              <View style={styles.uploadHeader}>
                <View>
                  <Text style={styles.uploadTitle}>Subir archivo</Text>
                  <Text style={styles.uploadSubtitle}>Adjunta una imagen o PDF para dejar evidencia del servicio.</Text>
                </View>
                <TouchableOpacity style={styles.pickButton} onPress={pickServiceFile}>
                  <Ionicons name="document-attach-outline" size={16} color={colors.primary} />
                  <Text style={styles.pickButtonText}>{serviceFile ? serviceFile.name || 'Archivo listo' : 'Seleccionar'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.uploadMetaRow}>
                <TouchableOpacity
                  style={[styles.metaChip, serviceFileType === 'imagen' && styles.metaChipSelected]}
                  onPress={() => setServiceFileType('imagen')}
                >
                  <Text style={[styles.metaChipText, serviceFileType === 'imagen' && styles.metaChipTextSelected]}>Imagen</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.metaChip, serviceFileType === 'documento' && styles.metaChipSelected]}
                  onPress={() => setServiceFileType('documento')}
                >
                  <Text style={[styles.metaChipText, serviceFileType === 'documento' && styles.metaChipTextSelected]}>Documento</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stageRow}>
                {['antes', 'durante', 'despues', 'otro'].map((stage) => (
                  <TouchableOpacity
                    key={stage}
                    style={[styles.stageChip, serviceFileStage === stage && styles.stageChipSelected]}
                    onPress={() => setServiceFileStage(stage)}
                  >
                    <Text style={[styles.stageChipText, serviceFileStage === stage && styles.stageChipTextSelected]}>
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input
                label="Descripción (opcional)"
                value={serviceFileDescription}
                onChangeText={setServiceFileDescription}
                placeholder="Ej: Pantalla rota, comprobante, diagnóstico..."
                multiline
                numberOfLines={2}
              />

              {serviceFile ? (
                <View style={styles.filePreviewBox}>
                  <Ionicons name={serviceFile.mimeType?.startsWith('image/') ? 'image-outline' : 'document-outline'} size={18} color={colors.primary} />
                  <Text style={styles.filePreviewText}>{serviceFile.name || 'Archivo seleccionado'}</Text>
                </View>
              ) : null}

              {fileMessage ? <Text style={[styles.helperText, fileMessage.includes('No se pudo') ? styles.errorText : styles.successText]}>{fileMessage}</Text> : null}

              <Button
                title={fileUploading ? 'Subiendo archivo...' : 'Guardar archivo'}
                onPress={handleUploadServiceFile}
                loading={fileUploading}
                disabled={!serviceFile}
              />
            </View>

            {files.length === 0 ? <Text style={styles.emptyText}>No hay archivos adjuntos</Text> : (
              <>
                {imageFiles.map((f) => (
                  <TouchableOpacity key={f.id} style={styles.fileCard} onPress={() => Linking.openURL(f.url)}>
                    <Image source={{ uri: f.url }} style={styles.fileImage} />
                    <View style={styles.fileMetaRow}>
                      <Text style={styles.cardSubtext}>{f.description || 'Imagen'}</Text>
                      <Ionicons name="open-outline" size={16} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                ))}
                {extraFiles.map((f) => (
                  <TouchableOpacity key={f.id} style={styles.card} onPress={() => Linking.openURL(f.url)}>
                    <Text style={styles.cardTitle}>{f.description || f.type}</Text>
                    <Text style={styles.cardSubtext}>{f.url}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === 'Garantía' && (
          <View style={styles.tabContent}>
            {!warranty ? <Text style={styles.emptyText}>Sin garantía registrada</Text> : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{warranty.description}</Text>
                <Text style={styles.cardSubtext}>Duración: {warranty.durationDays} días</Text>
                <Text style={styles.cardSubtext}>Inicio: {warranty.startDate}</Text>
                <Text style={styles.cardSubtext}>Fin: {warranty.endDate}</Text>
                <Text style={styles.cardSubtext}>Activa: {warranty.active ? 'Sí' : 'No'}</Text>
                {warranty.observations ? <Text style={styles.cardSubtext}>Obs: {warranty.observations}</Text> : null}
              </View>
            )}
          </View>
        )}

        {activeTab === 'Historial' && (
          <View style={styles.tabContent}>
            {history.length === 0 ? <Text style={styles.emptyText}>Sin historial</Text> :
              history.map((h) => (
                <View key={h.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{getStateLabel(h.estado)}</Text>
                  <Text style={styles.cardSubtext}>{h.observacion || 'Sin observación'}</Text>
                  <Text style={styles.cardDate}>{h.fecha ? new Date(h.fecha).toLocaleString('es-CO') : '—'}</Text>
                </View>
              ))}
          </View>
        )}
      </ScrollView>

      {/* Quote Modal */}
      {showQuoteModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Cotización inicial</Text>
              <Text style={styles.modalSubtitle}>Total estimado: ${formatAmount(totalPrice)}</Text>
              <View style={{ marginTop: 12 }}>
                <View style={styles.costRow}><Text style={styles.costLabel}>Diagnóstico</Text><Text style={styles.costValue}>${formatAmount(diagnosticPrice)}</Text></View>
                <View style={styles.costRow}><Text style={styles.costLabel}>Mano de obra</Text><Text style={styles.costValue}>${formatAmount(laborPrice)}</Text></View>
                <View style={styles.costRow}><Text style={styles.costLabel}>Repuestos</Text><Text style={styles.costValue}>${formatAmount(partsPrice)}</Text></View>
                <View style={styles.costRow}><Text style={styles.costLabel}>Domicilio</Text><Text style={styles.costValue}>${formatAmount(travelPrice)}</Text></View>
              </View>
              {agreedPrice !== null && <Text style={styles.modalSubtitle}>Acordado: ${formatAmount(agreedPrice)}</Text>}
              {service.nota_precio ? <Text style={styles.text}>{service.nota_precio}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <View style={{ flex: 1 }}><Button title="Rechazar" variant="danger" onPress={handleRejectQuote} loading={actionLoading} /></View>
                <View style={{ flex: 1 }}><Button title="Aceptar" onPress={handleAcceptQuote} loading={actionLoading} /></View>
              </View>
              <Button title="Cerrar" variant="secondary" onPress={() => setShowQuoteModal(false)} style={{ marginTop: 8 }} />
            </ScrollView>
          </View>
        </View>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Cobro final</Text>
              <Text style={styles.label}>Método de pago</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity key={m.value} style={[styles.chip, paymentMethod === m.value && styles.chipSelected]} onPress={() => setPaymentMethod(m.value)}>
                    <Text style={[styles.chipText, paymentMethod === m.value && styles.chipTextSelected]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {paymentMethod !== 'efectivo' && (
                <Input label="Referencia de pago" value={paymentRef} onChangeText={setPaymentRef} placeholder="Número de referencia" />
              )}
              <Input label="Notas" value={paymentNotes} onChangeText={setPaymentNotes} placeholder="Notas adicionales (opcional)" multiline numberOfLines={2} />
              {paymentRequiresReceipt && (
                <TouchableOpacity style={styles.uploadBtn} onPress={pickReceipt}>
                  <Ionicons name="cloud-upload" size={24} color="#2563eb" />
                  <Text style={{ color: '#2563eb', marginLeft: 8 }}>{paymentReceipt ? paymentReceipt.fileName || 'Comprobante seleccionado' : 'Subir comprobante'}</Text>
                </TouchableOpacity>
              )}
              {paymentMsg ? <Text style={[styles.emptyText, { marginVertical: 8 }]}>{paymentMsg}</Text> : null}
              <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Resumen</Text>
              <View style={styles.costRow}><Text style={styles.costLabel}>Total a pagar</Text><Text style={[styles.costValue, { fontWeight: '700', color: '#2563eb', fontSize: 24 }]}>${formatAmount(totalPrice)}</Text></View>
              <Button title="Registrar pago" onPress={handlePaymentSubmit} loading={actionLoading} style={{ marginTop: 12 }} />
              <Button title="Cerrar" variant="secondary" onPress={() => setShowPaymentModal(false)} style={{ marginTop: 8 }} />
            </ScrollView>
          </View>
        </View>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Calificar servicio</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 16 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRatingScore(star)}>
                  <Ionicons name={star <= ratingScore ? 'star' : 'star-outline'} size={36} color={star <= ratingScore ? '#f59e0b' : '#d1d5db'} />
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Comentario (opcional)" value={ratingComment} onChangeText={setRatingComment} placeholder="Tu opinión sobre el servicio..." multiline numberOfLines={3} />
            <Button title="Enviar calificación" onPress={handleRate} loading={ratingLoading} disabled={ratingScore === 0} style={{ marginTop: 8 }} />
            <Button title="Cancelar" variant="secondary" onPress={() => setShowRatingModal(false)} style={{ marginTop: 8 }} />
          </View>
        </View>
      )}
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 14, color: '#111827' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryHero: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    ...shadows.card,
  },
  summaryHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
    flex: 1,
  },
  uploadCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    ...shadows.card,
  },
  uploadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  uploadSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  uploadMetaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  metaChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  metaChipTextSelected: {
    color: colors.primary,
  },
  stageRow: {
    flexGrow: 0,
  },
  stageChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
  },
  stageChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  stageChipText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  stageChipTextSelected: {
    color: colors.primary,
  },
  filePreviewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filePreviewText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 18,
  },
  successText: {
    color: colors.success,
  },
  errorText: {
    color: colors.danger,
  },
  fileMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  serviceTitle: { fontSize: 22, fontWeight: '800', color: colors.primaryDark, flex: 1, marginRight: 8 },
  code: { fontSize: 13, color: colors.mutedSoft, marginBottom: 16 },
  tabBar: { flexDirection: 'row', marginBottom: 16 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceAlt, marginRight: 8 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  tabTextActive: { color: '#fff' },
  tabContent: { paddingBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.primaryDark, marginTop: 14, marginBottom: 6 },
  text: { fontSize: 15, color: colors.text, lineHeight: 22 },
  detailGrid: { marginTop: 12 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  costLabel: { fontSize: 14, color: colors.muted },
  costValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  card: { backgroundColor: colors.surface, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardSubtext: { fontSize: 13, color: colors.muted },
  cardDate: { fontSize: 11, color: colors.mutedSoft, marginTop: 4 },
  fileCard: { marginBottom: 12 },
  fileImage: { width: '100%', height: 180, borderRadius: 10, backgroundColor: colors.surfaceAlt },
  infoBox: { backgroundColor: colors.primarySoft, padding: 14, borderRadius: 10, marginTop: 8, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  infoText: { color: colors.primary, fontSize: 14, flex: 1, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', color: colors.primaryDark, marginBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceAlt, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  chipTextSelected: { color: colors.primary },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', borderRadius: 10, marginBottom: 12, backgroundColor: colors.surfaceAlt },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,28,48,0.58)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
});
