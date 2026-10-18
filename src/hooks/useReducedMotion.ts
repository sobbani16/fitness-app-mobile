import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
/** Start conservatively while the OS preference is loading. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true, changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { changed = true; if (active) setReduced(value); });
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active && !changed) setReduced(value); }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}
