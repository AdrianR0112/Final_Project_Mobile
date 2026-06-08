import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';
import { colors, radii, shadows } from '../../theme';
import { AddressMatch, formatCoordinatesLabel, reverseGeocode, searchAddress } from '../../utils/maps';

type LocationValue = {
  lat: number;
  lng: number;
  address?: string;
};

type Props = {
  value: LocationValue | null;
  onChange: (value: LocationValue) => void;
  allowUseCurrentLocation?: boolean;
  defaultToCurrentLocation?: boolean;
};

const DEFAULT_REGION: Region = {
  latitude: -0.180653,
  longitude: -78.467834,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function LocationMapPicker({
  value,
  onChange,
  allowUseCurrentLocation = true,
  defaultToCurrentLocation = false,
}: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [query, setQuery] = useState(value?.address || '');
  const [results, setResults] = useState<AddressMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [workingLocation, setWorkingLocation] = useState(false);
  const [error, setError] = useState('');

  const region = useMemo<Region>(() => (
    value
      ? {
        latitude: value.lat,
        longitude: value.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
      : DEFAULT_REGION
  ), [value]);

  useEffect(() => {
    if (!value) {
      return;
    }

    setQuery(value.address || '');
    mapRef.current?.animateToRegion({
      latitude: value.lat,
      longitude: value.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 300);
  }, [value?.lat, value?.lng, value?.address]);

  useEffect(() => {
    if (!defaultToCurrentLocation || value) {
      return;
    }

    void handleUseCurrentLocation();
  }, [defaultToCurrentLocation, value]);

  async function resolveLocation(lat: number, lng: number) {
    const address = await reverseGeocode(lat, lng).catch(() => '');
    onChange({
      lat,
      lng,
      address,
    });
  }

  async function handleUseCurrentLocation() {
    setError('');
    setWorkingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Se necesita permiso de ubicacion para usar el mapa');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await resolveLocation(current.coords.latitude, current.coords.longitude);
    } catch {
      setError('No se pudo obtener tu ubicacion actual');
    } finally {
      setWorkingLocation(false);
    }
  }

  async function handleSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    setSearching(true);
    setError('');

    try {
      const matches = await searchAddress(trimmedQuery);
      setResults(matches);
      if (matches.length === 0) {
        setError('No encontramos coincidencias para esa busqueda');
      }
    } catch (searchError) {
      setResults([]);
      setError(searchError instanceof Error ? searchError.message : 'No se pudo buscar la direccion');
    } finally {
      setSearching(false);
    }
  }

  async function handlePickResult(result: AddressMatch) {
    setResults([]);
    const label = result.display_name || result.name || '';
    setQuery(label);
    onChange({
      lat: result.lat,
      lng: result.lng,
      address: label,
    });
  }

  async function handleMapPress(latitude: number, longitude: number) {
    try {
      const address = await reverseGeocode(latitude, longitude).catch(() => '');
      onChange({
        lat: latitude,
        lng: longitude,
        address,
      });
    } catch {
      Alert.alert('Mapa', 'No se pudo resolver la direccion seleccionada');
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="map" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Ubicacion del servicio</Text>
          <Text style={styles.subtitle}>Busca una direccion, usa tu ubicacion o toca el mapa para ajustar el punto exacto.</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Buscar calle, barrio o referencia"
          placeholderTextColor={colors.mutedSoft}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="sentences"
        />
        <Button title={searching ? 'Buscando...' : 'Buscar'} onPress={handleSearch} loading={searching} style={styles.searchButton} />
      </View>

      {allowUseCurrentLocation ? (
        <Button
          title={workingLocation ? 'Detectando ubicacion...' : 'Usar mi ubicacion actual'}
          onPress={handleUseCurrentLocation}
          loading={workingLocation}
          variant="secondary"
          style={styles.locationButton}
        />
      ) : null}

      {results.length > 0 ? (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Resultados</Text>
          <FlatList
            data={results}
            keyExtractor={(item, index) => `${item.lat}-${item.lng}-${index}`}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => void handlePickResult(item)}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={styles.resultText}>{item.display_name || item.name || formatCoordinatesLabel(item)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          onPress={(event) => {
            void handleMapPress(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude);
          }}
          scrollEnabled
          zoomEnabled
          pitchEnabled
          rotateEnabled
        >
          {value ? (
            <Marker coordinate={{ latitude: value.lat, longitude: value.lng }} title={value.address || 'Ubicacion seleccionada'} />
          ) : null}
        </MapView>
      </View>

      {value ? (
        <View style={styles.selectedCard}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.selectedText}>{formatCoordinatesLabel(value, value.address)}</Text>
        </View>
      ) : null}
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
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchRow: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
  },
  searchButton: {
    width: '100%',
  },
  locationButton: {
    width: '100%',
    marginTop: -2,
  },
  results: {
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    padding: 12,
    gap: 8,
  },
  resultsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  resultText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: 8,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  mapWrap: {
    height: 280,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedText: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
