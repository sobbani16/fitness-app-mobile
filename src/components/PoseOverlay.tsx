import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { KeypointName } from '../detection/pose/types';
import {
  ARROW_GLYPH,
  PostureAssessment,
  SKELETON_EDGES,
} from '../detection/posture';

interface Props {
  assessment: PostureAssessment;
  width: number;
  height: number;
}

const OK_COLOR = '#22c55e';     // green
const BAD_COLOR = '#ef4444';    // red
const DOT = 12;
const MIN_CONFIDENCE = 0.4;

/**
 * Renders a pose skeleton over the camera using plain Views (no SVG / native
 * deps, so it works in Expo Go). Bones and joints are green when form is good
 * and red where a correction is needed; arrows show which way to move.
 */
export default function PoseOverlay({ assessment, width, height }: Props) {
  const byName = new Map<KeypointName, (typeof assessment.keypoints)[number]>();
  assessment.keypoints.forEach((k) => byName.set(k.name, k));

  const px = (x: number) => x * width;
  const py = (y: number) => y * height;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Bones */}
      {SKELETON_EDGES.map(([a, b], i) => {
        const ka = byName.get(a);
        const kb = byName.get(b);
        if (!ka || !kb) return null;
        if (ka.confidence < MIN_CONFIDENCE || kb.confidence < MIN_CONFIDENCE) {
          return null;
        }
        const x1 = px(ka.x);
        const y1 = py(ka.y);
        const x2 = px(kb.x);
        const y2 = py(kb.y);
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const bad = !ka.ok || !kb.ok;
        return (
          <View
            key={`edge-${i}`}
            style={[
              styles.bone,
              {
                width: length,
                left: x1,
                top: y1 - 2,
                backgroundColor: bad ? BAD_COLOR : OK_COLOR,
                transform: [
                  { translateX: 0 },
                  { rotateZ: `${angle}deg` },
                ],
              },
            ]}
          />
        );
      })}

      {/* Joints */}
      {assessment.keypoints.map((k) => {
        if (k.confidence < MIN_CONFIDENCE) return null;
        return (
          <View
            key={`dot-${k.name}`}
            style={[
              styles.dot,
              {
                left: px(k.x) - DOT / 2,
                top: py(k.y) - DOT / 2,
                backgroundColor: k.ok ? OK_COLOR : BAD_COLOR,
              },
            ]}
          />
        );
      })}

      {/* Correction arrows */}
      {assessment.corrections.map((corr, i) => {
        const k = byName.get(corr.joint);
        if (!k) return null;
        return (
          <View
            key={`arrow-${i}`}
            style={[
              styles.arrowBubble,
              { left: px(k.x) - 18, top: py(k.y) - 44 },
            ]}
          >
            <Text style={styles.arrowText}>{ARROW_GLYPH[corr.direction]}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
    transformOrigin: 'left center',
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  arrowBubble: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 26 },
});
