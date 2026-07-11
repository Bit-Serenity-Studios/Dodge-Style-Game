/**
 * Score-reactive background layer — the "world" quietly evolves as you
 * play. Two elements composited behind the Starfield:
 *
 *   - `wash`   : full-screen tint that hue-cycles through the palette
 *                (teal → blue → purple → pink → gold → back).
 *                Opacity ramps 0 → 0.18 over the first ~30 points,
 *                so early runs stay pure dark and only long runs get
 *                the color wash.
 *
 *   - `nebula` : large translucent orb near the top-third, slowly
 *                drifting horizontally, hue-cycling on the same
 *                schedule but offset so wash & nebula don't collapse
 *                to the same color. Fades in over the first 40 points.
 *
 * Everything reads `score` (a Reanimated SharedValue) on the UI thread
 * via useAnimatedStyle — zero React re-renders per frame. Colors use
 * interpolateColor over the streak-tier palette so the evolution is
 * palette-consistent with the rest of the game's juice.
 *
 * When reduce-motion is on, the nebula drift stops (opacity + color
 * still animate — those are non-vestibular).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  SharedValue,
} from 'react-native-reanimated';
import { colors } from '../constants/colors';

const PALETTE_STOPS = [0, 40, 80, 120, 160, 200] as const;
const PALETTE_COLORS = [
  colors.accent,       // teal
  colors.accentBlue,   // blue
  colors.accentPurple, // purple
  colors.accentPink,   // pink
  colors.gold,         // gold
  colors.accent,       // back to teal (cycle closes)
];

// Nebula uses the same palette but shifted so wash and nebula never
// resolve to the same hue.
const NEBULA_OFFSET = 80;

type Props = {
  score: SharedValue<number>;
  width: number;
  height: number;
  reduceMotion: boolean;
};

export const BackgroundEvolution: React.FC<Props> = ({ score, width, height, reduceMotion }) => {
  // Cycle score into [0..200] so the evolution loops indefinitely
  // instead of stalling at the last palette stop after ~200 points.
  const cycleWash = useDerivedValue(() => score.value % 200);
  const cycleNebula = useDerivedValue(() => (score.value + NEBULA_OFFSET) % 200);

  const washStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      cycleWash.value,
      PALETTE_STOPS as unknown as number[],
      PALETTE_COLORS,
    );
    // Ramp from 0 to 0.18 over first 30 points so early runs stay
    // untouched — the evolution "reveals itself" as you play.
    const opacity = Math.min(0.18, score.value / 30 * 0.18);
    return { backgroundColor: color, opacity };
  });

  const nebulaR = Math.min(width, height) * 0.75;
  const baseX = width * 0.55 - nebulaR / 2;
  const baseY = height * 0.18 - nebulaR / 2;
  const driftAmp = width * 0.15;

  const nebulaStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      cycleNebula.value,
      PALETTE_STOPS as unknown as number[],
      PALETTE_COLORS,
    );
    const opacity = Math.min(0.35, score.value / 40 * 0.35);
    if (reduceMotion) {
      return { backgroundColor: color, opacity };
    }
    // Slow horizontal drift — one full sweep per ~120 points.
    const angle = (score.value / 120) * Math.PI * 2;
    const dx = Math.sin(angle) * driftAmp;
    const dy = Math.cos(angle * 0.7) * driftAmp * 0.35;
    return {
      backgroundColor: color,
      opacity,
      transform: [{ translateX: dx }, { translateY: dy }],
    };
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        style={[styles.wash, washStyle]}
      />
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        style={[
          styles.nebula,
          {
            width: nebulaR,
            height: nebulaR,
            borderRadius: nebulaR / 2,
            left: baseX,
            top: baseY,
          },
          nebulaStyle,
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  wash: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
  },
  nebula: {
    position: 'absolute',
  },
});
