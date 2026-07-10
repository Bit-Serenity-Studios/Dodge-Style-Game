/**
 * IAP configuration. Currently paired with a stub adapter that
 * confirms a "purchase" via a native Alert dialog — no billing calls,
 * no receipts, no real charge — so the entitlement flow can be
 * exercised without wiring a store SDK.
 *
 * To ship real IAPs, install `react-native-iap` (or
 * `expo-in-app-purchases`), create a matching non-consumable product
 * in App Store Connect + Google Play Console with the same product ID
 * below, write an adapter in ./iap.rniap.ts implementing IapAdapter,
 * and swap the registration in ./index.ts.
 */

export const IAP_ENABLED = true;

/** App Store / Play Console product ID for the "Remove Ads" purchase. */
export const REMOVE_ADS_PRODUCT_ID = 'com.dodgestyle.neondodge.remove_ads';

/**
 * Display price for the pre-purchase button. Real SDKs return a
 * localized `product.localizedPrice` (e.g. "€4,99", "¥600") — this
 * fallback is used only when the SDK hasn't reported prices yet or
 * when running the stub adapter.
 */
export const REMOVE_ADS_PRICE_DISPLAY = '$4.99';

/** AsyncStorage key for the persisted entitlement. */
export const REMOVE_ADS_STORAGE_KEY = 'nd.iap.removeAds.v1';
