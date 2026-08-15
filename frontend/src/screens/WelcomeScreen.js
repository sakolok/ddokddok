import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, StatusBar, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadow } from '../theme';

const BRAND_LOGO = require('../../assets/logo.png');

export default function WelcomeScreen({ navigation, route }) {
  const userName = route.params?.userName ?? '회원';
  const role     = route.params?.role ?? 'user';
  const insets   = useSafeAreaInsets();

  // 똑똑똑 시그니처 딥 인디고 블루 브랜드 컬러 (#3E4C7D)
  const brandColor      = colors.primary;      // #3E4C7D
  const brandLightColor = colors.primaryFixed; // #EBF0F7

  const mascotScale = useRef(new Animated.Value(0.8)).current;
  const mascotOpac  = useRef(new Animated.Value(0)).current;
  const textOpac    = useRef(new Animated.Value(0)).current;
  const textSlide   = useRef(new Animated.Value(20)).current;
  const btnOpac     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(mascotScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
        Animated.timing(mascotOpac,  { toValue: 1, duration: 450, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpac,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(btnOpac, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 10 }]}>

        <View style={styles.centerBlock}>
          {/* 캐릭터 마스코트 (똑톡이) */}
          <Animated.View style={[styles.mascotWrap, { opacity: mascotOpac, transform: [{ scale: mascotScale }] }]}>
            <View style={[styles.mascotGlowRing, { backgroundColor: brandLightColor }]} />
            <Image source={BRAND_LOGO} style={styles.mascotImg} resizeMode="contain" />
          </Animated.View>

          {/* 깔끔한 환영 메세지 */}
          <Animated.View style={[styles.textBlock, { opacity: textOpac, transform: [{ translateY: textSlide }] }]}>
            <Text style={styles.greeting}>
              안녕하세요, <Text style={{ color: brandColor }}>{userName}</Text>님!{'\n'}
              만나서 반가워요
            </Text>
            <Text style={styles.desc}>
              {role === 'guardian'
                ? `소중한 어르신의 건강과 일상 소식,\n똑똑이가 매일 정성껏 챙겨드릴게요!`
                : `앞으로 매일매일 똑똑이와 함께\n즐겁고 건강한 이야기를 나눠보아요!`}
            </Text>
          </Animated.View>
        </View>

        {/* 시작하기 메인 버튼 */}
        <Animated.View style={{ opacity: btnOpac }}>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: brandColor }]}
            onPress={() => navigation.replace('Dashboard', { userName, role })}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>똑똑똑 시작하기</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.btnIcon} />
          </TouchableOpacity>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1, paddingHorizontal: spacing.marginMobile,
    justifyContent: 'space-between',
  },

  centerBlock: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mascotWrap: {
    width: 220, height: 220,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  mascotGlowRing: {
    position: 'absolute',
    width: 210, height: 210, borderRadius: 105,
  },
  mascotImg: { width: 220, height: 220 },

  textBlock: { alignItems: 'center' },
  greeting: {
    fontSize: 28, fontWeight: '900',
    color: colors.onBackground,
    textAlign: 'center', lineHeight: 38, letterSpacing: -0.5,
    marginBottom: 14,
  },
  desc: {
    fontSize: 16, color: colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 25,
    fontWeight: '500',
  },

  startBtn: {
    height: 58, borderRadius: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    ...shadow.md,
  },
  startBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  btnIcon: { marginLeft: 6 },
});
