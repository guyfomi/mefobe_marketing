import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager     from 'expo-task-manager';
import * as Notifications   from 'expo-notifications';
import * as Device          from 'expo-device';
import { Platform }         from 'react-native';
import AsyncStorage         from '@react-native-async-storage/async-storage';
import { fetchTasks }       from './OdooService';

// ── Constants ─────────────────────────────────────────────────
export const BACKGROUND_TASK_NAME = 'BEAUTY_TASK_POLLER';
const STORAGE_KEY_SEEN   = 'beauty_seen_task_ids';
const STORAGE_KEY_DONE   = 'beauty_done_task_ids';
const POLL_INTERVAL_SECS = 60; // check every 60 seconds (minimum allowed by OS)

// ── Configure foreground notification behaviour ───────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
    priority:        Notifications.AndroidNotificationPriority.MAX,
  }),
});

// ── Notification channels (Android) ──────────────────────────
export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('beauty_new_tasks', {
    name:             'Nouvelles Tâches',
    importance:       Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lightColor:       '#E91E8C',
    sound:            'default',
    enableLights:     true,
    enableVibrate:    true,
    showBadge:        true,
  });

  await Notifications.setNotificationChannelAsync('beauty_done_tasks', {
    name:       'Tâches Terminées',
    importance: Notifications.AndroidImportance.HIGH,
    sound:      'default',
  });
}

// ── Request notification permission ──────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Send a local high-priority notification ───────────────────
export async function sendNotification(
  title:   string,
  body:    string,
  data:    Record<string, any> = {},
  channel: string = 'beauty_new_tasks',
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound:    'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      // Show notification badge count
      badge: 1,
    },
    trigger: null, // fire immediately
  });
}

// ── Load / Save seen task IDs from AsyncStorage ───────────────
async function getSeenIds(): Promise<Set<number>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_SEEN);
  return new Set(raw ? JSON.parse(raw) : []);
}

async function saveSeenIds(ids: Set<number>) {
  await AsyncStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify([...ids]));
}

async function getDoneIds(): Promise<Set<number>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY_DONE);
  return new Set(raw ? JSON.parse(raw) : []);
}

async function saveDoneIds(ids: Set<number>) {
  await AsyncStorage.setItem(STORAGE_KEY_DONE, JSON.stringify([...ids]));
}

// ── Channel emoji helper ──────────────────────────────────────
const CHANNEL_EMOJIS: Record<string, string> = {
  whatsapp:  '💬', sms:      '📱', email:     '📧',
  call:      '📞', inperson: '🏪', facebook:  '📘',
  instagram: '📸', tiktok:   '🎵', linkedin:  '💼',
};

const TASK_TYPE_LABELS: Record<string, string> = {
  welcome:      '🟢 Accueil',        appt_confirm: '📅 RDV',
  post_service: '⭐ Suivi',           inactive:     '💤 Relance',
  birthday:     '🎂 Anniversaire',    vip:          '👑 VIP',
  noshow:       '📵 Absence',         review:       '⭐ Avis',
  loyalty:      '🎁 Fidélité',        referral:     '📣 Parrainage',
  upsell:       '🧴 Vente +',         seasonal:     '🌦️ Saisonnier',
  fete_nat:     '🇨🇲 Fête Nat.',     tabaski:      '🌙 Korité',
  christmas:    '🎄 Noël',            source:       '📊 Source',
  stock:        '📦 Stock',           other:        '📋 Autre',
};

// ── Core polling logic ────────────────────────────────────────
export async function pollForTaskChanges(): Promise<void> {
  try {
    const [seenIds, doneIds] = await Promise.all([getSeenIds(), getDoneIds()]);
    let seenChanged = false;
    let doneChanged = false;

    // ── A) Fetch ALL open tasks (new ones) ────────────────────
    const openTasks = await fetchTasks([['stage_id.is_closed', '=', false]]);

    for (const task of openTasks) {
      if (!seenIds.has(task.id)) {
        // NEW TASK — never seen before
        seenIds.add(task.id);
        seenChanged = true;

        const chEmoji   = CHANNEL_EMOJIS[(task.channel as string) ?? ''] ?? '📋';
        const typeLabel = TASK_TYPE_LABELS[(task.task_type as string) ?? ''] ?? '📋 Tâche';
        const partner   = (task.partner_id as any)?.[1] ?? '';

        await sendNotification(
          `${chEmoji} Nouvelle tâche — ${typeLabel}`,
          partner ? `${task.name} — ${partner}` : task.name,
          {
            task_id:    task.id,
            type:       'new',
            channel:    task.channel ?? '',
            task_type:  task.task_type ?? '',
            partner:    partner,
          },
          'beauty_new_tasks',
        );
      }
    }

    // ── B) Detect tasks just marked as DONE ───────────────────
    const openIds = new Set(openTasks.map(t => t.id));

    // For tasks we've seen before but are now closed
    for (const seenId of seenIds) {
      if (!openIds.has(seenId) && !doneIds.has(seenId)) {
        // Task disappeared from open list = it's done or cancelled
        doneIds.add(seenId);
        doneChanged = true;

        await sendNotification(
          '✅ Tâche terminée',
          `La tâche #${seenId} a été marquée comme terminée.`,
          { task_id: seenId, type: 'done' },
          'beauty_done_tasks',
        );
      }
    }

    // ── C) Check for overdue tasks (daily reminder) ───────────
    const overdueKey  = `beauty_overdue_notified_${new Date().toDateString()}`;
    const alreadyNotified = await AsyncStorage.getItem(overdueKey);

    if (!alreadyNotified) {
      const overdueTasks = openTasks.filter(t => t.is_overdue);
      if (overdueTasks.length > 0) {
        await sendNotification(
          `⏰ ${overdueTasks.length} tâche${overdueTasks.length > 1 ? 's' : ''} en retard !`,
          overdueTasks.slice(0, 3).map(t => `• ${t.name}`).join('\n'),
          { type: 'overdue', count: overdueTasks.length },
          'beauty_new_tasks',
        );
        await AsyncStorage.setItem(overdueKey, '1');
      }
    }

    // ── Save updated state ────────────────────────────────────
    if (seenChanged) await saveSeenIds(seenIds);
    if (doneChanged) await saveDoneIds(doneIds);

  } catch (error) {
    // Silent fail in background — log only
    console.warn('[BackgroundTaskService] Poll error:', error);
  }
}

// ── Register the background fetch task ───────────────────────
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    await pollForTaskChanges();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ── Start background polling ──────────────────────────────────
export async function startBackgroundPolling(): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('[BackgroundTaskService] Notification permission denied');
    return;
  }

  await setupNotificationChannels();

  // Check if already registered
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (isRegistered) {
    console.log('[BackgroundTaskService] Already registered');
    return;
  }

  await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
    minimumInterval:       POLL_INTERVAL_SECS,
    stopOnTerminate:       false, // keep running after app close
    startOnBoot:           true,  // restart after device reboot
  });

  console.log('[BackgroundTaskService] Background polling registered ✅');
}

// ── Stop background polling ───────────────────────────────────
export async function stopBackgroundPolling(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK_NAME);
    console.log('[BackgroundTaskService] Background polling stopped');
  }
}

// ── Manual poll (called when app is in foreground) ────────────
export async function manualPoll(): Promise<void> {
  await pollForTaskChanges();
}

// ── Reset seen task cache (useful for testing) ────────────────
export async function resetTaskCache(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEY_SEEN, STORAGE_KEY_DONE]);
  console.log('[BackgroundTaskService] Cache reset');
}