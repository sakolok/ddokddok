import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, StatusBar,
  TextInput, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../theme';
import { ROLE_CONFIG } from './LandingScreen';
import { useUser } from '../services/UserContext';

export default function LoginScreen({ navigation, route }) {
  const { loginUser } = useUser();
  const role   = route.params?.role ?? 'user';
  const cfg    = ROLE_CONFIG[role];
  const insets = useSafeAreaInsets();

  const isGuardian = role === 'guardian';

  React.useEffect(() => {
    if (isGuardian) {
      navigation.replace('PIN', { role: 'guardian', isGuardian: true });
    }
  }, [isGuardian]);

  // 보호자는 처음부터 PIN 입력 단계
  const [stepIndex, setStepIndex] = useState(isGuardian ? 1 : 0);
  const [userId, setUserId]       = useState('');
  const [password, setPassword]   = useState('');
  const [pin, setPin]             = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');

  const isStep0 = stepIndex === 0;

  const canNext = isStep0
    ? userId.trim().length > 0
    : isGuardian
      ? pin.length === 6
      : password.trim().length > 0;

  const handleNext = () => {
    setError('');
    if (isStep0) {
      if (!userId.trim()) { setError('아이디를 입력해 주세요.'); return; }
      setStepIndex(1);
    } else {
      if (isGuardian) {
        if (pin.length < 6) { setError('6자리 PIN을 모두 입력해 주세요.'); return; }
        loginUser(userId || '보호자', 'guardian');
        navigation.replace('Dashboard', { role, guardianMode: true });
      } else {
        if (!password.trim()) { setError('비밀번호를 입력해 주세요.'); return; }
        loginUser(userId, 'user');
        navigation.replace('Dashboard', { role });
      }
    }
  };

  const handleBack = () => {
    setError('');
    if (isGuardian || isStep0) { navigation.goBack(); }
    else { setStepIndex(0); setPin(''); }
  };

  // 보호자 PIN 입력 처리
  const addPinDigit = (d) => {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 6) {
      setTimeout(() => handleNextWithPin(next), 300);
    }
  };

  const handleNextWithPin = (pinValue) => {
    loginUser('보호자', 'guardian');
    navigation.replace('Dashboard', { role, guardianMode: true, enteredPin: pinValue });
  };

  const deletePinDigit = () => setPin(p => p.slice(0, -1));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <View style={[styles.progressTrack, { backgroundColor: cfg.lightColor }]}>
          <View style={[styles.progressFill, {
            width: isStep0 ? '50%' : '100%',
            backgroundColor: cfg.color,
          }]} />
        </View>
      </View>

      {/* 본문 — 회원가입 화면과 동일한 시원시원한 대형 질문 스텝 */}
      <View style={styles.body}>
        <Text style={styles.question} numberOfLines={1} adjustsFontSizeToFit>
          {isGuardian
            ? 'PIN 번호를 입력해 주세요.'
            : (isStep0 ? '아이디를 입력해 주세요.' : '비밀번호를 입력해 주세요.')}
        </Text>
        
        {isGuardian && (
          <Text style={styles.questionSub}>
            어르신 앱에서 설정한 6자리 PIN 번호를 입력하면{'\n'}건강 정보를 바로 확인할 수 있어요.
          </Text>
        )}

        {/* STEP 0: 아이디 입력 */}
        {isStep0 && (
          <View style={styles.fieldBlock}>
            <View style={[styles.inputRow, !!error && styles.inputRowError]}>
              <TextInput
                style={styles.input}
                value={userId}
                onChangeText={(v) => { setUserId(v); setError(''); }}
                placeholder="example@naver.com"
                placeholderTextColor={colors.outline + '80'}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={handleNext}
                underlineColorAndroid="transparent"
                {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
              />
            </View>
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        )}

        {/* STEP 1: 사용자 — 비밀번호 */}
        {!isStep0 && !isGuardian && (
          <View style={styles.fieldBlock}>
            <View style={[styles.inputRow, !!error && styles.inputRowError]}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                placeholder="비밀번호를 입력하세요"
                placeholderTextColor={colors.outline + '80'}
                secureTextEntry={!showPw}
                returnKeyType="done"
                onSubmitEditing={handleNext}
                underlineColorAndroid="transparent"
                {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.outline} />
              </TouchableOpacity>
            </View>
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.forgotRow} onPress={() => navigation.navigate('Forgot')} activeOpacity={0.7}>
              <Text style={[styles.forgotText, { color: cfg.color }]}>비밀번호를 잊으셨나요?</Text>
              <Ionicons name="chevron-forward" size={13} color={cfg.color} />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 1: 보호자 — 어르신 PIN 키패드 */}
        {!isStep0 && isGuardian && (
          <View style={styles.pinBlock}>
            {/* PIN 도트 */}
            <View style={styles.pinDotsRow}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={[styles.pinDot, i < pin.length && { backgroundColor: cfg.color, borderColor: cfg.color }]} />
              ))}
            </View>
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {/* 숫자 키패드 */}
            <View style={styles.pinPad}>
              {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']].map((row, ri) => (
                <View key={ri} style={styles.pinPadRow}>
                  {row.map((k, ki) => {
                    if (k === '') return <View key={ki} style={styles.pinKeyEmpty} />;
                    return (
                      <TouchableOpacity
                        key={ki}
                        style={[styles.pinKey, k === 'del' && styles.pinKeyDel]}
                        onPress={() => k === 'del' ? deletePinDigit() : addPinDigit(k)}
                        activeOpacity={0.6}
                      >
                        {k === 'del'
                          ? <Ionicons name="backspace-outline" size={24} color={colors.onBackground} />
                          : <Text style={styles.pinKeyText}>{k}</Text>
                        }
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* 하단 버튼 — 보호자 PIN 단계엔 버튼/링크 모두 숨김 */}
      {!isGuardian && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: canNext ? cfg.color : colors.surfaceContainerHighest }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={[styles.nextBtnText, !canNext && styles.nextBtnTextOff]}>
              {isStep0 ? '다음' : '로그인'}
            </Text>
            <Ionicons
              name={isStep0 ? 'arrow-forward' : 'log-in-outline'}
              size={18}
              color={canNext ? '#fff' : colors.outline}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>

          {/* 사용자 로그인 화면에서만 회원가입 링크 표시 */}
          <View style={styles.signupRow}>
            <Text style={styles.signupRowText}>계정이 없으신가요?</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignupInfo', { role: 'user' })}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.signupRowLink, { color: colors.primary }]}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 8,
  },
  backBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    borderRadius: 22, marginRight: 8,
  },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },

  body: {
    flex: 1, paddingHorizontal: spacing.marginMobile, paddingTop: spacing.stackLg,
  },
  question: {
    fontSize: 26, fontWeight: '800',
    color: colors.onBackground, lineHeight: 34, letterSpacing: -0.3,
    marginBottom: 28,
  },
  questionSub: {
    fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 20,
    marginBottom: 28,
  },
  fieldBlock: { marginBottom: 4 },
  fieldLabel: {
    fontSize: 14, fontWeight: '600', color: colors.onSurfaceVariant,
    marginBottom: 6, paddingHorizontal: 2,
  },
  fieldLabelError: { color: colors.error },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    height: 56, backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5, borderColor: colors.outlineVariant,
    borderRadius: radius.lg, paddingHorizontal: 16,
  },
  inputRowError: { borderColor: colors.error, backgroundColor: colors.errorContainer + '15' },
  input: {
    flex: 1, fontSize: 18, fontWeight: '600', color: colors.onSurface,
    paddingTop: 0, paddingBottom: 0,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : {}),
  },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 2,
  },
  errorText: { fontSize: 12, color: colors.error, marginLeft: 4 },
  forgotRow: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-end', marginTop: 12,
  },
  forgotText: { fontSize: 14, fontWeight: '600' },

  footer: {
    paddingHorizontal: spacing.marginMobile, paddingTop: 12,
    backgroundColor: colors.background,
  },
  nextBtn: {
    height: 58, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, ...shadow.md,
  },
  nextBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  nextBtnTextOff: { color: colors.outline },
  signupRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingBottom: 4,
  },
  signupRowText: { fontSize: 14, color: colors.onSurfaceVariant, marginRight: 4 },
  signupRowLink: { fontSize: 14, fontWeight: '700' },

  // 보호자 PIN 키패드
  pinBlock: { marginTop: 8 },
  pinDotsRow: {
    flexDirection: 'row', justifyContent: 'center', marginBottom: 12,
  },
  pinDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: colors.outlineVariant,
    backgroundColor: 'transparent', marginHorizontal: 9,
  },
  pinPad: { marginTop: 16 },
  pinPadRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 8 },
  pinKey: {
    width: 72, height: 60,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 8,
  },
  pinKeyDel: { backgroundColor: 'transparent' },
  pinKeyEmpty: { width: 72, height: 60, marginHorizontal: 8 },
  pinKeyText: { fontSize: 24, fontWeight: '400', color: colors.onBackground },
});
