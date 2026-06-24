import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import TaskListScreen   from '../screens/TaskListScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import SettingsScreen   from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TasksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TaskList"   component={TaskListScreen} />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor:  '#f0e0f0',
          height: 60, paddingBottom: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            'Tâches':   focused ? 'list'     : 'list-outline',
            'Réglages': focused ? 'settings' : 'settings-outline',
          };
          return (
            <Ionicons name={icons[route.name]} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Tâches"   component={TasksStack} />
      <Tab.Screen name="Réglages" component={SettingsScreen} />
    </Tab.Navigator>
  );
}