import { betaFeatures } from '../config/betaFeatures';
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import LogMealScreen from '../screens/LogMealScreen';
import LogExerciseScreen from '../screens/LogExerciseScreen';
import ChatScreen from '../screens/ChatScreen';
import SummaryScreen from '../screens/SummaryScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ClientsScreen from '../screens/ClientsScreen';
import QuickAdd from '../components/QuickAdd';
import { useTheme } from '../design/theme';
import { useRoles } from '../context/RolesContext';

export type MainTabsParamList = {
  Dashboard: { waterRequest?: number } | undefined;
  LogMeal: undefined;
  LogExercise: undefined;
  Chat: undefined;
  Summary: undefined;
  History: undefined;
  Clients: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS: Record<string, string> = {
  Dashboard: 'home',
  LogMeal: 'restaurant',
  LogExercise: 'barbell',
  Chat: 'chatbubble-ellipses',
  History: 'time',
  Summary: 'person',
  Clients: 'people',
};

export default function MainTabs() {
  const { hasRole } = useRoles();
  const { colors } = useTheme();
  const isTrainerOrNutritionist = hasRole('TRAINER') || hasRole('NUTRITIONIST');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.primary,
        headerRight: () => <QuickAdd />,
        headerRightContainerStyle: { paddingRight: 16 },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarInactiveTintColor: colors.muted,
        tabBarIcon: ({ color, size, focused }) => {
          const base = ICONS[route.name] || 'ellipse';
          const name = (focused ? base : `${base}-outline`) as keyof typeof Ionicons.glyphMap;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Today' }} />
      <Tab.Screen name="LogMeal" component={LogMealScreen} options={{ title: 'Food' }} />
      <Tab.Screen name="LogExercise" component={LogExerciseScreen} options={{ title: 'Workout' }} />
      {betaFeatures.ai && <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Leo' }} />}
      {isTrainerOrNutritionist && (
        <Tab.Screen name="Clients" component={ClientsScreen} />
      )}
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: 'Progress' }} />
      <Tab.Screen name="Summary" component={SummaryScreen} options={{ title: 'Account' }} />
    </Tab.Navigator>
  );
}
