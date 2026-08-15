import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import InputField from '../components/InputField';
import { colors, spacing, radius, shadow } from '../theme';

export default function ForgotScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    setError('');
    if (!email.trim()) { setError('이메일을 입력해 주세요.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('올바른 이메일 형식이 아닙니다.'); return;
    }
    setSuccess(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
      </View>

      {/* ── 본문 ── */}
      <View style={styles.body}>
        {!success ? (
          <>
            <Text style={styles.question}>가입한 이메일을{'\n'}알려주세요.</Text>
            <Text style={styles.questionHint}>
              입력하신 이메일로 비밀번호 재설정 링크를 보내드립니다.
            </Text>
            {/* TextInput은 일반 View 안에 — 키보드 포커스 안정 */}
            <View style={styles.fieldWrap}>
              <InputField
                label="이메일"
                placeholder="이메일을 입력하세요"
                value={email}
                onChangeText={(v) => { setEmail(v); if (error) setError(''); }}
                keyboardType="email-address"
                error={error}
                inputProps={{ autoCapitalize: 'none', autoCorrect: false }}
              />
            </View>
          </>
        ) : (
          <View style={styles.successBlock}>
            <View style={styles.successIconWrap}>
              <View style={styles.successIconRing} />
              <View style={styles.successIconCircle}>
                <Ionicons name="mail" size={36} color={colors.onPrimary} />
              </View>
            </View>
            <Text style={styles.successTitle}>이메일을 보냈어요!</Text>
            <Text style={styles.successDesc}>
              <Text style={styles.successEmail}>{email}</Text>
              {'\n'}으로 재설정 링크를 발송했습니다.{'\n'}메일함을 확인해 주세요.
            </Text>
            <View style={styles.successHintBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.info} />
              <Text style={styles.successHint}>
                메일이 오지 않으면 스팸함을 확인해 주세요.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── 하단 버튼 ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {!success ? (
          <TouchableOpacity
            style={[styles.nextBtn, !email.trim() && styles.nextBtnOff]}
            onPress={handleSubmit}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextBtnText, !email.trim() && styles.nextBtnTextOff]}>
              재설정 링크 받기
            </Text>
            <Ionicons
              name="send-outline"
              size={18}
              color={email.trim() ? colors.onPrimary : colors.outline}
              style={styles.btnIcon}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.nextBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>로그인으로 돌아가기</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} style={styles.btnIcon} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, height: 52,
  },
  backBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 22,
  },

  body: {
    flex: 1,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.stackLg,
  },
  question: {
    fontSize: 32, fontWeight: '800',
    color: colors.onBackground,
    lineHeight: 42, letterSpacing: -0.5,
    marginBottom: 8,
  },
  questionHint: {
    fontSize: 15, color: colors.onSurfaceVariant,
    lineHeight: 22, marginBottom: 28,
  },
  fieldWrap: {},

  successBlock: {
    flex: 1, alignItems: 'center',
    paddingTop: 32,
  },
  successIconWrap: {
    width: 120, height: 120,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  successIconRing: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.primaryFixed + '60',
  },
  successIconCircle: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.md,
  },
  successTitle: {
    fontSize: 26, fontWeight: '800',
    color: colors.onBackground, letterSpacing: -0.3,
    marginBottom: 12,
  },
  successDesc: {
    fontSize: 15, color: colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 26,
    marginBottom: 20,
  },
  successEmail: { fontWeight: '700', color: colors.primary },
  successHintBox: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: colors.info + '10',
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.info + '25',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  successHint: {
    flex: 1, fontSize: 13, color: colors.onSurfaceVariant,
    lineHeight: 20, marginLeft: 8,
  },

  footer: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  nextBtn: {
    height: 58, backgroundColor: colors.primary,
    borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  nextBtnOff: { backgroundColor: colors.surfaceContainerHighest },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: colors.onPrimary },
  nextBtnTextOff: { color: colors.outline },
  btnIcon: { marginLeft: 6 },
});
