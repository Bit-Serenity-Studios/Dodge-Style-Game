/**
 * IAP orchestration — public API for the rest of the app.
 *
 *   initIap()                     — call once at app root
 *   hasRemoveAds()                — plain boolean read
 *   useRemoveAds()                — reactive React hook
 *   subscribeRemoveAds(l)         — imperative subscription (returns unsubscribe)
 *   buyRemoveAds()                — trigger purchase flow
 *   restorePurchases()            — restore prior purchases
 *   getRemoveAdsPrice()           — localized price string (falls back to config)
 *
 * The active adapter is swapped in one place (below) — switch from
 * `stubIapAdapter` to a real SDK adapter when ready to ship.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  IAP_ENABLED,
  REMOVE_ADS_PRODUCT_ID,
  REMOVE_ADS_PRICE_DISPLAY,
  REMOVE_ADS_STORAGE_KEY,
} from './config';
import { stubIapAdapter } from './stub';
import type { IapAdapter } from './types';

// Swap this line to change SDK. Keep the rest of the app untouched.
const adapter: IapAdapter = stubIapAdapter;

let removeAdsOwned = false;
let localizedPrice: string = REMOVE_ADS_PRICE_DISPLAY;

type Listener = () => void;
const listeners = new Set<Listener>();
function notify(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* isolate listener errors */
    }
  });
}

async function persist(owned: boolean): Promise<void> {
  try {
    if (owned) {
      await AsyncStorage.setItem(REMOVE_ADS_STORAGE_KEY, '1');
    } else {
      await AsyncStorage.removeItem(REMOVE_ADS_STORAGE_KEY);
    }
  } catch {
    /* ignore — worst case we re-ask the user, we never lose money */
  }
}

async function loadPersisted(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(REMOVE_ADS_STORAGE_KEY);
    if (raw === '1') {
      removeAdsOwned = true;
      notify();
    }
  } catch {
    /* ignore */
  }
}

export async function initIap(): Promise<void> {
  if (!IAP_ENABLED) return;
  await loadPersisted();
  await adapter.init();
  try {
    const prices = await adapter.getPrices([REMOVE_ADS_PRODUCT_ID]);
    const found = prices.find((p) => p.productId === REMOVE_ADS_PRODUCT_ID);
    if (found?.price) {
      localizedPrice = found.price;
      notify();
    }
  } catch {
    /* keep fallback price */
  }
}

export function hasRemoveAds(): boolean {
  return IAP_ENABLED && removeAdsOwned;
}

export function getRemoveAdsPrice(): string {
  return localizedPrice;
}

export function subscribeRemoveAds(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook: re-renders when the entitlement or price changes. */
export function useRemoveAds(): { owned: boolean; price: string } {
  const [state, setState] = useState<{ owned: boolean; price: string }>({
    owned: hasRemoveAds(),
    price: localizedPrice,
  });
  useEffect(() => {
    return subscribeRemoveAds(() => {
      setState({ owned: hasRemoveAds(), price: localizedPrice });
    });
  }, []);
  return state;
}

export async function buyRemoveAds(): Promise<'purchased' | 'cancelled' | 'error'> {
  if (!IAP_ENABLED) return 'error';
  if (removeAdsOwned) return 'purchased';
  const result = await adapter.purchase(REMOVE_ADS_PRODUCT_ID);
  if (result === 'purchased') {
    removeAdsOwned = true;
    await persist(true);
    notify();
  }
  return result;
}

export async function restorePurchases(): Promise<{ removeAdsRestored: boolean }> {
  if (!IAP_ENABLED) return { removeAdsRestored: false };
  const owned = await adapter.restore();
  const restored = owned.includes(REMOVE_ADS_PRODUCT_ID);
  if (restored && !removeAdsOwned) {
    removeAdsOwned = true;
    await persist(true);
    notify();
  }
  return { removeAdsRestored: restored };
}

export { IAP_ENABLED, REMOVE_ADS_PRODUCT_ID } from './config';
