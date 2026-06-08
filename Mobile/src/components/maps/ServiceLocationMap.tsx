import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../../theme';
import { Coordinates, formatCoordinatesLabel, openCoordinatesInMaps } from '../../utils/maps';

const DEFAULT_CENTER = { latitude: -0.180653, longitude: -78.467834 };

type Props = {
  location?: {
    lat?: number | string | null;
    lng?: number | string | null;
    address?: string | null;
  } | null;
  title?: string;
};

export default function ServiceLocationMap({ location, title = 'Ubicacion del servicio' }: Props) {
  const coordinates = useMemo<Coordinates | null>(() => {
    if (!location || location.lat === null || location.lng === null || location.lat === undefined || location.lng === undefined) {
      return null;
    }

    const lat = Number(location.lat);
    const lng = Number(location.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }, [location]);

  const initialRegion = coordinates
    ? {
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }
    : {
      latitude: DEFAULT_CENTER.latitude,
      longitude: DEFAULT_CENTER.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {coordinates
              ? formatCoordinatesLabel(coordinates, location?.address)
              : 'Aun no hay coordenadas registradas para este servicio'}
          </Text>
        </View>
        {coordinates ? (
          <TouchableOpacity style={styles.action} onPress={() => openCoordinatesInMaps(coordinates, location?.address)}>
            <Ionicons name="navigate" size={16} color={colors.primary} />
            <Text style={styles.actionText}>Abrir</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion}
          scrollEnabled
          zoomEnabled
          pitchEnabled
          rotateEnabled
        >
          {coordinates ? (
            <Marker coordinate={{ latitude: coordinates.lat, longitude: coordinates.lng }} title={location?.address || 'Ubicacion del servicio'} />
          ) : null}
        </MapView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  subtitle: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primarySoft,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  mapWrap: {
    height: 240,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
