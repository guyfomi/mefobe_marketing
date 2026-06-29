import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Ionicons }                   from '@expo/vector-icons';
import { COLORS }                     from '../constants';

import TaskListScreen   from '../screens/TaskListScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import AiMessageScreen  from '../screens/AiMessageScreen';
import AiSettingsScreen from '../screens/AiSettingsScreen';
import SettingsScreen   from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Tâches stack: List → Detail → AI Generator ────────────────
function TasksStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TaskList"   component={TaskListScreen}   />
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      {/* ✨ AI screen accessible from task detail */}
      <Stack.Screen name="AiMessage"  component={AiMessageScreen}  />
      <Stack.Screen name="AiSettings" component={AiSettingsScreen} />
    </Stack.Navigator>
  );
}

// ── IA tab: standalone generator ──────────────────────────────
function AiStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AiMessageMain" component={AiMessageScreen}  />
      <Stack.Screen name="AiSettings"    component={AiSettingsScreen} />
    </Stack.Navigator>
  );
}

// ── Réglages tab ──────────────────────────────────────────────
function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen}   />
      <Stack.Screen name="AiSettings"   component={AiSettingsScreen} />
    </Stack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────
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
          height: 62,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, any> = {
            'Tâches':   focused ? 'list'          : 'list-outline',
            'IA':       focused ? 'sparkles'      : 'sparkles-outline',
            'Réglages': focused ? 'settings'      : 'settings-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Tâches"   component={TasksStack}    />
      <Tab.Screen name="IA"       component={AiStack}       />
      <Tab.Screen name="Réglages" component={SettingsStack} />
    </Tab.Navigator>
  );
}