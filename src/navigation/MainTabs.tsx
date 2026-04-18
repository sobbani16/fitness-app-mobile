import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/DashboardScreen';
import LogMealScreen from '../screens/LogMealScreen';
import ChatScreen from '../screens/ChatScreen';
import SummaryScreen from '../screens/SummaryScreen';

export type MainTabsParamList = {
  Dashboard: undefined;
  LogMeal: undefined;
  Chat: undefined;
  Summary: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="LogMeal" component={LogMealScreen} options={{ title: 'Log Meal' }} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Summary" component={SummaryScreen} />
    </Tab.Navigator>
  );
}
