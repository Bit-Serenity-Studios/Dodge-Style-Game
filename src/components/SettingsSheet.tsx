/**
 * Modal settings sheet — sound, haptics, reduce-motion overrides.
 * Called from the gear button on StartScreen. Only rendered when open.
 */
import React from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ResolvedSettings } from '../hooks/useSettings';
import { colors } from '../constants/colors';

type Props = {
  open: boolean;
  settings: ResolvedSettings;
  onChange: (patch: Partial<Omit<ResolvedSettings, 'systemReduceMotion' | 'reduceMotion'>>) => void;
  onClose: () => void;
};

export const SettingsSheet: React.FC<Props> = ({ open, settings, onChange, onClose }) => {
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
        accessibilityLabel="Close settings"
        accessibilityRole="button"
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">
            SETTINGS
          </Text>
          <Row
            label="Sound"
            hint="SFX and score ticks"
            value={settings.sound}
            onToggle={(v) => onChange({ sound: v })}
          />
          <Row
            label="Haptics"
            hint="Vibration on taps, scores, and death"
            value={settings.haptics}
            onToggle={(v) => onChange({ haptics: v })}
          />
          <Row
            label="Reduce motion"
            hint={
              settings.systemReduceMotion
                ? 'Following your system Reduce Motion setting'
                : 'Skip camera shake, freeze-frame, and idle bob'
            }
            value={settings.reduceMotion}
            disabled={settings.systemReduceMotion}
            onToggle={(v) => {
              onChange({ reduceMotionUser: v });
              // Announce, so users on screen readers know what changed.
              AccessibilityInfo.announceForAccessibility(
                v ? 'Reduce motion on' : 'Reduce motion off',
              );
            }}
          />
          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityLabel="Close settings"
            accessibilityRole="button"
          >
            <Text style={styles.closeText}>DONE</Text>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(125,183,255,0.14)',
  },
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
