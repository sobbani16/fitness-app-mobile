import { formatVolume } from '../units';

it('formats metric volumes with symbols', () => {
  expect(formatVolume(500, 'ml')).toBe('500 mL');
  expect(formatVolume(2000, 'ml')).toBe('2,000 mL');
  expect(formatVolume(2000, 'l')).toBe('2 L');
  expect(formatVolume(1550, 'l')).toBe('1.55 L');
});

it('formats imperial volumes with symbols', () => {
  expect(formatVolume(500, 'floz_us')).toBe('17 fl oz');
  expect(formatVolume(500, 'cup_us')).toBe('2.1 cups');
  expect(formatVolume(2000, 'pt_us')).toBe('4.2 pt');
  expect(formatVolume(500, 'floz_imp')).toBe('18 fl oz'); // imperial oz is smaller
});

it('falls back to mL for unknown units', () => {
  expect(formatVolume(500, 'bogus' as any)).toBe('500 mL');
});
