import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
const useMotionPref = (): boolean | null => {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true, changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (active) setReduced(value); });
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) setReduced(value); }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
};

/** Starts conservatively (true) while the OS preference loads — matches
 * historical behavior for UI that wants a boolean immediately. */
export function useReducedMotion(): boolean {
  return useMotionPref() ?? true;
}

/** `null` until the OS preference resolves. Mount animation-dependent
 * navigators only on the resolved value — flipping `animation` on a live
 * native-stack can wedge its transition state (dead back + dead swipe). */
export function useReducedMotionResolved(): boolean | null {
  return useMotionPref();
}
