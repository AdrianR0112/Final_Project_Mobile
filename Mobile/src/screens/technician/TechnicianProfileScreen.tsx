import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { getTechnicianProfile, updateTechnicianProfile, getSpecialties, updateTechnicianSpecialties } from '../../services/technician.service';
import { updateCurrentUser, uploadProfilePhoto, updateCurrentUserPassword } from '../../services/user.service';
import Button from '../../components/Button';
import Input from '../../components/Input';
import LoadingSpinner from '../../components/LoadingSpinner';
import { colors } from '../../theme';

interface Specialty {
  id: number;
  nombre: string;
}

export default function TechnicianProfileScreen() {
  const { user, logout, setUser } = useAuth();
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [correo, setCorreo] = useState((user?.correo as string) || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [descripcion, setDescripcion] = useState('');
  const [aniosExperiencia, setAniosExperiencia] = useState('');
  const [disponible, setDisponible] = useState(false);
  const [radioAtencionKm, setRadioAtencionKm] = useState('');
  const [tarifaBase, setTarifaBase] = useState('');
  const [tarifaDomicilio, setTarifaDomicilio] = useState('');
  const [direccionTaller, setDireccionTaller] = useState('');
  const [latitudTaller, setLatitudTaller] = useState('');
  const [longitudTaller, setLongitudTaller] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState((user?.foto_url as string) || '');
  const [allSpecialties, setAllSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<number[]>([]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const [profileRes, specsRes] = await Promise.all([
          getTechnicianProfile(),
          getSpecialties(),
        ]);

        const profileData = await profileRes.json();
        const specsData = await specsRes.json();

        const profile = profileData.profile || profileData.tecnico || profileData;
        setDescripcion(profile.descripcion || '');
        setAniosExperiencia(profile.aniosExperiencia ? String(profile.aniosExperiencia) : '');
        setDisponible(Boolean(profile.disponible));
        setRadioAtencionKm(profile.radioAtencionKm ? String(profile.radioAtencionKm) : '');
        setTarifaBase(profile.tarifaBase ? String(profile.tarifaBase) : '');
        setTarifaDomicilio(profile.tarifaDomicilio ? String(profile.tarifaDomicilio) : '');
        setDireccionTaller(profile.direccionTaller || '');
        setLatitudTaller(profile.latitudTaller ? String(profile.latitudTaller) : '');
        setLongitudTaller(profile.longitudTaller ? String(profile.longitudTaller) : '');
        if (Array.isArray(profile.especialidades)) {
          setSelectedSpecialtyIds(
            profile.especialidades
              .map((e: { id: number } | string) => (typeof e === 'object' ? e.id : null))
              .filter(Boolean),
          );
        }

        setAllSpecialties(specsData.specialties || specsData || []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setSaving(true);
      try {
        const file = {
          uri: result.assets[0].uri,
          name: 'profile_photo.jpg',
          type: 'image/jpeg',
        };
        const response = await uploadProfilePhoto(file);
        const data = await response.json();
        if (data.foto_url || data.user?.foto_url) {
          setPhotoUri(data.foto_url || data.user.foto_url);
          setUser({ ...(user!), foto_url: data.foto_url || data.user.foto_url });
        }
      } catch {
        Alert.alert('Error', 'No se pudo subir la foto');
      } finally {
        setSaving(false);
      }
    }
  }

  function toggleSpecialty(id: number) {
    setSelectedSpecialtyIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const profilePayload: Record<string, unknown> = {
        descripcion,
        aniosExperiencia: aniosExperiencia ? Number(aniosExperiencia) : undefined,
        disponible,
        radioAtencionKm: radioAtencionKm ? Number(radioAtencionKm) : undefined,
        tarifaBase: tarifaBase ? Number(tarifaBase) : undefined,
        tarifaDomicilio: tarifaDomicilio ? Number(tarifaDomicilio) : undefined,
        direccionTaller: direccionTaller || undefined,
        latitudTaller: latitudTaller ? Number(latitudTaller) : undefined,
        longitudTaller: longitudTaller ? Number(longitudTaller) : undefined,
      };

      await Promise.all([
        updateCurrentUser({ nombre, correo, telefono }),
        updateTechnicianProfile(profilePayload),
        updateTechnicianSpecialties({ specialtyIds: selectedSpecialtyIds }),
      ]);

      Alert.alert('Perfil actualizado', 'Tus datos se han guardado exitosamente.');
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) { Alert.alert('Error', 'Completa todos los campos'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('Error', 'Las contraseñas no coinciden'); return; }
    if (newPassword.length < 6) { Alert.alert('Error', 'Mínimo 6 caracteres'); return; }

    setChangingPassword(true);
    try {
      await updateCurrentUserPassword({ currentPassword, newPassword });
      Alert.alert('Contraseña actualizada', 'Tu contraseña se cambió exitosamente.');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch {
      Alert.alert('Error', 'No se pudo cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.photoContainer} onPress={pickPhoto}>
          {photoUri ? (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: '#6b7280' }]}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          )}
          <Text style={styles.changePhotoText}>Cambiar foto</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Datos personales</Text>
        <Input label="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
        <Input label="Correo electrónico" value={correo} onChangeText={setCorreo} keyboardType="email-address" editable={false} />
        <Input label="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
        <Input
          label="Descripción profesional"
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Describe tu experiencia y habilidades..."
          multiline
          numberOfLines={4}
        />

        <Text style={styles.sectionTitle}>Detalles técnicos</Text>
        <Input label="Años de experiencia" value={aniosExperiencia} onChangeText={setAniosExperiencia} keyboardType="numeric" placeholder="Ej: 5" />
        <Input label="Radio de atención (km)" value={radioAtencionKm} onChangeText={setRadioAtencionKm} keyboardType="numeric" placeholder="Ej: 15" />
        <Input label="Tarifa base" value={tarifaBase} onChangeText={setTarifaBase} keyboardType="numeric" placeholder="Ej: 25.00" />
        <Input label="Tarifa a domicilio" value={tarifaDomicilio} onChangeText={setTarifaDomicilio} keyboardType="numeric" placeholder="Ej: 35.00" />

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Disponible para nuevos servicios</Text>
          <Switch value={disponible} onValueChange={setDisponible} trackColor={{ false: '#d1d5db', true: colors.primarySoft }} thumbColor={disponible ? colors.primary : '#f4f3f4'} />
        </View>

        <Text style={styles.sectionTitle}>Ubicación del taller</Text>
        <Input label="Dirección del taller" value={direccionTaller} onChangeText={setDireccionTaller} placeholder="Ej: Av. Principal 123" autoCapitalize="sentences" />
        <View style={styles.row}>
          <Input label="Latitud" value={latitudTaller} onChangeText={setLatitudTaller} keyboardType="numeric" placeholder="Ej: -0.180653" style={styles.halfInput} />
          <Input label="Longitud" value={longitudTaller} onChangeText={setLongitudTaller} keyboardType="numeric" placeholder="Ej: -78.467834" style={styles.halfInput} />
        </View>

        {allSpecialties.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Especialidades</Text>
            <View style={styles.chipWrap}>
              {allSpecialties.map((spec) => {
                const selected = selectedSpecialtyIds.includes(spec.id);
                return (
                  <TouchableOpacity
                    key={spec.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleSpecialty(spec.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{spec.nombre}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}

        <Button title="Guardar cambios" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />

        <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPasswordSection(!showPasswordSection)}>
          <Ionicons name={showPasswordSection ? 'chevron-up' : 'chevron-down'} size={20} color="#374151" />
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginLeft: 8 }}>Cambiar contraseña</Text>
        </TouchableOpacity>

        {showPasswordSection && (
          <View style={{ marginTop: 12 }}>
            <Input label="Contraseña actual" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
            <Input label="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholder="Mínimo 6 caracteres" />
            <Input label="Confirmar nueva contraseña" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            <Button title="Cambiar contraseña" onPress={handleChangePassword} loading={changingPassword} variant="secondary" />
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 100 },
  photoContainer: { alignItems: 'center', marginBottom: 24 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  changePhotoText: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 12, marginTop: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginBottom: 8 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#374151', flex: 1, marginRight: 12 },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  chipSelected: { backgroundColor: '#dbeafe' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextSelected: { color: '#1d4ed8' },
  passwordToggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 24 },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
