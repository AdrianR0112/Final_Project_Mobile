import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { login } from '../../services/auth.service';
import { persistAuthSession } from '../../utils/auth';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ErrorMessage from '../../components/ErrorMessage';

type Props = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export default function LoginScreen({ navigation }: Props) {
  const { setUser } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError('');
    if (!correo || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const response = await login({ correo, password });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      if (data.user && data.token) {
        await persistAuthSession({ token: data.token, user: data.user });
        setUser(data.user);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
      if (message.includes('AbortError') || message.includes('Aborted') || message.includes('Network') || message.includes('abort')) {
        setError('No se pudo conectar al servidor. Verifica que el backend esté corriendo y el firewall permita el puerto 3001.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Reparaciones</Text>
          <Text style={styles.subtitle}>Servicio Técnico a Domicilio</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Iniciar Sesión</Text>
          <ErrorMessage message={error} />

          <Input
            label="Correo electrónico"
            value={correo}
            onChangeText={setCorreo}
            placeholder="tu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            placeholder="Tu contraseña"
            secureTextEntry
          />

          <Button title="Iniciar Sesión" onPress={handleLogin} loading={loading} />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.link}>
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
            <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 36, fontWeight: '800', color: '#2563eb' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  form: { width: '100%' },
  formTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 24 },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
});
