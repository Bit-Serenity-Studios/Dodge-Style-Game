/**
 * Adapter interface — any concrete SDK (AdMob, AppLovin, Unity Ads,
 * IronSource) can implement this. The rest of the app never imports
 * from a concrete SDK.
 */
import type { ComponentType } from 'react';
import type { ViewStyle, StyleProp } from 'react-native';

export type BannerProps = {
  style?: StyleProp<ViewStyle>;
  /** Height reserved for the banner (pt). */
  height: number;
};

export type AdsAdapter = {
  /** Called once from the app root. Idempotent. */
  init(): Promise<void>;
  /** True once init has finished. */
  isReady(): boolean;
  /** Fire-and-forget preload; safe to call repeatedly. */
  preloadInterstitial(): void;
  /**
   * Show the interstitial if one is ready. Resolves when the ad has
   * been dismissed (or immediately, if none was available / disabled).
   * Never rejects — the caller can always await and continue.
   */
  showInterstitial(): Promise<void>;
  /**
   * Banner component to render in the reserved slot. Consumers pass
   * the reserved `height` so the SDK can size an adaptive banner to
   * match.
   */
  Banner: ComponentType<BannerProps>;
  /**
   * User consent / personalization preference. Real SDKs use this to
   * request non-personalized ads under GDPR / CCPA / ATT flows.
   */
  setPersonalized(on: boolean): void;
};
