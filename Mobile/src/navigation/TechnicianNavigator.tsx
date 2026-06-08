import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import TechnicianDashboardScreen from '../screens/technician/TechnicianDashboardScreen';
import OpenRequestsScreen from '../screens/technician/OpenRequestsScreen';
import ActiveServicesScreen from '../screens/technician/ActiveServicesScreen';
import ServiceHistoryScreen from '../screens/technician/ServiceHistoryScreen';
import TechnicianChatScreen from '../screens/technician/TechnicianChatScreen';
import TechnicianProfileScreen from '../screens/technician/TechnicianProfileScreen';
import TechnicianNotificationsScreen from '../screens/technician/TechnicianNotificationsScreen';
import TechnicianServiceDetailScreen from '../screens/technician/ServiceDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TechnicianTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Solicitudes') iconName = focused ? 'list' : 'list-outline';
          else if (route.name === 'Activos') iconName = focused ? 'hammer' : 'hammer-outline';
          else if (route.name === 'Chat') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Historial') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Notificaciones') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Perfil') iconName = focused ? 'person' : 'person-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 5, height: 60 },
      })}
    >
      <Tab.Screen name="Dashboard" component={TechnicianDashboardScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Solicitudes" component={OpenRequestsScreen} options={{ tabBarLabel: 'Solicitudes' }} />
      <Tab.Screen name="Activos" component={ActiveServicesScreen} options={{ tabBarLabel: 'Activos' }} />
      <Tab.Screen name="Chat" component={TechnicianChatScreen} />
      <Tab.Screen name="Historial" component={ServiceHistoryScreen} />
      <Tab.Screen name="Notificaciones" component={TechnicianNotificationsScreen} options={{ tabBarLabel: 'Alertas' }} />
      <Tab.Screen name="Perfil" component={TechnicianProfileScreen} />
    </Tab.Navigator>
  );
}

export default function TechnicianNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TechnicianTabs" component={TechnicianTabs} />
      <Stack.Screen
        name="ServiceDetail"
        options={{ headerShown: true, title: 'Detalle del Servicio', headerTintColor: '#2563eb' }}
        component={TechnicianServiceDetailScreen as React.FC<unknown>}
      />
    </Stack.Navigator>
  );
}
