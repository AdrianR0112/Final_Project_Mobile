import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import ServicesScreen from '../screens/admin/ServicesScreen';
import TechniciansScreen from '../screens/admin/TechniciansScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import AdminNotificationsScreen from '../screens/admin/AdminNotificationsScreen';
import AdminServiceDetailScreen from '../screens/admin/ServiceDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Usuarios') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Tecnicos') iconName = focused ? 'build' : 'build-outline';
          else if (route.name === 'Servicios') iconName = focused ? 'construct' : 'construct-outline';
          else if (route.name === 'Reportes') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'Notificaciones') iconName = focused ? 'notifications' : 'notifications-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 5, height: 60 },
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Usuarios" component={UsersScreen} />
      <Tab.Screen name="Tecnicos" component={TechniciansScreen} options={{ tabBarLabel: 'Técnicos' }} />
      <Tab.Screen name="Servicios" component={ServicesScreen} />
      <Tab.Screen name="Reportes" component={ReportsScreen} />
      <Tab.Screen name="Notificaciones" component={AdminNotificationsScreen} options={{ tabBarLabel: 'Alertas' }} />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen
        name="ServiceDetail"
        options={{ headerShown: true, title: 'Detalle del Servicio', headerTintColor: '#2563eb' }}
        component={AdminServiceDetailScreen as React.FC<unknown>}
      />
    </Stack.Navigator>
  );
}
