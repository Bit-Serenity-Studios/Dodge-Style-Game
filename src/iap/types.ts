/**
 * IAP adapter interface — any concrete SDK (react-native-iap,
 * expo-in-app-purchases, RevenueCat) can implement this. The rest of
 * the app never imports from a concrete SDK.
 */

export type PurchaseResult = 'purchased' | 'cancelled' | 'error';

export type ProductPrice = {
  productId: string;
  /** Localized price string from the store (e.g. "$4.99", "€4,99"). */
  price: string;
};

export type IapAdapter = {
  /** Called once from the app root. Idempotent. */
  init(): Promise<void>;
  /** True once init has finished. */
  isReady(): boolean;
  /**
   * Fetch localized prices from the store. Never rejects; returns an
   * empty array if the store isn't reachable.
   */
  getPrices(productIds: string[]): Promise<ProductPrice[]>;
  /**
   * Kick off the store purchase UI. Resolves once the user has
   * completed or dismissed the flow. Never rejects.
   */
  purchase(productId: string): Promise<PurchaseResult>;
  /**
   * Restore non-consumable purchases the user has previously bought
   * on another device or after reinstall. Returns the list of
   * currently owned product IDs.
   */
  restore(): Promise<string[]>;
};
