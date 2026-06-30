import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('beauty_tasks', {
      name: 'Nouvelles Tâches',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 100, 300],
      lightColor: '#E91E8C',
    });
    await Notifications.setNotificationChannelAsync('beauty_done', {
      name: 'Tâches Terminées',
      importance: Notifications.AndroidImportance.DEFAULT,      
    });
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Expo Push Token:', token);
  // TODO: send this token to your Odoo backend
  return token;
}

export async function showLocalNotification(title, body, data?) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: data ?? {}},
    trigger: null,
  });
}