import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useTheme } from '../design/theme';

// Gender-neutral stylized anatomy. Left half of the body is authored once
// (silhouette + muscle regions sharing the outer edge) and mirrored for the
// right — keeping symmetry exact. The body outline is drawn *over* the
// muscle fills so regions read as part of the body, not floating tiles.
export const BODY_MUSCLES: Record<string, { label: string; side: 'front' | 'back' | 'both' }> = {
  'sternocleidomastoid': { label: 'Neck',              side: 'front' },
  'trapezius':           { label: 'Traps',             side: 'back' },
  'deltoids':            { label: 'Shoulders',         side: 'both' },
  'pectoralis-major':    { label: 'Chest',             side: 'front' },
  'serratus-anterior':   { label: 'Serratus',          side: 'front' },
  'biceps-brachii':      { label: 'Biceps',            side: 'front' },
  'brachialis':          { label: 'Brachialis',        side: 'front' },
  'brachioradialis':     { label: 'Brachioradialis',   side: 'front' },
  'forearm-flexors':     { label: 'Forearm flexors',   side: 'front' },
  'forearm-extensors':   { label: 'Forearm extensors', side: 'back' },
  'triceps-brachii':     { label: 'Triceps',           side: 'back' },
  'latissimus-dorsi':    { label: 'Lats',              side: 'back' },
  'erector-spinae':      { label: 'Lower back',        side: 'back' },
  'rectus-abdominis':    { label: 'Abs',               side: 'front' },
  'external-obliques':   { label: 'Obliques',          side: 'front' },
  'gluteus-medius':      { label: 'Glute medius',      side: 'back' },
  'gluteus-maximus':     { label: 'Glutes',            side: 'back' },
  'quadriceps':          { label: 'Quads',             side: 'front' },
  'adductors':           { label: 'Adductors',         side: 'front' },
  'hamstrings':          { label: 'Hamstrings',        side: 'back' },
  'tibialis-anterior':   { label: 'Tibialis',          side: 'front' },
  'gastrocnemius':       { label: 'Calves',            side: 'back' },
  'soleus':              { label: 'Soleus',            side: 'back' },
};

// viewBox 0 0 220 480 — figure centered at x=110. Left half authored once;
// right side is baked by mirroring coordinates (transform-based mirroring
// breaks react-native-svg touch hit-testing, so paths are pre-mirrored).
const mirrorX = (d: string): string =>
  d.replace(/([A-Za-z])([^A-Za-z]*)/g, (_, cmd: string, nums: string) => {
    if (cmd.toUpperCase() === 'Z') return cmd;
    const n = nums.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    for (let i = 0; i < n.length; i += 2) n[i] = 220 - n[i]; // x at even indices
    return cmd + ' ' + n.join(' ') + ' ';
  });
const LEFT_BODY =
  'M110 60 ' +
  'C88 60 64 66 56 82 ' +       // clavicle → shoulder tip
  'C48 94 46 112 48 128 ' +     // deltoid/upper-arm outer edge
  'C44 150 40 172 38 192 ' +    // outer forearm taper
  'C36 210 35 226 38 240 ' +    // wrist
  'C42 252 50 252 52 244 ' +    // hand edge
  'C54 230 56 212 58 196 ' +    // inner wrist
  'C60 178 64 158 68 146 ' +    // inner forearm → armpit
  'C74 170 78 194 82 216 ' +    // torso side → waist
  'C80 234 76 246 74 258 ' +    // waist → hip
  'C68 280 66 310 70 342 ' +    // outer thigh → knee
  'C70 368 68 392 68 416 ' +    // outer shin
  'C68 436 70 452 74 462 ' +    // ankle → heel
  'C80 470 92 470 96 464 ' +    // foot
  'C98 452 96 438 95 426 ' +    // inner ankle
  'C95 406 96 388 96 368 ' +    // inner calf
  'C97 348 99 326 101 306 ' +   // inner thigh
  'C103 290 106 278 110 270 Z'; // to crotch

const LEFT_HEAD_NECK =
  'M110 6 C98 6 90 17 90 30 C90 41 96 50 104 54 L102 62 L118 62 L116 54 C124 50 130 41 130 30 C130 17 122 6 110 6 Z';

// Left-half muscle regions — paths deliberately overrun the silhouette edge;
// the outline redrawn on top makes them look embedded.
const FRONT_MUSCLES: Record<string, string[]> = {
  'deltoids':          ['M54 84 C58 64 82 60 94 66 L92 100 C72 104 56 100 54 84 Z'],
  'pectoralis-major':  ['M68 96 C82 86 102 86 110 90 L110 134 C96 140 76 136 66 124 Z'],
  'serratus-anterior': ['M64 128 L76 134 L72 160 L60 150 Z'],
  'rectus-abdominis':  ['M88 138 Q110 132 110 136 L110 208 Q98 212 86 206 Q82 172 88 138 Z'],
  'external-obliques': ['M76 140 C64 170 70 202 80 218 L88 212 C80 186 80 160 84 142 Z'],
  'biceps-brachii':    ['M50 98 C44 112 44 134 50 150 C58 154 64 148 64 138 C64 118 60 104 50 98 Z'],
  'brachialis':        ['M46 152 L44 170 L54 172 L58 156 Z'],
  'brachioradialis':   ['M40 176 C36 190 36 206 40 218 L50 220 C52 204 50 190 46 180 Z'],
  'forearm-flexors':   ['M38 222 C36 238 38 252 42 260 L52 262 C54 246 52 232 48 224 Z'],
  'quadriceps':        ['M74 236 C66 268 66 310 72 342 C78 354 90 356 96 348 C98 316 96 272 92 240 Z'],
  'adductors':         ['M98 240 L104 268 L100 306 L94 330 C92 314 92 280 94 246 Z'],
  'tibialis-anterior': ['M76 350 C72 380 72 414 76 438 C80 446 90 448 94 442 C96 414 96 380 92 354 Z'],
};

