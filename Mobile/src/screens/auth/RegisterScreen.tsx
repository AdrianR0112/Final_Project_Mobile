import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { register } from '../../services/auth.service';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ErrorMessage from '../../components/ErrorMessage';

type Props = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export default function RegisterScreen({ navigation }: Props) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError('');
    setSuccess('');

    if (!nombre || !correo || !telefono || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const response = await register({ nombre, correo, telefono, password });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrarse');
      }

      setSuccess('Cuenta creada exitosamente. Ahora puedes iniciar sesión.');
      setTimeout(() => navigation.goBack(), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Regístrate como cliente</Text>
        </View>

        <ErrorMessage message={error} />
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <Input label="Nombre completo" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" autoCapitalize="words" />
        <Input label="Correo electrónico" value={correo} onChangeText={setCorreo} placeholder="tu@email.com" keyboardType="email-address" />
        <Input label="Teléfono" value={telefono} onChangeText={setTelefono} placeholder="3001234567" keyboardType="phone-pad" />
        <Input label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry />
        <Input label="Confirmar contraseña" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repite tu contraseña" secureTextEntry />

        <Button title="Registrarse" onPress={handleRegister} loading={loading} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
  successBox: { backgroundColor: '#d1fae5', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#a7f3d0' },
  successText: { color: '#065f46', fontSize: 14, fontWeight: '500' },
});
