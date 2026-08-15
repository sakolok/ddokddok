import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme';
import { useUser } from '../services/UserContext';

const MAX_PIN = 6;
const { width } = Dimensions.get('window');
const KEY_SIZE = Math.floor((width - spacing.marginMobile * 2 - 16) / 3);
const KEY_HEIGHT = Math.min(Math.floor(KEY_SIZE * 0.7), 62);

// 매번 랜덤 배치 — 보안 강화
function shuffleKeys() {
  const digits = ['1','2','3','4','5','6','7','8','9','0'];
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return [
    [digits[0], digits[1], digits[2]],
    [digits[3], digits[4], digits[5]],
    [digits[6], digits[7], digits[8]],
    ['',        digits[9], 'delete' ],
  ];
}

export default function PINScreen({ navigation, route }) {
  const { loginUser }   = useUser();
  const insets          = useSafeAreaInsets();
  const fromOnboarding  = route.params?.fromOnboarding ?? false;
  const userName        = route.params?.userName ?? '';
  const role            = route.params?.role ?? 'user';
  const isGuardian      = route.params?.isGuardian ?? (role === 'guardian');

  const [keys]      = useState(() => shuffleKeys());
  const [pin, setPin]       = useState('');
  const [phase, setPhase]   = useState('set');   // 'set' | 'confirm'
  const [firstPin, setFirstPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const shakeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(
    Array.from({ length: MAX_PIN }, () => new Animated.Value(1))
  ).current;
  const errorOpac  = useRef(new Animated.Value(0)).current;

  const animateDot = (i) => {
    Animated.sequence([
      Animated.timing(scaleAnims[i], { toValue: 1.35, duration: 60, useNativeDriver: true }),
      Animated.timing(scaleAnims[i], { toValue: 1,    duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const triggerShake = (msg = '비밀번호가 일치하지 않습니다. 다시 입력해 주세요.') => {
    setErrorMsg(msg);
    errorOpac.setValue(0);
    Animated.timing(errorOpac, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8,   duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8,  duration: 45, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 35, useNativeDriver: true }),
    ]).start();
  };

  const addDigit = (d) => {
    if (pin.length >= MAX_PIN) return;
    animateDot(pin.length);
    const next = pin + d;
    setPin(next);

    if (next.length === MAX_PIN) {
      setTimeout(() => {
        // 보호자 모드: PIN 입력 즉시 대시보드 진입
        if (isGuardian) {
          loginUser('보호자', 'guardian');
          navigation.replace('Dashboard', { role: 'guardian', guardianMode: true, enteredPin: next });
          return;
        }

        // 사용자 회원가입 PIN 설정 모드
        if (phase === 'set') {
          setFirstPin(next);
          setPin('');
          setPhase('confirm');
          setErrorMsg('');
        } else {
          if (next === firstPin) {
            if (fromOnboarding) {
              navigation.replace('Welcome', { userName, role });
            } else {
              navigation.goBack();
            }
          } else {
            triggerShake();
            setTimeout(() => {
              setPin('');
              setPhase('set');
              setFirstPin('');
            }, 700);
          }
        }
      }, 300);
    }
  };

  const deleteDigit = () => {
    if (pin.length === 0) return;
    setPin(p => p.slice(0, -1));
  };

  const handleKey = (key) => {
    if (!key) return;
    if (key === 'delete') deleteDigit();
    else addDigit(key);
  };

  const handleBack = () => {
    if (phase === 'confirm' && !isGuardian) {
      setPhase('set'); setPin(''); setFirstPin(''); setErrorMsg('');
    } else {
      navigation.goBack();
    }
  };

  // 타이틀 & 부제목
  const title = isGuardian
    ? 'PIN 번호를\n입력해 주세요.'
    : (phase === 'set' ? '비밀번호를\n설정해 주세요.' : '비밀번호를\n한 번 더 입력해 주세요.');

  const subtitle = isGuardian
    ? '어르신 앱에서 설정한 6자리 PIN 번호입니다.'
    : (phase === 'set' ? '앱 잠금에 사용할 6자리 숫자를 입력하세요.' : '앞에서 입력한 비밀번호와 동일하게 입력하세요.');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.onBackground} />
        </TouchableOpacity>
      </View>

      {/* 상단: 질문 + 도트 — 한 화면에 꽉 차는 세로 가운데 정렬 */}
      <View style={styles.topSection}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: MAX_PIN }).map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                  { transform: [{ scale: scaleAnims[i] }] },
                ]}
              />
            ))}
          </Animated.View>

          {!!errorMsg && (
            <Animated.Text style={[styles.errorMsg, { opacity: errorOpac }]}>
              {errorMsg}
            </Animated.Text>
          )}
        </View>
      </View>

      {/* 키패드 */}
      <View style={[styles.keypadWrap, { paddingBottom: insets.bottom + 12 }]}>
        {keys.map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map((key, ki) => {
              if (key === '') {
                return <View key={ki} style={[styles.keyPlaceholder, { width: KEY_SIZE, height: KEY_HEIGHT }]} />;
              }
              const isDelete = key === 'delete';
              return (
                <TouchableOpacity
                  key={ki}
                  style={[
                    styles.key,
                    { width: KEY_SIZE, height: KEY_HEIGHT },
                    isDelete && styles.keyDelete,
                  ]}
                  onPress={() => handleKey(key)}
                  activeOpacity={0.55}
                >
                  {isDelete ? (
                    <Ionicons name="backspace-outline" size={26} color={colors.onBackground} />
                  ) : (
                    <Text style={styles.keyText}>{key}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
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

  topSection: {
    flex: 1,
    paddingHorizontal: spacing.marginMobile,
    paddingTop: 8,
    justifyContent: 'center', // 세로 가운데 정렬로 한 화면 꽉 차게
    alignItems: 'center',     // 가로 가운데 정렬
  },
  centerContent: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 28, fontWeight: '800',
    color: colors.onBackground,
    lineHeight: 38, letterSpacing: -0.4,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15, color: colors.onSurfaceVariant,
    lineHeight: 22, marginBottom: 32,
    textAlign: 'center', fontWeight: '500',
    paddingHorizontal: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: colors.outlineVariant,
    backgroundColor: 'transparent',
    marginHorizontal: 8,
  },
  dotFilled: {
    backgroundColor: '#0D9488', // 안심 딥 케어 틸 (Deep Safety Teal)
    borderColor: '#0D9488',
  },
  errorMsg: {
    fontSize: 13, color: colors.error,
    fontWeight: '500', marginTop: 16,
    textAlign: 'center',
  },

  keypadWrap: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: 8,
  },
  keyRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  key: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 4,
  },
  keyDelete: {
    backgroundColor: 'transparent',
  },
  keyPlaceholder: {
    flex: 1,
    marginHorizontal: 4,
  },
  keyText: {
    fontSize: 24, fontWeight: '500',
    color: colors.onBackground,
  },
});