const BACK_MUSCLES: Record<string, string[]> = {
  'trapezius':          ['M92 58 C110 54 110 60 110 62 L110 112 L98 120 L84 106 C82 84 84 66 92 58 Z'],
  'deltoids':           ['M54 84 C58 64 82 60 94 66 L92 100 C72 104 56 100 54 84 Z'],
  'latissimus-dorsi':   ['M76 110 C64 150 68 192 82 214 L102 202 C96 162 94 128 88 112 Z'],
  'erector-spinae':     ['M100 122 L110 120 L110 192 L100 188 Z'],
  'triceps-brachii':    ['M50 98 C44 114 44 138 50 154 C58 158 64 152 64 142 C64 122 60 106 50 98 Z'],
  'forearm-extensors':  ['M40 178 C36 194 36 212 40 226 L52 228 C54 210 52 194 46 182 Z'],
  'gluteus-medius':     ['M76 212 C88 202 102 204 108 210 L104 232 C92 238 80 232 74 222 Z'],
  'gluteus-maximus':    ['M72 232 C88 222 104 226 106 236 C108 258 102 276 94 284 C80 288 70 278 68 262 Z'],
  'hamstrings':         ['M74 292 C70 318 70 340 74 356 C80 366 92 366 96 358 C98 330 96 306 94 292 Z'],
  'gastrocnemius':      ['M72 370 C66 388 68 410 74 424 C82 432 92 430 96 422 C98 402 96 380 90 370 Z'],
  'soleus':             ['M76 430 C74 442 76 454 80 460 L92 462 C94 450 94 438 92 428 Z'],
};

// Midline-only muscles get a centered (non-mirrored) shape too.
const MIDLINE: Record<string, Record<'front' | 'back', string>> = {
  'sternocleidomastoid': { front: 'M102 44 L118 44 L116 62 L104 62 Z', back: '' },
  'erector-spinae':      { front: '', back: 'M104 122 L116 122 L116 190 L104 190 Z' },
};

export default function BodyMap({ view, selected, heat, onSelect }: {
  view: 'front' | 'back';
  selected?: string | null;
  heat?: Record<string, number>; // muscle id → 0..1 intensity
  onSelect?: (muscle: string) => void;
}) {
  const { colors } = useTheme();
  const muscles = view === 'front' ? FRONT_MUSCLES : BACK_MUSCLES;
  const fillFor = (id: string) => {
    if (selected === id) return colors.primary;
    const h = heat?.[id];
    if (h != null) return `rgba(37,99,235,${0.15 + 0.75 * Math.min(1, h)})`; // log-exposure shade only
    return colors.accent;
  };
  const strokeFor = (id: string) => selected === id ? colors.primary : colors.muted;
  const region = (id: string, d: string, key: string) => [
    // invisible enlarged hit target under the visible path
    <Path key={`${key}-hit`} d={d} fill="transparent" stroke="transparent" strokeWidth={12}
      onPress={() => onSelect?.(id)}
      accessibilityLabel={`${BODY_MUSCLES[id]?.label || id}${selected === id ? ', selected' : ''}`} />,
    <Path
      key={key} d={d}
      fill={fillFor(id)} stroke={strokeFor(id)} strokeWidth={selected === id ? 1.8 : 0.8}
      onPress={() => onSelect?.(id)} />,
  ];

  return (
    <View accessibilityLabel={`${view} body muscle map`} style={{ alignItems: 'center' }}>
      <Svg viewBox="0 0 220 480" width={215} height={470}>
        {/* base body fill + outline — drawn before muscles; no overlay on top,
            since a stroked overlay path still intercepts taps on Android */}
        <Path d={LEFT_HEAD_NECK} fill={colors.surface} stroke={colors.border} strokeWidth={1.6} />
        <Path d={LEFT_BODY} fill={colors.surface} stroke={colors.border} strokeWidth={1.6} />
        <Path d={mirrorX(LEFT_BODY)} fill={colors.surface} stroke={colors.border} strokeWidth={1.6} />

        {/* muscle regions (left + mirrored right) — every region carries its
            own tap handler; nothing is painted above them */}
        {Object.entries(muscles).flatMap(([id, paths]) =>
          paths.map((d, i) => [
            region(id, d, `${id}-l${i}`),
            region(id, mirrorX(d), `${id}-r${i}`),
          ]))}
        {MIDLINE[view === 'front' ? 'sternocleidomastoid' : 'erector-spinae'][view] &&
          region(view === 'front' ? 'sternocleidomastoid' : 'erector-spinae', MIDLINE[view === 'front' ? 'sternocleidomastoid' : 'erector-spinae'][view], 'midline')}

        {/* orientation cues: minimal face on front, hairline on back */}
        {view === 'front' ? (
          <G stroke={colors.muted} strokeWidth={1.4} fill="none">
            <Circle cx={104} cy={28} r={1.6} fill={colors.muted} stroke="none" />
            <Circle cx={116} cy={28} r={1.6} fill={colors.muted} stroke="none" />
            <Path d="M110 30 L109 38" />
            <Path d="M106 44 Q110 46 114 44" />
          </G>
        ) : (
          <Path d="M100 16 Q110 10 120 16" fill="none" stroke={colors.muted} strokeWidth={1.4} />
        )}
      </Svg>
    </View>
  );
}
