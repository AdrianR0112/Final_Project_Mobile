import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface StatusBadgeProps {
  status: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  solicitado: { bg: colors.warningSoft, text: colors.warning },
  asignado: { bg: colors.infoSoft, text: colors.primary },
  en_camino: { bg: '#e0e7ff', text: '#3730a3' },
  en_reparacion: { bg: '#fce7f3', text: '#9d174d' },
  finalizado: { bg: colors.successSoft, text: colors.success },
  cancelado: { bg: colors.dangerSoft, text: colors.danger },
  cotizacion_inicial_enviada: { bg: colors.warningSoft, text: colors.warning },
  aceptado: { bg: colors.infoSoft, text: colors.primary },
  pendiente_pago: { bg: '#ede9fe', text: '#5b21b6' },
  pago_enviado: { bg: colors.successSoft, text: colors.success },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || { bg: '#f3f4f6', text: '#374151' };
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  text: { fontSize: 12, fontWeight: '600' },
});
