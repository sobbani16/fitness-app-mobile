// Trainer specialty taxonomy — client-side twin of the backend registry.
// Keep labels in sync: trainer profiles store these strings verbatim and the
// discovery filter passes them through as the `specialty` query param.
export const SPECIALTIES = [
  'Strength Training',
  'HIIT',
  'Weight Loss',
  'Muscle Gain',
  'Running',
  'Cycling',
  'Yoga',
  'Pilates',
  'Flexibility',
  'Cardio',
  'Swimming',
  'Boxing',
  'CrossFit',
  'Nutrition Coaching',
  'Rehab & Recovery',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];
