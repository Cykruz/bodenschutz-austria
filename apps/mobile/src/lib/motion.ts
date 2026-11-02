import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let cached: boolean | undefined;

/**
 * Systemeinstellung „Bewegung reduzieren“. Schaltet Schleifen und Verspieltes ab;
 * Zustandsänderungen bleiben sichtbar, nur ohne Bewegung.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState<boolean>(cached ?? false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        cached = value;
        if (active) setReduce(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      cached = value;
      setReduce(value);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}

/** Dauer der Erklärschleife auf dem Startbildschirm in Millisekunden. */
export const EXPLAINER_LOOP_MS = 8000;
