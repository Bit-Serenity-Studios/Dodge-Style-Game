/**
 * No-op IAP adapter. Simulates a purchase via a native Alert dialog
 * so the entitlement flow can be exercised without a store SDK.
 * Restore always returns empty — a fresh install of the stub has no
 * ledger to restore from.
 */
import { Alert, Platform } from 'react-native';
import type { IapAdapter, ProductPrice, PurchaseResult } from './types';
import { REMOVE_ADS_PRICE_DISPLAY } from './config';

let ready = false;

function confirmSimulated(productId: string): Promise<PurchaseResult> {
  return new Promise((resolve) => {
    // Alert.alert has a slightly different arg shape on web (uses
    // window.confirm under react-native-web) — the message + buttons
    // still work.
    const title = 'Simulated purchase';
    const msg =
      Platform.OS === 'web'
        ? `Confirm to simulate purchasing ${productId} for ${REMOVE_ADS_PRICE_DISPLAY}. No real charge — this is the dev stub adapter.`
        : `${productId}\n${REMOVE_ADS_PRICE_DISPLAY}\n\nNo real charge — this is the dev stub adapter. In a production build with a real IAP SDK wired, this would open the App Store / Play Store purchase sheet.`;
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancelled') },
      { text: 'Confirm', style: 'default', onPress: () => resolve('purchased') },
    ]);
  });
}

export const stubIapAdapter: IapAdapter = {
  async init() {
    ready = true;
  },
  isReady() {
    return ready;
  },
  async getPrices(productIds: string[]): Promise<ProductPrice[]> {
    return productIds.map((productId) => ({ productId, price: REMOVE_ADS_PRICE_DISPLAY }));
  },
  async purchase(productId: string): Promise<PurchaseResult> {
    if (__DEV__) console.log('[iap:stub] purchase', productId);
    return confirmSimulated(productId);
  },
  async restore(): Promise<string[]> {
    if (__DEV__) console.log('[iap:stub] restore — nothing to restore');
    return [];
  },
};
