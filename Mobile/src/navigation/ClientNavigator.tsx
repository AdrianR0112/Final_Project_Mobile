import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ClientDashboardScreen from '../screens/client/ClientDashboardScreen';
import RequestServiceScreen from '../screens/client/RequestServiceScreen';
import MyServicesScreen from '../screens/client/MyServicesScreen';
import ServiceDetailScreen from '../screens/client/ServiceDetailScreen';
import ServiceHistoryScreen from '../screens/client/ServiceHistoryScreen';
import NearbyTechniciansScreen from '../screens/client/NearbyTechniciansScreen';
import ClientChatScreen from '../screens/client/ClientChatScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';
import ClientNotificationsScreen from '../screens/client/ClientNotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function ClientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Services') iconName = focused ? 'construct' : 'construct-outline';
          else if (route.name === 'Chat') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 5, height: 60 },
      })}
    >
      <Tab.Screen name="Dashboard" component={ClientDashboardScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Services" component={MyServicesScreen} options={{ tabBarLabel: 'Servicios' }} />
      <Tab.Screen name="Chat" component={ClientChatScreen} />
      <Tab.Screen name="Notifications" component={ClientNotificationsScreen} options={{ tabBarLabel: 'Alertas' }} />
      <Tab.Screen name="Profile" component={ClientProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}

export default function ClientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ClientTabs" component={ClientTabs} />
      <Stack.Screen name="RequestService" component={RequestServiceScreen} options={{ headerShown: true, title: 'Solicitar Servicio', headerTintColor: '#2563eb' }} />
      <Stack.Screen name="ServiceDetail" options={{ headerShown: true, title: 'Detalle del Servicio', headerTintColor: '#2563eb' }} component={ServiceDetailScreen as React.FC<unknown>} />
      <Stack.Screen name="ServiceHistory" options={{ headerShown: true, title: 'Historial', headerTintColor: '#2563eb' }} component={ServiceHistoryScreen as React.FC<unknown>} />
      <Stack.Screen name="NearbyTechnicians" options={{ headerShown: true, title: 'Técnicos Cercanos', headerTintColor: '#2563eb' }} component={NearbyTechniciansScreen as React.FC<unknown>} />
    </Stack.Navigator>
  );
}
