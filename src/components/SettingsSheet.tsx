/**
 * Modal settings sheet — sound / music / haptics / reduce-motion +
 * (when compiled with ads / IAP) personalized-ads toggle, Remove Ads
 * purchase, and Restore Purchases button. Called from the gear button
 * on StartScreen. Only rendered when open.
 */
import React, { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ResolvedSettings } from '../hooks/useSettings';
import { colors } from '../constants/colors';
import { STR } from '../constants/strings';
import { ADS_ENABLED } from '../ads';
import { IAP_ENABLED, buyRemoveAds, restorePurchases, useRemoveAds } from '../iap';

type Props = {
  open: boolean;
  settings: ResolvedSettings;
  onChange: (patch: Partial<Omit<ResolvedSettings, 'systemReduceMotion' | 'reduceMotion'>>) => void;
  onClose: () => void;
};

export const SettingsSheet: React.FC<Props> = ({ open, settings, onChange, onClose }) => {
  const { owned: removeAdsOwned, price: removeAdsPrice } = useRemoveAds();
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const onBuy = useCallback(async () => {
    if (busy) return;
    setBusy('buy');
    try {
      const result = await buyRemoveAds();
      if (result === 'error') {
        Alert.alert(STR.settings.purchaseErrorTitle, STR.settings.purchaseErrorMessage, [
          { text: STR.settings.okBtn },
        ]);
      }
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const onRestore = useCallback(async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const { removeAdsRestored } = await restorePurchases();
      Alert.alert(
        removeAdsRestored ? STR.settings.restoreOkTitle : STR.settings.restoreNoneTitle,
        removeAdsRestored ? STR.settings.restoreOkMessage : STR.settings.restoreNoneMessage,
        [{ text: STR.settings.okBtn }],
      );
    } finally {
      setBusy(null);
    }
  }, [busy]);

  return (
    <Modal
      transparent
      visible={open}
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityLabel={STR.settings.close}
        accessibilityRole="button"
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">
            {STR.settings.title}
          </Text>
          <Row
            label={STR.settings.sound}
            hint={STR.settings.soundHint}
            value={settings.sound}
            onToggle={(v) => onChange({ sound: v })}
          />
          <Row
            label={STR.settings.music}
            hint={STR.settings.musicHint}
            value={settings.music}
            onToggle={(v) => onChange({ music: v })}
          />
          <Row
            label={STR.settings.haptics}
            hint={STR.settings.hapticsHint}
            value={settings.haptics}
            onToggle={(v) => onChange({ haptics: v })}
          />
          <Row
            label={STR.settings.reduceMotion}
            hint={
              settings.systemReduceMotion
                ? STR.settings.reduceMotionSystemHint
                : STR.settings.reduceMotionHint
            }
            value={settings.reduceMotion}
            disabled={settings.systemReduceMotion}
            onToggle={(v) => {
              onChange({ reduceMotionUser: v });
              AccessibilityInfo.announceForAccessibility(
                v ? STR.settings.announceReduceOn : STR.settings.announceReduceOff,
              );
            }}
          />
          {ADS_ENABLED && !removeAdsOwned ? (
            <Row
              label={STR.settings.personalizedAds}
              hint={STR.settings.personalizedAdsHint}
              value={settings.personalizedAds}
              onToggle={(v) => onChange({ personalizedAds: v })}
            />
          ) : null}

          {IAP_ENABLED ? (
            <>
              <Text style={styles.sectionHeader} accessibilityRole="header">
                {STR.settings.removeAdsSection}
              </Text>
              {removeAdsOwned ? (
                <View style={styles.ownedRow} accessibilityLabel={STR.settings.removeAdsOwned}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, styles.ownedLabel]}>
                      {STR.settings.removeAdsOwned}
                    </Text>
                    <Text style={styles.rowHint}>{STR.settings.removeAdsOwnedHint}</Text>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.buyBtn,
                    pressed && { opacity: 0.7 },
                    busy === 'buy' && { opacity: 0.6 },
                  ]}
                  onPress={onBuy}
                  disabled={!!busy}
                  accessibilityRole="button"
                  accessibilityLabel={STR.settings.removeAdsAvailable(removeAdsPrice)}
                  accessibilityHint={STR.settings.removeAdsAvailableHint}
                >
                  {busy === 'buy' ? (
                    <ActivityIndicator color={colors.text} />
                  ) : (
                    <>
                      <Text style={styles.buyBtnText}>
                        {STR.settings.removeAdsAvailable(removeAdsPrice)}
                      </Text>
                      <Text style={styles.buyBtnHint}>
                        {STR.settings.removeAdsAvailableHint}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.5 }]}
                onPress={onRestore}
                disabled={!!busy}
                accessibilityRole="button"
                accessibilityLabel={STR.settings.restorePurchases}
                accessibilityHint={STR.settings.restorePurchasesHint}
              >
                {busy === 'restore' ? (
                  <ActivityIndicator color={colors.textDim} size="small" />
                ) : (
                  <Text style={styles.restoreBtnText}>{STR.settings.restorePurchases}</Text>
                )}
              </Pressable>
            </>
          ) : null}

          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel={STR.settings.close}
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>{STR.settings.done}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const Row: React.FC<{
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onToggle: (v: boolean) => void;
}> = ({ label, hint, value, disabled, onToggle }) => (
  <Pressable
    onPress={() => !disabled && onToggle(!value)}
    style={[styles.row, disabled && { opacity: 0.55 }]}
    accessibilityRole="switch"
    accessibilityState={{ checked: value, disabled: !!disabled }}
    accessibilityLabel={label}
    accessibilityHint={hint}
  >
    <View style={{ flex: 1 }}>
      <Text style={styles.rowLabel}>{label}</Text>
      {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
    </View>
    <View style={[styles.pill, value ? styles.pillOn : styles.pillOff]}>
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(5,6,15,0.75)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: '#0a0e1e',
    borderWidth: 1,
    borderColor: 'rgba(125,255,240,0.25)',
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 14,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(125,183,255,0.14)',
  },
  ownedRow: {
    paddingVertical: 12,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(125,183,255,0.14)',
  },
  ownedLabel: { color: '#ffd94a' },
  rowLabel: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  rowHint: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  pill: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: 'rgba(125,255,240,0.4)' },
  pillOff: { backgroundColor: 'rgba(255,255,255,0.08)' },
  knob: { width: 22, height: 22, borderRadius: 11 },
  knobOn: { backgroundColor: colors.accent, alignSelf: 'flex-end' },
  knobOff: { backgroundColor: '#7db7ff', alignSelf: 'flex-start' },
  buyBtn: {
    marginTop: 8,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(125,255,240,0.14)',
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  buyBtnHint: {
    color: colors.textDim,
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  restoreBtn: {
    marginTop: 8,
    alignSelf: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restoreBtnText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textDecorationLine: 'underline',
  },
  closeBtn: {
    marginTop: 18,
    alignSelf: 'center',
    minWidth: 120,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(125,255,240,0.14)',
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.text, fontWeight: '900', letterSpacing: 3 },
});
