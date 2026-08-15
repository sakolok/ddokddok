import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function TopBar({ title, showBack = true, onBack, right, transparent = false }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top },
      transparent && styles.transparent,
    ]}>
      <View style={styles.inner}>
        {showBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.iconBtn}
            accessibilityLabel="뒤로 가기"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconBtn} />
        )}

        {title ? (
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <View style={styles.iconBtn}>{right ?? null}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant + '50',
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  inner: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.2,
  },
});
