import React                          from 'react';
import { NavigationContainer }        from '@react-navigation/native';
import { SafeAreaProvider }           from 'react-native-safe-area-context';
import { StatusBar }                  from 'expo-status-bar';
import AppNavigator                   from './src/navigation/AppNavigator';
import { useBackgroundPolling }       from './src/hooks/useBackgroundPolling';
import { useNotificationHandler }     from './src/hooks/useNotificationHandler';

function RootApp() {
  // Start background polling + handle notification taps
  useBackgroundPolling();
  useNotificationHandler();
  return <AppNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootApp />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}