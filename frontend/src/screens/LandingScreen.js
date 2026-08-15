import { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Easing, StatusBar, Image, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';

// 앱 시그니처 2D 로고 (똑똑 노크 & 반짝이는 마음)
const LOGO = require('../../assets/toktoktok_2d_official_logo.png');

const TERMS = [
  { id: 'all',       label: '모두 동의합니다.',            bold: true,  arrow: false },
  { id: 'privacy',   label: '[필수] 개인정보 수집 및 이용',  bold: false, arrow: true  },
  { id: 'service',   label: '[필수] 서비스 이용약관',        bold: false, arrow: true  },
  { id: 'marketing', label: '[선택] 마케팅 정보 수신',       bold: false, arrow: true  },
];

const TERMS_DETAILS = {
  privacy: {
    title: '개인정보 수집 및 이용 동의',
    content: `[수집 및 이용 목적]
• 회원 식별 및 가입 의사 확인
• 인지 건강 맞춤형 뇌 운동 서비스 제공 및 학습 기록 관리
• 보호자 연동 서비스 및 주요 건강 알림 안내

[수집 항목]
• 이메일 주소, 성함, 비밀번호, 휴대폰 번호(보호자 가입 시)
• 서비스 이용 기록, 접속 로그, 뇌 운동 점수 및 학습 데이터

[보유 및 이용 기간]
• 회원 탈퇴 시까지 보관 후 지체 없이 파기합니다.
• 단, 관계 법령의 규정에 의하여 보존할 필요가 있는 경우 해당 법령이 정한 기간 동안 안전하게 보관합니다.`,
  },
  service: {
    title: '서비스 이용약관',
    content: `[제1조 (목적)]
본 약관은 '똑톡이'가 제공하는 인지 재활 및 건강 케어 서비스의 이용 조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.

[제2조 (서비스의 제공)]
1. 똑톡이는 회원에게 뇌 운동 게임(카드 짝 맞추기, 순서 기억하기, 쉬운 셈하기, 색상 맞추기) 및 건강 자가 진단 서비스를 제공합니다.
2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.

[제3조 (회원의 의무)]
1. 회원은 타인의 정보를 도용하거나 거짓 정보를 등록해서는 안 됩니다.
2. 회원은 본 서비스의 안정적 운영을 저해하거나 법령에 위배되는 행위를 해서는 안 됩니다.`,
  },
  marketing: {
    title: '마케팅 정보 수신 동의',
    content: `[수신 목적]
• 똑톡이의 새로운 인지 운동 콘텐츠 업데이트 안내
• 어르신 건강 관리 팁 및 유용한 맞춤형 소식 전달
• 이벤트 정보 및 혜택 안내

[수신 채널]
• 앱 푸시 알림, 이메일, 알림톡 및 문자 메시지(SMS)

[동의 철회 및 안내]
• 마케팅 수신 동의는 선택 사항이며, 동의하지 않으셔도 기본 인지 재활 서비스를 이용하실 수 있습니다.
• 동의 후 언제든지 앱 내 마이페이지/설정에서 수신 동의를 철회하실 수 있습니다.`,
  },
};

export const ROLE_CONFIG = {
  user: {
    label: '사용자',
    icon: 'person-outline',
    activeIcon: 'person',
    color: '#3E4C7D',      // 똑톡이 시그니처 딥 인디고 네이비 (Deep Indigo Navy)
    lightColor: '#EBF0F7', // 시그니처 라이트 아이스 틴트
    desc: '본인의 건강을 직접 관리해요',
  },
  guardian: {
    label: '보호자',
    icon: 'shield-checkmark-outline',
    activeIcon: 'shield-checkmark',
    color: '#0D9488',      // 안심 딥 케어 세이지 틸 (Deep Safety Teal)
    lightColor: '#E6F4F1', // 안심 틸 틴트
    desc: '가족의 건강을 함께 지켜줘요',
  },
};

// ── 스플래시 (여기서 로고가 임팩트 있게 등장합니다) ─────────────────
function SplashStep({ onDone }) {
  const scale = useRef(new Animated.Value(0.92)).current;
  const opac  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 35, useNativeDriver: true }),
      Animated.timing(opac,  { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        Animated.timing(opac, { toValue: 0, duration: 350, useNativeDriver: true }).start(onDone);
      }, 1200);
    });
  }, []);

  return (
    <Animated.View style={[styles.splashRoot, { opacity: opac }]}>
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        <Image source={LOGO} style={styles.splashLogo} resizeMode="contain" />
        <Text style={styles.splashWord}>
          <Text style={{ color: colors.primary }}>똑똑</Text>
          <Text style={{ color: '#F59E0B' }}>똑</Text>
        </Text>
        <Text style={styles.splashSub}>AI 건강 케어 파트너</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ── 히어로 (새로운 세련된 카피 적용) ──────────────────
function HeroStep({ onStart, onLogin }) {
  const insets   = useSafeAreaInsets();
  const fadeIn   = useRef(new Animated.Value(0)).current;
  const slideUp  = useRef(new Animated.Value(15)).current;
  const [selectedRole, setSelectedRole] = useState('user');

  const cfg = ROLE_CONFIG[selectedRole];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn,  { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={[styles.heroRoot, { paddingTop: Math.max(insets.top + 8, 20), paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 상단 헤더 상표 선언 (Warm Heart Amber & Indigo Duo 시그니처) */}
      <View style={styles.brandHeader}>
        <Text style={styles.heroWordmark}>
          <Text style={{ color: colors.primary }}>똑똑</Text>
          <Text style={{ color: '#F59E0B' }}>똑</Text>
        </Text>
      </View>

      {/* 상단 타이틀 카피 영역 */}
      <Animated.View style={[styles.topCopyContainer, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <Text style={styles.heroCopySub}>귀찮았던 건강관리,</Text>
        <Text style={styles.heroCopyMain}>
          이제 <Text style={{ color: cfg.color }}>똑똑하게</Text>{'\n'}
          케어 받으세요
        </Text>
      </Animated.View>

      {/* 중앙/하단 카드 영역 */}
      <Animated.View style={[styles.bottomCard, { opacity: fadeIn }]}>
        <Text style={styles.roleTabTitle}>이용 유형을 선택해 주세요</Text>
        
        <View style={styles.roleTabRow}>
          {Object.entries(ROLE_CONFIG).map(([key, conf]) => {
            const active = selectedRole === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.roleTab,
                  active ? { borderColor: conf.color, backgroundColor: conf.lightColor } : styles.roleTabInactive,
                  active && shadow.md
                ]}
                onPress={() => setSelectedRole(key)}
                activeOpacity={0.9}
              >
                <View style={[
                  styles.roleTabIconWrap,
                  { backgroundColor: active ? conf.color : '#F3F4F6' },
                ]}>
                  <Ionicons
                    name={active ? conf.activeIcon : conf.icon}
                    size={24}
                    color={active ? '#fff' : '#4B5563'}
                  />
                </View>
                <Text style={[
                  styles.roleTabLabel,
                  { color: active ? conf.color : '#111827' },
                ]}>
                  {conf.label}
                </Text>
                <Text style={[
                  styles.roleTabDesc,
                  { color: active ? '#4B5563' : '#6B7280' },
                ]}>
                  {conf.desc}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA 버튼 세트 - 사용자/보호자 동일한 위치, 동일한 레이아웃과 구도 */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: cfg.color }]}
            onPress={() => onStart(selectedRole)}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>{cfg.label}로 시작하기</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.btnIcon} />
          </TouchableOpacity>

          {selectedRole === 'guardian' ? (
            <View style={styles.loginRow}>
              <Text style={styles.loginRowText}>어르신 앱에서 설정한 PIN 6자리로 접속</Text>
            </View>
          ) : (
            <View style={styles.loginRow}>
              <Text style={styles.loginRowText}>이미 계정이 있으신가요?</Text>
              <TouchableOpacity onPress={() => onLogin(selectedRole)} activeOpacity={0.7}>
                <Text style={[styles.loginRowLink, { color: colors.primary }]}>로그인</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

// ── 메인 (랜딩 스크린) ───────────────────────────────────────
export default function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep]                 = useState('splash');
  const [pendingRole, setPendingRole]   = useState('user');
  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetY = useRef(new Animated.Value(500)).current;
  const [checked, setChecked] = useState({
    all: false, privacy: false, service: false, marketing: false,
  });
  const [activeDetailModal, setActiveDetailModal] = useState(null);

  const openSheet = (role) => {
    setPendingRole(role);
    setSheetVisible(true);
    sheetY.setValue(500);
    Animated.spring(sheetY, { toValue: 0, friction: 9, tension: 80, useNativeDriver: true }).start();
  };

  const closeSheet = () => {
    Animated.timing(sheetY, { toValue: 500, duration: 240, easing: Easing.in(Easing.ease), useNativeDriver: true })
      .start(() => setSheetVisible(false));
  };

  const toggleCheck = (id) => {
    if (id === 'all') {
      const next = !checked.all;
      setChecked({ all: next, privacy: next, service: next, marketing: next });
    } else {
      const next = { ...checked, [id]: !checked[id] };
      next.all = next.privacy && next.service && next.marketing;
      setChecked(next);
    }
  };

  const canProceed = checked.privacy && checked.service;
  const cfg = ROLE_CONFIG[pendingRole];

  const handleAgree = () => {
    if (!canProceed) return;
    closeSheet();
    setTimeout(() => navigation.navigate('SignupInfo', { role: pendingRole }), 300);
  };

  return (
    <View style={styles.root}>
      {step === 'splash' && <SplashStep onDone={() => setStep('hero')} />}
      {step === 'hero' && (
        <HeroStep
          onStart={(role) => {
            if (role === 'guardian') {
              navigation.navigate('PIN', { role: 'guardian', isGuardian: true });
            } else {
              openSheet('user');
            }
          }}
          onLogin={(role) => {
            if (role === 'guardian') {
              navigation.navigate('PIN', { role: 'guardian', isGuardian: true });
            } else {
              navigation.navigate('Login', { role: 'user' });
            }
          }}
        />
      )}

      {/* 약관 동의 바텀시트 */}
      {sheetVisible && (
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSheet} activeOpacity={1} />
          <Animated.View style={[
            styles.sheet,
            { transform: [{ translateY: sheetY }], paddingBottom: insets.bottom + 20 },
          ]}>
            <View style={styles.sheetHandle} />

            <View style={[styles.sheetRoleBadge, { backgroundColor: cfg.lightColor }]}>
              <Text style={[styles.sheetRoleBadgeText, { color: cfg.color }]}>{cfg.label} 회원가입</Text>
            </View>

            <Text style={styles.sheetTitle}>똑똑똑 서비스를 이용하기 위해{'\n'}약관 동의가 필요해요</Text>

            <View style={styles.termsList}>
              {TERMS.map(({ id, label, bold, arrow }) => (
                <View
                  key={id}
                  style={[
                    styles.termRow,
                    id === 'all' && styles.termRowAll,
                    id === 'all' && checked.all && { backgroundColor: cfg.lightColor },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.termClickArea}
                    onPress={() => toggleCheck(id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkIcon, 
                      checked[id] && { backgroundColor: cfg.color, borderColor: cfg.color }
                    ]}>
                      <Ionicons
                        name="checkmark" size={14}
                        color={checked[id] ? '#fff' : '#D1D5DB'}
                      />
                    </View>
                    <Text style={[styles.termLabel, bold && styles.termLabelBold]}>{label}</Text>
                  </TouchableOpacity>

                  {arrow && (
                    <TouchableOpacity
                      style={styles.arrowBtn}
                      onPress={() => setActiveDetailModal(id)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.agreeBtn,
                { backgroundColor: canProceed ? cfg.color : '#E5E7EB' },
              ]}
              onPress={handleAgree}
              activeOpacity={0.85}
            >
              <Text style={[styles.agreeBtnText, !canProceed && { color: '#9CA3AF' }]}>동의하고 가입하기</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* 약관 상세 내용 팝업 모달 */}
      {activeDetailModal && TERMS_DETAILS[activeDetailModal] && (
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalCard}>
            <View style={styles.detailModalHeader}>
              <Text style={styles.detailModalTitle}>{TERMS_DETAILS[activeDetailModal].title}</Text>
              <TouchableOpacity
                onPress={() => setActiveDetailModal(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailModalScroll} showsVerticalScrollIndicator={true}>
              <Text style={styles.detailModalContent}>
                {TERMS_DETAILS[activeDetailModal].content}
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.detailModalCloseBtn, { backgroundColor: cfg.color }]}
              onPress={() => setActiveDetailModal(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.detailModalCloseBtnText}>확인했습니다</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },

  // 스플래시
  splashRoot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 99,
  },
  splashLogo: { width: 210, height: 210, marginBottom: 24 },
  splashWord: { fontSize: 40, fontWeight: '900', letterSpacing: -0.5 },
  splashSub: { fontSize: 17, fontWeight: '600', color: colors.onSurfaceVariant, marginTop: 8 },

  // 히어로
  heroRoot: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'space-between', paddingHorizontal: 24 },
  brandHeader: { flexDirection: 'row', alignItems: 'center', height: 60 },
  headerLogoIcon: { width: 52, height: 52, marginRight: 10 },
  heroWordmark: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },

  topCopyContainer: { marginTop: 8 },
  heroCopySub: { fontSize: 20, color: '#6B7280', fontWeight: '600', marginBottom: 8 },
  heroCopyMain: { fontSize: 36, fontWeight: '900', color: '#111827', lineHeight: 48, letterSpacing: -1 },

  bottomCard: { width: '100%', marginBottom: 12 },
  roleTabTitle: { fontSize: 16, fontWeight: '800', color: '#374151', marginBottom: 14 },
  roleTabRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  roleTab: {
    flex: 1, padding: 18, borderRadius: 24,
    backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#F3F4F6',
  },
  roleTabInactive: { borderColor: '#F3F4F6' },
  roleTabIconWrap: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  roleTabLabel: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  roleTabDesc: { fontSize: 13, fontWeight: '500', lineHeight: 18 },

  ctaWrap: { gap: 14 },
  startBtn: {
    height: 62, borderRadius: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  startBtnText: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  btnIcon: { marginLeft: 6 },

  guardianNotice: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 4, marginTop: 4, paddingBottom: 10,
  },
  guardianNoticeText: {
    fontSize: 13, color: '#9CA3AF', lineHeight: 20,
    marginLeft: 6, flex: 1,
  },
  loginRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 10 },
  loginRowText: { fontSize: 14, color: '#6B7280', marginRight: 6 },
  loginRowLink: { fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },

  // 바텀시트
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  sheetHandle: {
    width: 40, height: 5, borderRadius: 2.5,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 24,
  },
  sheetRoleBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10, alignSelf: 'flex-start', marginBottom: 14,
  },
  sheetRoleBadgeText: { fontSize: 12, fontWeight: '700' },
  sheetTitle: {
    fontSize: 22, fontWeight: '800',
    color: '#111827', lineHeight: 32, marginBottom: 24,
    letterSpacing: -0.5
  },
  termsList: { marginBottom: 28 },
  termRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12,
  },
  termRowAll: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14, marginBottom: 8,
  },
  termClickArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', marginRight: 12,
  },
  termLabel: { flex: 1, fontSize: 15, color: '#4B5563', fontWeight: '500' },
  termLabelBold: { fontWeight: '700', color: '#111827' },
  arrowBtn: {
    padding: 6,
  },
  agreeBtn: {
    height: 58,
    borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  agreeBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // 약관 상세 모달
  detailModalOverlay: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 999,
  },
  detailModalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailModalScroll: {
    marginBottom: 18,
  },
  detailModalContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500',
  },
  detailModalCloseBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalCloseBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
