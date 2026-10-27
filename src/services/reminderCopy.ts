// Localized reminder copy. Keys map to planner categories; 'en' is the default
// and fallback. Keep bodies discreet — nothing health-sensitive on lock screens.
const COPY: Record<string, Record<string, { title: string }>> = {
  en: {
    'meal:breakfast': { title: 'Time for breakfast?' },
    'meal:lunch': { title: 'Time for lunch?' },
    'meal:dinner': { title: 'Time for dinner?' },
    'meal:snack': { title: 'Snack time?' },
    water: { title: 'Time for some water?' },
    supplement: { title: 'Supplement reminder' },
    workout: { title: 'Workout coming up' },
    movement: { title: 'Time to move a little?' },
  },
  es: {
    'meal:breakfast': { title: '¿Hora de desayunar?' },
    'meal:lunch': { title: '¿Hora de comer?' },
    'meal:dinner': { title: '¿Hora de cenar?' },
    'meal:snack': { title: '¿Un snack?' },
    water: { title: '¿Un poco de agua?' },
    supplement: { title: 'Recordatorio de suplemento' },
    workout: { title: 'Tu entrenamiento se acerca' },
    movement: { title: '¿Un momento para moverte?' },
  },
};

const SUPPORTED = Object.keys(COPY);

export function resolveLocale(locale?: string | null): string {
  const tag = (locale || 'en').split('-')[0].toLowerCase();
  return SUPPORTED.includes(tag) ? tag : 'en';
}

export function reminderTitle(category: string, locale?: string | null): string {
  const lang = resolveLocale(locale);
  return COPY[lang][category]?.title || COPY.en[category]?.title || 'Reminder';
}

// Honors the device's 12/24-hour preference via Intl.
export function formatReminderTime(date: Date, locale?: string | null, hour12?: boolean): string {
  const tag = locale || undefined;
  return new Intl.DateTimeFormat(tag, { hour: 'numeric', minute: '2-digit', ...(hour12 == null ? {} : { hour12: Boolean(hour12) }) }).format(date);
}
