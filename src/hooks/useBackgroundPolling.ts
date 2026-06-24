import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus }   from 'react-native';
import {
  startBackgroundPolling,
  manualPoll,
} from '../services/BackgroundTaskService';

const FOREGROUND_POLL_INTERVAL_MS = 30_000; // poll every 30s when app is open

export function useBackgroundPolling() {
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // ── Start foreground polling interval ────────────────────
  const startForegroundPolling = () => {
    if (intervalRef.current) return; // already running
    intervalRef.current = setInterval(async () => {
      await manualPoll();
      setLastPoll(new Date());
    }, FOREGROUND_POLL_INTERVAL_MS);
  };

  const stopForegroundPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    // Register OS-level background task
    startBackgroundPolling();

    // Start foreground polling immediately
    manualPoll().then(() => setLastPoll(new Date()));
    startForegroundPolling();

    // Listen for app state changes
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // App came to foreground — poll immediately
        manualPoll().then(() => setLastPoll(new Date()));
        startForegroundPolling();
      } else if (nextState.match(/inactive|background/)) {
        // App went to background — stop foreground polling
        stopForegroundPolling();
      }
      appStateRef.current = nextState;
    });

    return () => {
      sub.remove();
      stopForegroundPolling();
    };
  }, []);

  return { lastPoll };
}