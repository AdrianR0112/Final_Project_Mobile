import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import { getClientProfile, updateClientProfile } from '../../services/client.service';
import { updateCurrentUser, uploadProfilePhoto, updateCurrentUserPassword } from '../../services/user.service';
import Button from '../../components/Button';
import Input from '../../components/Input';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { AuthUser } from '../../contexts/AuthContext';

export default function ClientProfileScreen() {
  const { user, logout, setUser } = useAuth();
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState((user as Record<string, unknown> | null)?.apellido as string || '');
  const [correo, setCorreo] = useState((user?.correo as string) || '');
  const [telefono, setTelefono] = useState((user as Record<string, unknown> | null)?.telefono as string || '');
  const [cedula, setCedula] = useState('');
  const [genero, setGenero] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [pais, setPais] = useState('');
  const [direccionPrincipal, setDireccionPrincipal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  const [photoUri, setPhotoUri] = useState((user as Record<string, unknown> | null)?.foto_perfil_url as string || (user as Record<string, unknown> | null)?.fotoPerfilUrl as string || '');

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await getClientProfile();
        const data = await response.json();
        const p = data.cliente || data;
        setCedula(p.cedula || (user as Record<string, unknown> | null)?.cedula as string || '');
        setGenero(p.genero || '');
        setFechaNacimiento(p.fechaNacimiento || p.fecha_nacimiento || '');
        setCiudad(p.ciudad || '');
        setPais(p.pais || '');
        setDireccionPrincipal(p.direccionPrincipal || p.direccion_principal || '');
      } catch { /* fail silently */}
      finally { setLoading(false); }
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
        const file = { uri: result.assets[0].uri, name: 'profile.jpg', type: 'image/jpeg' };
        const res = await uploadProfilePhoto(file);
        const d = await res.json();
        const url = d.foto_perfil_url || d.fotoPerfilUrl || d.user?.foto_perfil_url || d.user?.fotoPerfilUrl;
        if (url) { setPhotoUri(url); setUser({ ...(user as AuthUser), foto_perfil_url: url }); }
      } catch { Alert.alert('Error', 'No se pudo subir la foto'); }
      finally { setSaving(false); }
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        updateCurrentUser({ nombre, apellido, correo, telefono, cedula, genero, fechaNacimiento, ciudad, pais, direccionPrincipal }),
        updateClientProfile({ direccionPrincipal, ciudad, pais, cedula, genero, fechaNacimiento }),
      ]);
      Alert.alert('Perfil actualizado', 'Datos guardados exitosamente.');
    } catch { Alert.alert('Error', 'No se pudo actualizar'); }
    finally { setSaving(false); }
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
    } catch { Alert.alert('Error', 'No se pudo cambiar la contraseña'); }
    finally { setChangingPassword(false); }
  }

  if (loading) return <LoadingSpinner />;

  const GENERO_OPTS = ['', 'masculino', 'femenino', 'otro', 'prefiero_no_decir'];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.photoContainer} onPress={pickPhoto}>
        <View style={styles.photoPlaceholder}><Ionicons name="person" size={40} color="#fff" /></View>
        <Text style={styles.changePhotoText}>Cambiar foto</Text>
      </TouchableOpacity>

      <Input label="Nombre" value={nombre} onChangeText={setNombre} autoCapitalize="words" />
      <Input label="Apellido" value={apellido} onChangeText={setApellido} autoCapitalize="words" />
      <Input label="Correo electrónico" value={correo} onChangeText={setCorreo} keyboardType="email-address" editable={false} />
      <Input label="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
      <Input label="Cédula" value={cedula} onChangeText={setCedula} />
      <Text style={styles.label}>Género</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {GENERO_OPTS.map((g) => (
          <TouchableOpacity key={g || 'none'} style={[styles.chip, genero === g && styles.chipSelected]} onPress={() => setGenero(g)}>
            <Text style={[styles.chipText, genero === g && styles.chipTextSelected]}>{g || 'Sin especificar'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Input label="Fecha de nacimiento" value={fechaNacimiento} onChangeText={setFechaNacimiento} placeholder="YYYY-MM-DD" />
      <Input label="Ciudad" value={ciudad} onChangeText={setCiudad} />
      <Input label="País" value={pais} onChangeText={setPais} />
      <Input label="Dirección principal" value={direccionPrincipal} onChangeText={setDireccionPrincipal} multiline numberOfLines={2} />

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
        <Ionicons name="log-out-outline" size={20} color="#dc2626" /><Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 100 },
  photoContainer: { alignItems: 'center', marginBottom: 20 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  changePhotoText: { color: '#2563eb', fontSize: 14, fontWeight: '500', marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', marginRight: 8 },
  chipSelected: { backgroundColor: '#dbeafe' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  chipTextSelected: { color: '#1d4ed8' },
  passwordToggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginTop: 16 },
  logoutText: { color: '#dc2626', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
