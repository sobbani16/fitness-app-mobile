/** No transport, persistence or identifiers. Disabled until an explicit consent-aware adapter is installed. */
const names = ['onboarding_completed', 'meal_saved', 'label_capture_started', 'label_text_ready', 'label_review_opened', 'workout_started', 'workout_completed', 'feedback_composer_opened', 'food_entry_saved', 'label_meal_saved'] as const;
export type ProductEvent = typeof names[number];
export type DurationBucket = 'under_30s' | '30_to_120s' | '2_to_5m' | 'over_5m';
export type EventEnvelope = Readonly<{ name: ProductEvent; version: 1; duration?: DurationBucket }>;
let sink: ((event: EventEnvelope) => void | Promise<void>) | undefined;
/** The caller owns consent lifecycle; uninstall on withdrawal/account change. No replay or backlog. */
export function setAnalyticsAdapter(adapter?: (event: EventEnvelope) => void | Promise<void>) { sink = adapter; }
export function trackEvent(name: ProductEvent, duration?: DurationBucket) {
  if (!sink || !names.includes(name)) return;
  try { Promise.resolve(sink(Object.freeze({ name, version: 1, ...((name === 'food_entry_saved' || name === 'label_meal_saved') && ['under_30s', '30_to_120s', '2_to_5m', 'over_5m'].includes(duration || '') ? { duration } : {}) }))).catch(() => {}); } catch { /* Telemetry must never fail a user action. */ }
}

/** Wall-clock bucket only, no exact time or identifiers; once per mounted entry. */
export function startEntryTimer(name: 'food_entry_saved' | 'label_meal_saved') {
  const start = Date.now(); let completed = false;
  return () => {
    if (completed) return;
    completed = true;
    const seconds = Math.max(0, Date.now() - start) / 1000;
    trackEvent(name, seconds < 30 ? 'under_30s' : seconds < 120 ? '30_to_120s' : seconds < 300 ? '2_to_5m' : 'over_5m');
  };
}
