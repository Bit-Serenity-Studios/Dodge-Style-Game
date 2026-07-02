/**
 * Two-layer parallax starfield. Far/near layers scroll at different
 * speeds; a pool of Views wraps horizontally.
 */
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { STAR_COUNT_FAR, STAR_COUNT_NEAR, STAR_SPEED_FAR, STAR_SPEED_NEAR } from '../constants/tuning';

type Star = { x0: number; y0: number; size: number; alpha: number };

function makeStars(count: number, width: number, height: number, sizeRange: [number, number]): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x0: Math.random() * width,
      y0: Math.random() * height,
      size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
      alpha: 0.4 + Math.random() * 0.6,
    });
  }
  return stars;
}

export const Starfield: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const far = useMemo(() => makeStars(STAR_COUNT_FAR, width, height, [1, 2]), [width, height]);
  const near = useMemo(() => makeStars(STAR_COUNT_NEAR, width, height, [1.6, 3]), [width, height]);
  const offsetFar = useSharedValue(0);
  const offsetNear = useSharedValue(0);

  useFrameCallback((info) => {
    'worklet';
    if (info.timeSincePreviousFrame == null) return;
    const dt = Math.min(0.1, info.timeSincePreviousFrame / 1000);
    offsetFar.value = (offsetFar.value + STAR_SPEED_FAR * dt) % width;
    offsetNear.value = (offsetNear.value + STAR_SPEED_NEAR * dt) % width;
  }, true);

  return (
    <>
      {far.map((s, i) => (
        <ParallaxStar key={`f${i}`} s={s} offset={offsetFar} width={width} color="#7db7ff" />
      ))}
      {near.map((s, i) => (
        <ParallaxStar key={`n${i}`} s={s} offset={offsetNear} width={width} color="#c9dcff" />
      ))}
    </>
  );
};

const ParallaxStar: React.FC<{
  s: Star;
  offset: Animated.SharedValue<number>;
  width: number;
  color: string;
}> = ({ s, offset, width, color }) => {
  const style = useAnimatedStyle(() => {
    const x = (s.x0 - offset.value + width) % width;
    return { transform: [{ translateX: x }, { translateY: s.y0 }] };
  });
  return (
    <Animated.View
      style={[
        styles.star,
        { width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: color, opacity: s.alpha },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
