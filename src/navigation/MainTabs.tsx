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
import { useRoles } from '../context/RolesContext';

export type MainTabsParamList = {
  Dashboard: undefined;
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
  const isTrainerOrNutritionist = hasRole('TRAINER') || hasRole('NUTRITIONIST');

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#1e6fb8',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarIcon: ({ color, size, focused }) => {
          const base = ICONS[route.name] || 'ellipse';
          const name = (focused ? base : `${base}-outline`) as keyof typeof Ionicons.glyphMap;
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="LogMeal" component={LogMealScreen} options={{ title: 'Log Meal' }} />
      <Tab.Screen name="LogExercise" component={LogExerciseScreen} options={{ title: 'Exercise' }} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      {isTrainerOrNutritionist && (
        <Tab.Screen name="Clients" component={ClientsScreen} />
      )}
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Summary" component={SummaryScreen} />
    </Tab.Navigator>
  );
}
