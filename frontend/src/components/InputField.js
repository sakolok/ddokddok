import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

export default function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  showToggle = false,
  keyboardType = 'default',
  maxLength,
  hint,
  error,
  inputProps = {},
}) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const secure = secureTextEntry && !visible;

  const hasError = !!error;
  const borderColor = hasError ? colors.error : focused ? colors.primary : colors.outlineVariant;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, focused && styles.labelFocused, hasError && styles.labelError]}>
          {label}
        </Text>
      ) : null}

      <View style={[
        styles.inputRow,
        { borderColor },
        focused && styles.inputFocused,
        hasError && styles.inputError,
      ]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.outline + '80'}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          underlineColorAndroid="transparent"
          autoCorrect={false}
          {...inputProps}
        />
        {showToggle && secureTextEntry && (
          <TouchableOpacity
            onPress={() => setVisible(v => !v)}
            style={styles.toggle}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.outline}
            />
          </TouchableOpacity>
        )}
        {hasError && !showToggle && (
          <Ionicons name="alert-circle" size={18} color={colors.error} style={styles.errorIcon} />
        )}
      </View>

      {(hint || hasError) && (
        <Text style={[styles.hint, hasError && styles.hintError]}>
          {hasError ? error : hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  labelFocused: { color: colors.primary },
  labelError: { color: colors.error },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
  },
  inputFocused: {
    backgroundColor: colors.surface,
    elevation: 2,
  },
  inputError: {
    backgroundColor: colors.errorContainer + '20',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.onSurface,
    fontWeight: '400',
    // Android에서 내부 패딩 제거해야 텍스트가 정확히 중앙 정렬되고 입력 가능
    paddingTop: 0,
    paddingBottom: 0,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  toggle: {
    padding: 4,
    marginLeft: 8,
  },
  errorIcon: {
    marginLeft: 8,
  },
  hint: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  hintError: { color: colors.error },
});
