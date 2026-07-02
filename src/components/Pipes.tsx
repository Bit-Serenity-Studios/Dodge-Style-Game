/**
 * Pipe pairs. Each pipe pool slot is a top+bottom bar with a glowing
 * edge line and a subtle gradient. Position/size fully animated on the
 * UI thread from the shared values wired in useGameLoop.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PIPE_WIDTH } from '../constants/tuning';
import type { PipeSV } from '../hooks/useGameLoop';

type Props = {
  pipes: PipeSV[];
  width: number;
  height: number;
};

export const Pipes: React.FC<Props> = ({ pipes, width, height }) => {
  return (
    <>
      {pipes.map((p, i) => (
        <PipePair key={i} pipe={p} width={width} height={height} />
      ))}
    </>
  );
};

const PipePair: React.FC<{ pipe: PipeSV; width: number; height: number }> = ({ pipe, width, height }) => {
  const topStyle = useAnimatedStyle(() => {
    const gY = pipe.gapY.value;
    const g = pipe.gap.value;
    const topHeight = Math.max(0, gY - g / 2);
    const visible = pipe.active.value && pipe.x.value > -PIPE_WIDTH && pipe.x.value < width + 4;
    return {
      transform: [{ translateX: pipe.x.value }, { translateY: 0 }],
      height: topHeight,
      opacity: visible ? 1 : 0,
    };
  });
  const botStyle = useAnimatedStyle(() => {
    const gY = pipe.gapY.value;
    const g = pipe.gap.value;
    const topHeight = gY + g / 2;
    const botHeight = Math.max(0, height - topHeight);
    const visible = pipe.active.value && pipe.x.value > -PIPE_WIDTH && pipe.x.value < width + 4;
    return {
      transform: [{ translateX: pipe.x.value }, { translateY: topHeight }],
      height: botHeight,
      opacity: visible ? 1 : 0,
    };
  });

  return (
    <>
      <Animated.View style={[styles.pipeBase, topStyle]}>
        <LinearGradient
          colors={['#1a2255', '#2b48b2', '#5b8bff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.edgeLine, { bottom: -2 }]} />
      </Animated.View>
      <Animated.View style={[styles.pipeBase, botStyle]}>
        <LinearGradient
          colors={['#5b8bff', '#2b48b2', '#1a2255']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.edgeLine, { top: -2 }]} />
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  pipeBase: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: PIPE_WIDTH,
    overflow: 'visible',
    shadowColor: '#7db7ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  edgeLine: {
    position: 'absolute',
    left: -3,
    right: -3,
    height: 4,
    backgroundColor: '#a7c8ff',
    shadowColor: '#a7c8ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
});
