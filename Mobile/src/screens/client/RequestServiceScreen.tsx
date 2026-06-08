import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getServiceTypes, requestService } from '../../services/service.service';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ErrorMessage from '../../components/ErrorMessage';
import LocationMapPicker from '../../components/maps/LocationMapPicker';
import { colors, radii, shadows } from '../../theme';
import { toUploadFile } from '../../utils/uploads';

interface EquipmentType {
  id: number;
  nombre: string;
}

type ServiceLocation = {
  lat: number;
  lng: number;
  address?: string;
};

const PRIORITY_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

const MODALITY_OPTIONS = [
  { value: 'domicilio', label: 'A domicilio', icon: 'home' as const },
  { value: 'taller', label: 'En taller', icon: 'business' as const },
];

const MAX_PHOTOS = 5;

export default function RequestServiceScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [fetchingTypes, setFetchingTypes] = useState(true);

  const [tipoEquipoId, setTipoEquipoId] = useState('');
  const [descripcionProblema, setDescripcionProblema] = useState('');
  const [modalidad, setModalidad] = useState('domicilio');
  const [marcaEquipo, setMarcaEquipo] = useState('');
  const [modeloEquipo, setModeloEquipo] = useState('');
  const [numeroSerieEquipo, setNumeroSerieEquipo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [referenciaDireccion, setReferenciaDireccion] = useState('');
  const [prioridad, setPrioridad] = useState('normal');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<ServiceLocation | null>(null);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTypes() {
      try {
        const response = await getServiceTypes();
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron cargar los tipos de equipo');
        }
        setEquipmentTypes(data.serviceTypes || []);
      } catch {
        setError('No se pudieron cargar los tipos de equipo');
      } finally {
        setFetchingTypes(false);
      }
    }

    loadTypes();
  }, []);

  useEffect(() => {
    if (selectedLocation?.address) {
      setDireccion(selectedLocation.address);
    }
  }, [selectedLocation?.address]);

  async function pickImages() {
    if (photos.length >= MAX_PHOTOS) {
      setError('Solo se permiten hasta 5 fotos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.82,
    });

    if (!result.canceled) {
      setPhotos((current) => [...current, ...result.assets].slice(0, MAX_PHOTOS));
    }
  }

  async function handleSubmit() {
    setError('');

    if (!tipoEquipoId) {
      setError('Selecciona un tipo de equipo');
      return;
    }

    if (!descripcionProblema.trim()) {
      setError('Describe el problema');
      return;
    }

    if (!modalidad) {
      setError('Selecciona la modalidad');
      return;
    }

    if (modalidad === 'domicilio') {
      if (!direccion.trim()) {
        setError('Ingresa la dirección para el servicio a domicilio');
        return;
      }

      if (!selectedLocation) {
        setError('Selecciona un punto exacto en el mapa o usa tu ubicación actual');
        return;
      }
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('tipoEquipoId', tipoEquipoId);
      formData.append('descripcionProblema', descripcionProblema.trim());
      formData.append('modalidad', modalidad);
      formData.append('prioridad', prioridad);

      if (marcaEquipo.trim()) formData.append('marcaEquipo', marcaEquipo.trim());
      if (modeloEquipo.trim()) formData.append('modeloEquipo', modeloEquipo.trim());
      if (numeroSerieEquipo.trim()) formData.append('numeroSerieEquipo', numeroSerieEquipo.trim());
      if (fechaCompromiso) formData.append('fechaCompromiso', fechaCompromiso);

      if (modalidad === 'domicilio' && selectedLocation) {
        formData.append('direccion', direccion.trim());
        if (referenciaDireccion.trim()) formData.append('referenciaDireccion', referenciaDireccion.trim());
        formData.append('latitud', String(selectedLocation.lat));
        formData.append('longitud', String(selectedLocation.lng));
      }

      photos.forEach((photo, index) => {
        formData.append('fotos', toUploadFile(photo, `photo_${index + 1}`) as unknown as Blob);
      });

      const response = await requestService(formData);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Error al solicitar el servicio');
      }

      navigation.goBack();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Error al solicitar el servicio');
    } finally {
      setLoading(false);
    }
  }

  const isDomicilio = modalidad === 'domicilio';
  const reachedPhotoLimit = photos.length >= MAX_PHOTOS;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.heroBadgeText}>Solicitud guiada</Text>
          </View>
          <Text style={styles.heroTitle}>Describe tu equipo y deja listo el servicio en pocos pasos</Text>
          <Text style={styles.heroSubtitle}>
            Usa los colores del proyecto, selecciona la ubicacion en el mapa y adjunta fotos para acelerar la atencion.
          </Text>
        </View>

        <ErrorMessage message={error} />

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Datos del equipo</Text>

          <Text style={styles.label}>Tipo de equipo *</Text>
          {fetchingTypes ? (
            <Text style={styles.loadingText}>Cargando tipos...</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipList}>
              {equipmentTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.chip, tipoEquipoId === String(type.id) && styles.chipSelected]}
                  onPress={() => setTipoEquipoId(String(type.id))}
                >
                  <Text style={[styles.chipText, tipoEquipoId === String(type.id) && styles.chipTextSelected]}>
                    {type.nombre}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Input
            label="Descripción del problema *"
            value={descripcionProblema}
            onChangeText={setDescripcionProblema}
            placeholder="Describe qué falla tiene, desde cuándo, si suena raro, no enciende o se apaga."
            multiline
            numberOfLines={4}
          />

          <View style={styles.grid2}>
            <Input
              label="Marca del equipo"
              value={marcaEquipo}
              onChangeText={setMarcaEquipo}
              placeholder="Ej: Dell, Samsung, HP"
              autoCapitalize="words"
              style={styles.gridItem}
            />
            <Input
              label="Modelo del equipo"
              value={modeloEquipo}
              onChangeText={setModeloEquipo}
              placeholder="Ej: Inspiron 15, Galaxy S22"
              autoCapitalize="sentences"
              style={styles.gridItem}
            />
          </View>

          <Input
            label="Número de serie"
            value={numeroSerieEquipo}
            onChangeText={setNumeroSerieEquipo}
            placeholder="Ej: SN-123456789"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Modalidad de atención *</Text>
          <View style={styles.optionRow}>
            {MODALITY_OPTIONS.map((option) => {
              const selected = modalidad === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionChip, selected && styles.optionChipSelected]}
                  onPress={() => setModalidad(option.value)}
                >
                  <Ionicons name={option.icon} size={18} color={selected ? colors.primary : colors.mutedSoft} />
                  <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isDomicilio ? (
            <>
              <LocationMapPicker
                value={selectedLocation}
                onChange={(nextLocation) => {
                  setSelectedLocation(nextLocation);
                  if (nextLocation?.address) {
                    setDireccion(nextLocation.address);
                  }
                }}
                defaultToCurrentLocation
              />

              <View style={styles.grid2}>
                <Input
                  label="Dirección *"
                  value={direccion}
                  onChangeText={setDireccion}
                  placeholder="Dirección donde se realizará el servicio"
                  autoCapitalize="sentences"
                  style={styles.gridItem}
                />
                <Input
                  label="Referencia (opcional)"
                  value={referenciaDireccion}
                  onChangeText={setReferenciaDireccion}
                  placeholder="Ej: Casa azul, junto a la farmacia"
                  autoCapitalize="sentences"
                  style={styles.gridItem}
                />
              </View>

              {selectedLocation ? (
                <View style={styles.locationSummary}>
                  <Ionicons name="location" size={18} color={colors.accent} />
                  <Text style={styles.locationSummaryText}>
                    {selectedLocation.address || `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.infoBox}>
              <Ionicons name="business" size={18} color={colors.primary} />
              <Text style={styles.infoText}>
                Para servicios en taller no se requiere ubicación. El técnico te indicará la dirección de su local.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferencias y fotos</Text>

          <Text style={styles.label}>Prioridad</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipList}>
            {PRIORITY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.chip, prioridad === option.value && styles.chipSelected]}
                onPress={() => setPrioridad(option.value)}
              >
                <Text style={[styles.chipText, prioridad === option.value && styles.chipTextSelected]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Input
            label="Fecha deseada (opcional)"
            value={fechaCompromiso}
            onChangeText={setFechaCompromiso}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />

          <View style={styles.photoCard}>
            <View style={styles.photoCardHeader}>
              <View style={styles.photoCardInfo}>
                <Text style={styles.photoTitle}>Fotos del equipo</Text>
                <Text style={styles.photoSubtitle}>Adjunta hasta {MAX_PHOTOS} imágenes JPG, PNG o WEBP.</Text>
              </View>
              <TouchableOpacity
                style={[styles.photoAction, reachedPhotoLimit && styles.photoActionDisabled]}
                onPress={pickImages}
                disabled={reachedPhotoLimit}
              >
                <Ionicons name="camera" size={16} color={reachedPhotoLimit ? colors.mutedSoft : colors.primary} />
                <Text style={[styles.photoActionText, reachedPhotoLimit && styles.photoActionTextDisabled]}>
                  {reachedPhotoLimit ? 'Límite' : 'Agregar'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.photoRow}>
              {photos.map((photo, index) => (
                <View key={`${photo.uri}-${index}`} style={styles.photoPreview}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.removePhoto}
                    onPress={() => setPhotos((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {photos.length === 0 ? (
                <View style={styles.emptyPhotos}>
                  <Ionicons name="images-outline" size={28} color={colors.mutedSoft} />
                  <Text style={styles.emptyPhotosText}>Sin fotos adjuntas</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Button title="Solicitar Servicio" onPress={handleSubmit} loading={loading} style={styles.submitButton} />

        <TouchableOpacity style={styles.backLink} onPress={navigation.goBack}>
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={styles.backLinkText}>Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.xl,
    padding: 20,
    gap: 12,
    ...shadows.card,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  heroTitle: {
    color: colors.surface,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#dbe6ff',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },
  chipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.primary,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  optionTextSelected: {
    color: colors.primary,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
  },
  gridItem: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    padding: 14,
  },
  infoText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  locationSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  locationSummaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  photoCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  photoCardHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  photoCardInfo: { flexShrink: 1, minWidth: 160 },
  photoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  photoSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexShrink: 0,
  },
  photoActionDisabled: {
    opacity: 0.6,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  photoActionTextDisabled: {
    color: colors.mutedSoft,
  },
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoPreview: {
    width: 74,
    height: 74,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  emptyPhotos: {
    minWidth: 120,
    minHeight: 74,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
  },
  emptyPhotosText: {
    color: colors.mutedSoft,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButton: {
    marginTop: 4,
  },
  backLink: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
