/**
 * BannerAdSlot — always pinned to the bottom of the screen when ads
 * are enabled. The game area above shrinks by BANNER_HEIGHT_PT so the
 * banner never overlaps physics or gameplay tap zones.
 *
 * Rendering is delegated to the active ads adapter's Banner component
 * (see src/ads/index.ts). The stub adapter renders a placeholder AD
 * label; production adapters render the SDK's actual banner view.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Banner, ADS_ENABLED, BANNER_HEIGHT_PT } from '../ads';

export const BannerAdSlot: React.FC = () => {
  if (!ADS_ENABLED) return null;
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Banner height={BANNER_HEIGHT_PT} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
