/**
 * Small particle pool for near-miss sparks and death/confetti bursts.
 * A fixed-size pool of shared values; a burst() call assigns them.
 * Physics runs on the UI thread via useFrameCallback.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';

const POOL = 60;

export type Particle = {
  x: Animated.SharedValue<number>;
  y: Animated.SharedValue<number>;
  vx: Animated.SharedValue<number>;
  vy: Animated.SharedValue<number>;
  life: Animated.SharedValue<number>; // 0 = dead, 1 = full
  age: Animated.SharedValue<number>;
  hue: Animated.SharedValue<string>;
  size: Animated.SharedValue<number>;
  gravity: Animated.SharedValue<number>;
};

export type ParticleSystemHandle = {
  spark: (x: number, y: number, hue?: string) => void;
  confetti: (x: number, y: number) => void;
};

type Props = {
  handleRef: React.MutableRefObject<ParticleSystemHandle | null>;
};

export const ParticleSystem: React.FC<Props> = ({ handleRef }) => {
  const particles = useMemo<Particle[]>(() => [], []);
  // Fixed pool of shared values.
  for (let i = 0; i < POOL; i++) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const x = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const y = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const vx = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const vy = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const life = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const age = useSharedValue(0);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const hue = useSharedValue('#7dfff0');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const size = useSharedValue(4);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const gravity = useSharedValue(600);
    if (particles.length < POOL) particles.push({ x, y, vx, vy, life, age, hue, size, gravity });
  }
  const cursor = useRef(0);

  const acquire = useCallback((): Particle => {
    const p = particles[cursor.current];
    cursor.current = (cursor.current + 1) % POOL;
    return p;
  }, [particles]);

  const spark = useCallback(
    (x: number, y: number, hue: string = '#7dfff0') => {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const p = acquire();
        const a = Math.random() * Math.PI * 2;
        const s = 180 + Math.random() * 260;
        p.x.value = x;
        p.y.value = y;
        p.vx.value = Math.cos(a) * s;
        p.vy.value = Math.sin(a) * s - 40;
        p.life.value = 1;
        p.age.value = 0;
        p.hue.value = hue;
        p.size.value = 3 + Math.random() * 3;
        p.gravity.value = 700;
      }
    },
    [acquire],
  );

  const confetti = useCallback(
    (x: number, y: number) => {
      const n = 40;
      const colors = ['#ffd94a', '#7dfff0', '#ff7db7', '#c17dff', '#7db7ff'];
      for (let i = 0; i < n; i++) {
        const p = acquire();
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
        const s = 300 + Math.random() * 500;
        p.x.value = x;
        p.y.value = y;
        p.vx.value = Math.cos(a) * s;
        p.vy.value = Math.sin(a) * s;
        p.life.value = 1;
        p.age.value = 0;
        p.hue.value = colors[i % colors.length];
        p.size.value = 4 + Math.random() * 5;
        p.gravity.value = 900;
      }
    },
    [acquire],
  );

  useEffect(() => {
    handleRef.current = { spark, confetti };
    return () => {
      handleRef.current = null;
    };
  }, [handleRef, spark, confetti]);

  // UI-thread physics for all particles.
  useFrameCallback((info) => {
    'worklet';
    if (info.timeSincePreviousFrame == null) return;
    const dt = Math.min(0.05, info.timeSincePreviousFrame / 1000);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.life.value <= 0) continue;
      p.age.value += dt;
      p.vy.value += p.gravity.value * dt;
      p.x.value += p.vx.value * dt;
      p.y.value += p.vy.value * dt;
      p.life.value = Math.max(0, p.life.value - dt * 1.4); // ~0.7s lifespan
    }
  }, true);

  return (
    <>
      {particles.map((p, i) => (
        <ParticleView key={i} p={p} />
      ))}
    </>
  );
};

const ParticleView: React.FC<{ p: Particle }> = ({ p }) => {
  const style = useAnimatedStyle(() => {
    const s = p.size.value;
    const alive = p.life.value > 0 ? 1 : 0;
    return {
      transform: [{ translateX: p.x.value - s / 2 }, { translateY: p.y.value - s / 2 }],
      width: s,
      height: s,
      borderRadius: s / 2,
      opacity: p.life.value * alive,
    };
  });
  const colorStyle = useAnimatedStyle(() => ({ backgroundColor: p.hue.value }));
  return <Animated.View style={[styles.particle, style, colorStyle]} />;
};

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    left: 0,
    top: 0,
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
