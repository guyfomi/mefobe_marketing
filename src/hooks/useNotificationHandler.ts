import { useEffect, useRef } from 'react';
import * as Notifications    from 'expo-notifications';
import { useNavigation }     from '@react-navigation/native';

export function useNotificationHandler() {
  const navigation      = useNavigation<any>();
  const receivedRef     = useRef<any>(null);
  const responseRef     = useRef<any>(null);

  useEffect(() => {
    // Foreground: notification received while app is open
    receivedRef.current = Notifications.addNotificationReceivedListener(
      notification => {
        const data = notification.request.content.data;
        console.log('[Notification received]', data);
      }
    );

    // User tapped a notification → navigate to task detail
    responseRef.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data   = response.notification.request.content.data;
        const taskId = data?.task_id;
        if (taskId) {
          navigation.navigate('TaskDetail', { taskId: Number(taskId) });
        }
      }
    );

    return () => {
      receivedRef.current?.remove();
      responseRef.current?.remove();
    };
  }, []);
}