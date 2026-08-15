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

// ── 재사용 인풋 컴포넌트 (외부 InputField 미사용, 직접 TextInput) ──
function Field({ label, error, children }) {
  return (
    <View style={fStyles.block}>
      {children}
      {!!error && (
        <View style={fStyles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={fStyles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function FInput({ value, onChangeText, placeholder, keyboard = 'default', secure = false, showToggle = false, error, inputProps = {} }) {
  const [show, setShow] = useState(false);
  const hasError = !!error;
  return (
    <View style={[fStyles.inputRow, hasError && fStyles.inputRowError]}>
      <TextInput
        style={fStyles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.outline + '80'}
        keyboardType={keyboard}
        secureTextEntry={secure && !show}
        underlineColorAndroid="transparent"
        autoCorrect={false}
        returnKeyType="next"
        {...(Platform.OS === 'android' ? { includeFontPadding: false } : {})}
        {...inputProps}
      />
      {showToggle && secure && (
        <TouchableOpacity onPress={() => setShow(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.outline} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const fStyles = StyleSheet.create({
  block: { marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 6, paddingHorizontal: 2 },
  labelError: { color: colors.error },
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
  errorRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 2 },
  errorText: { fontSize: 12, color: colors.error, marginLeft: 4 },
});

// ── 스텝 정의 (성함 ➔ 아이디/이메일 ➔ 연락처 ➔ 비밀번호 순서) ──
const USER_STEPS = ['name', 'email', 'password', 'confirmPw'];
const GUARDIAN_STEPS = ['name', 'email', 'phone', 'password', 'confirmPw'];

const STEP_CONFIG = {
  name:      { question: '성함을 알려주세요.',                hint: '똑똑똑에서 사용할 성함입니다.',             label: '이름',         placeholder: '성함을 입력하세요',         keyboard: 'default',       secure: false, inputProps: {} },
  email:     { question: '아이디를 입력해 주세요.',            hint: '로그인에 사용할 이메일 주소입니다.',        label: '아이디',       placeholder: 'example@naver.com',        keyboard: 'email-address', secure: false, inputProps: { autoCapitalize: 'none', autoCorrect: false } },
  phone:     { question: '연락처를 입력해 주세요.',            hint: '본인 인증 및 알림 발송에 사용됩니다.',       label: '휴대폰 번호',  placeholder: '010-0000-0000',            keyboard: 'phone-pad',     secure: false, inputProps: {} },
  password:  { question: '비밀번호를 설정해 주세요.',          hint: '8자 이상 기억하기 쉬운 비밀번호를 입력해 보세요.', label: '비밀번호',     placeholder: '비밀번호를 입력하세요',     keyboard: 'default',       secure: true,  showToggle: true, inputProps: {} },
  confirmPw: { question: '비밀번호를 다시 입력해 주세요.', hint: '앞에서 설정한 비밀번호와 동일하게 입력해 주세요.', label: '비밀번호 확인', placeholder: '비밀번호를 다시 입력하세요', keyboard: 'default',       secure: true,  showToggle: true, inputProps: {} },
};

const GUARDIAN_STEP_CONFIG = {
  ...STEP_CONFIG,
  name:   { ...STEP_CONFIG.name,   question: '보호자 성함을 알려주세요.',   hint: '어르신에게 표시될 성함입니다.' },
  email:  { ...STEP_CONFIG.email,  question: '보호자 아이디를 입력해 주세요.' },
};

export default function SignupInfoScreen({ navigation, route }) {
  const { registerUser } = useUser();
  const role   = route.params?.role ?? 'user';
  const cfg    = ROLE_CONFIG[role];
  const STEPS  = role === 'guardian' ? GUARDIAN_STEPS : USER_STEPS;
  const SCONFIG = role === 'guardian' ? GUARDIAN_STEP_CONFIG : STEP_CONFIG;
  const insets = useSafeAreaInsets();

  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState({
    email: '', name: '', phone: '', password: '', confirmPw: '',
  });
  const [error, setError] = useState('');

  const stepId  = STEPS[stepIndex];
  const sc      = SCONFIG[stepId];
  const isLast  = stepIndex === STEPS.length - 1;
  const canNext = (values[stepId] ?? '').trim().length > 0;
  const progress = (stepIndex + 1) / STEPS.length;

  const validate = () => {
    const v = (values[stepId] ?? '').trim();
    if (!v) { setError(`${sc.label}을(를) 입력해 주세요.`); return false; }
    if (stepId === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError('올바른 이메일 형식이 아닙니다.'); return false;
    }
    if (stepId === 'phone' && v.replace(/[^0-9]/g, '').length < 10) {
      setError('올바른 휴대폰 번호를 입력해 주세요.'); return false;
    }
    if (stepId === 'password' && v.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.'); return false;
    }
    if (stepId === 'confirmPw' && v !== (values.password ?? '').trim()) {
      setError('비밀번호가 일치하지 않습니다.'); return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (!validate()) return;
    if (isLast) {
      registerUser({
        email: values.email,
        name: values.name,
        password: values.password,
        phone: values.phone,
        role,
      });
      navigation.navigate('PIN', { fromOnboarding: true, userName: values.name, role });
      return;
    }
    // 상태만 변경 — 애니메이션 없음, 리렌더링 최소화
    setStepIndex(i => i + 1);
  };

  const handleBack = () => {
    setError('');
    if (stepIndex === 0) { navigation.goBack(); return; }
    setStepIndex(i => i - 1);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
        <View style={[styles.progressTrack, { backgroundColor: cfg.lightColor }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: cfg.color }]} />
        </View>
      </View>

      {/* 본문 — 깔끔하고 시원한 대형 질문 스텝 */}
      <View style={styles.body}>
        <Text style={styles.question} numberOfLines={1} adjustsFontSizeToFit>{sc.question}</Text>
        <Text style={styles.questionHint}>{sc.hint}</Text>

        {/* TextInput 직접 사용 — 컴포넌트 체인 최소화 */}
        <Field label={sc.label} error={error}>
          <FInput
            key={stepId}
            value={values[stepId] ?? ''}
            onChangeText={(v) => { setValues(prev => ({ ...prev, [stepId]: v })); setError(''); }}
            placeholder={sc.placeholder}
            keyboard={sc.keyboard}
            secure={sc.secure}
            showToggle={sc.showToggle}
            error={error}
            inputProps={sc.inputProps}
          />
        </Field>
      </View>

      {/* 하단 버튼 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: canNext ? cfg.color : colors.surfaceContainerHighest }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, !canNext && styles.nextBtnTextOff]}>
            {isLast ? 'PIN 설정하기' : '다음'}
          </Text>
          <Ionicons
            name={isLast ? 'lock-closed' : 'arrow-forward'}
            size={18}
            color={canNext ? '#fff' : colors.outline}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
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
  stepCounter: {
    fontSize: 13, fontWeight: '600', color: colors.outline,
    minWidth: 32, textAlign: 'right', marginLeft: 10,
  },
  titleBanner: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.marginMobile, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.outlineVariant + '40',
  },
  titleBannerText: {
    fontSize: 14, fontWeight: '700', marginLeft: 6,
  },

  body: {
    flex: 1, paddingHorizontal: spacing.marginMobile, paddingTop: spacing.stackLg,
  },
  question: {
    fontSize: 26, fontWeight: '800',
    color: colors.onBackground, lineHeight: 34, letterSpacing: -0.3,
    marginBottom: 8,
  },
  questionHint: {
    fontSize: 14, color: colors.onSurfaceVariant, lineHeight: 20, marginBottom: 28,
  },

  footer: {
    paddingHorizontal: spacing.marginMobile, paddingTop: 12,
    backgroundColor: colors.background,
  },
  nextBtn: {
    height: 58, borderRadius: radius.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    ...shadow.md,
  },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  nextBtnTextOff: { color: colors.outline },
});
