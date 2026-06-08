import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { forgotPassword } from '../../services/auth.service';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ErrorMessage from '../../components/ErrorMessage';

type Props = {
  navigation: NativeStackNavigationProp<Record<string, undefined>>;
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleForgotPassword() {
    setError('');
    setSuccess('');

    if (!correo) {
      setError('Ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword({ correo });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar la solicitud');
      }

      setSuccess('Se ha enviado un enlace de recuperación a tu correo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Recuperar Contraseña</Text>
          <Text style={styles.subtitle}>Te enviaremos un enlace de recuperación</Text>
        </View>

        <ErrorMessage message={error} />
        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <Input
          label="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          placeholder="tu@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Button title="Enviar enlace" onPress={handleForgotPassword} loading={loading} />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
          <Text style={styles.linkText}>Volver al inicio de sesión</Text>
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
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#2563eb', fontSize: 14, fontWeight: '500' },
  successBox: { backgroundColor: '#d1fae5', padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: '#a7f3d0' },
  successText: { color: '#065f46', fontSize: 14, fontWeight: '500' },
});
