import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getAvailableTechnicians } from '../../services/technician.service';
import { getMyServices } from '../../services/service.service';
import LoadingSpinner from '../../components/LoadingSpinner';
import NearbyTechniciansMap from '../../components/maps/NearbyTechniciansMap';
import { colors, radii, shadows } from '../../theme';
import { openCoordinatesInMaps } from '../../utils/maps';

interface Technician {
  id: number;
  nombre: string;
  apellido?: string;
  correo?: string;
  foto_perfil_url?: string;
  calificacion_prom?: number;
  especialidades?: string;
  direccion_taller?: string;
  ciudad?: string;
  total_servicios?: number;
  disponible?: boolean;
  latitud_taller?: number;
  longitud_taller?: number;
}

export default function NearbyTechniciansScreen() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      let params: Record<string, unknown> = {};

      try {
        const servicesRes = await getMyServices({ limit: 5 });
        const servicesData = await servicesRes.json().catch(() => ({}));
        const allServices = servicesData.serviceRequests || servicesData.services || [];
        const lastService = allServices.length > 0 ? allServices[0] : null;

        if (lastService?.latitud && lastService?.longitud) {
          params = { lat: lastService.latitud, lng: lastService.longitud };
        } else if (lastService?.lat && lastService?.lng) {
          params = { lat: lastService.lat, lng: lastService.lng };
        }
      } catch {
        // fallback: show all technicians
      }

      const response = await getAvailableTechnicians(params);
      const data = await response.json().catch(() => ({}));
      setTechnicians(data.technicians || data.tecnicos || data || []);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  if (loading) return <LoadingSpinner />;

  return (
    <FlatList
      data={technicians}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      refreshControl={(
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      )}
      ListHeaderComponent={(
        <View style={styles.headerStack}>
          <View style={styles.hero}>
            <View style={styles.heroBadge}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.heroBadgeText}>Mapa interactivo</Text>
            </View>
            <Text style={styles.heroTitle}>Tecnicos cercanos y talleres disponibles</Text>
            <Text style={styles.heroSubtitle}>
              Revisa la ubicación de los talleres, compara especialidades y abre la ruta en tu app de mapas.
            </Text>
          </View>

          <NearbyTechniciansMap technicians={technicians} />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Listado de técnicos</Text>
            <Text style={styles.sectionSubtitle}>{technicians.length} resultados</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color={colors.border} />
          <Text style={styles.emptyText}>No hay técnicos disponibles</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color={colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.name}>{item.nombre} {item.apellido || ''}</Text>
              <Text style={styles.specialty}>{item.especialidades || 'Sin especialidad'}</Text>
              <Text style={styles.location}>
                <Ionicons name="location" size={12} color={colors.mutedSoft} /> {item.direccion_taller || item.ciudad || 'Cobertura disponible'}
              </Text>
              {item.calificacion_prom ? (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text style={styles.ratingText}>{Number(item.calificacion_prom).toFixed(1)}</Text>
                  {item.total_servicios ? <Text style={styles.ratingMeta}>({item.total_servicios} servicios)</Text> : null}
                </View>
              ) : null}
            </View>
          </View>

          {(item.latitud_taller && item.longitud_taller) ? (
            <TouchableOpacity
              style={styles.routeButton}
              onPress={() => openCoordinatesInMaps({
                lat: Number(item.latitud_taller),
                lng: Number(item.longitud_taller),
              }, item.direccion_taller || item.ciudad || '')}
            >
              <Ionicons name="navigate" size={16} color={colors.primary} />
              <Text style={styles.routeButtonText}>Abrir ruta</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingBottom: 80,
    backgroundColor: colors.background,
  },
  headerStack: {
    gap: 14,
    marginBottom: 12,
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
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 2,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.mutedSoft,
  },
  empty: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  specialty: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  location: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.muted,
    marginLeft: 4,
    fontWeight: '700',
  },
  ratingMeta: {
    fontSize: 12,
    color: colors.mutedSoft,
    marginLeft: 4,
  },
  routeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primarySoft,
    paddingVertical: 12,
  },
  routeButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});
