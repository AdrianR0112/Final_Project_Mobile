import { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../../theme';
import { Coordinates, formatCoordinatesLabel, openCoordinatesInMaps } from '../../utils/maps';

type Technician = {
  id: number;
  nombre?: string;
  apellido?: string;
  especialidades?: string;
  direccion_taller?: string;
  ciudad?: string;
  latitud_taller?: number | string | null;
  longitud_taller?: number | string | null;
  calificacion_prom?: number | string | null;
  total_servicios?: number | string | null;
};

type Props = {
  technicians?: Technician[];
  lastServiceLocation?: {
    lat: number;
    lng: number;
    address?: string;
  } | null;
};

const DEFAULT_CENTER: Coordinates = { lat: -0.180653, lng: -78.467834 };

export default function NearbyTechniciansMap({ technicians = [], lastServiceLocation = null }: Props) {
  const mapRef = useRef<MapView | null>(null);

  const workshopMarkers = useMemo(() => technicians.filter((technician) => technician.latitud_taller && technician.longitud_taller), [technicians]);
  const center = lastServiceLocation || (workshopMarkers[0]
    ? {
      lat: Number(workshopMarkers[0].latitud_taller),
      lng: Number(workshopMarkers[0].longitud_taller),
    }
    : DEFAULT_CENTER);

  useEffect(() => {
    const points = workshopMarkers
      .filter((technician) => technician.latitud_taller && technician.longitud_taller)
      .map((technician) => ({
        latitude: Number(technician.latitud_taller),
        longitude: Number(technician.longitud_taller),
      }));

    if (lastServiceLocation) {
      points.unshift({ latitude: lastServiceLocation.lat, longitude: lastServiceLocation.lng });
    }

    if (points.length > 0) {
      const timer = setTimeout(() => {
        mapRef.current?.fitToCoordinates(points, {
          edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
          animated: true,
        });
      }, 250);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [lastServiceLocation, workshopMarkers]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mapa de tecnicos cercanos</Text>
          <Text style={styles.subtitle}>Ubica talleres disponibles y navega a su direccion directamente desde el mapa.</Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={[styles.legendChip, { backgroundColor: colors.accentSoft }]}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.legendText}>Tu ultimo servicio</Text>
        </View>
        <View style={[styles.legendChip, { backgroundColor: colors.primarySoft }]}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Talleres disponibles</Text>
        </View>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: 0.08,
            longitudeDelta: 0.08,
          }}
          scrollEnabled
          zoomEnabled
          pitchEnabled
          rotateEnabled
        >
          {lastServiceLocation ? (
            <Marker
              coordinate={{ latitude: lastServiceLocation.lat, longitude: lastServiceLocation.lng }}
              pinColor={colors.success}
              title="Ultimo servicio"
            >
              <Callout onPress={() => openCoordinatesInMaps(lastServiceLocation, lastServiceLocation.address)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>Ultimo servicio</Text>
                  <Text style={styles.calloutText}>{formatCoordinatesLabel(lastServiceLocation, lastServiceLocation.address)}</Text>
                  <Text style={styles.calloutLink}>Abrir en Maps</Text>
                </View>
              </Callout>
            </Marker>
          ) : null}

          {workshopMarkers.map((technician) => {
            const lat = Number(technician.latitud_taller);
            const lng = Number(technician.longitud_taller);

            return (
              <Marker key={technician.id} coordinate={{ latitude: lat, longitude: lng }} title={[technician.nombre, technician.apellido].filter(Boolean).join(' ') || 'Tecnico'}>
                <Callout onPress={() => openCoordinatesInMaps({ lat, lng }, technician.direccion_taller || technician.ciudad || '')}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{[technician.nombre, technician.apellido].filter(Boolean).join(' ') || 'Tecnico'}</Text>
                    <Text style={styles.calloutText}>{technician.especialidades || 'Sin especialidades registradas'}</Text>
                    <Text style={styles.calloutText}>{technician.direccion_taller || technician.ciudad || 'Direccion no registrada'}</Text>
                    <Text style={styles.calloutLink}>Abrir en Maps</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapView>
      </View>

      <TouchableOpacity style={styles.openAllButton} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}`)}>
        <Ionicons name="map-outline" size={16} color={colors.primary} />
        <Text style={styles.openAllText}>Abrir mapa completo</Text>
      </TouchableOpacity>
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
    gap: 14,
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
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
  },
  mapWrap: {
    height: 320,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  callout: {
    maxWidth: 220,
    padding: 6,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  calloutText: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  calloutLink: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  openAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    paddingVertical: 12,
  },
  openAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
