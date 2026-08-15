import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, Easing, StatusBar, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../components/TopBar';
import { useUser } from '../services/UserContext';

const FONT_FAMILY = Platform.OS === 'web' 
  ? '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' 
  : 'Pretendard';

const HEALTH_ICON     = require('../../assets/health_check_icon.png');
const QUOKKA_3D_NUKKI = require('../../assets/quokka_3d_nukki.png');
const GAME_ICON       = require('../../assets/brain_game_icon.png');

const QUESTIONS = [
  '오늘이 몇 월이고, 무슨 요일인지를 잘 모른다.',
  '자기가 놔둔 물건을 찾지 못한다.',
  '같은 질문을 반복해서 한다.',
  '약속을 하고서 잊어버린다.',
  '물건을 가지러 갔다가 잊어버리고 그냥 온다.',
  '물건이나, 사람의 이름을 대기가 힘들어 머뭇거린다.',
  '대화 중 내용이 이해되지 않아 반복해서 물어본다.',
  '길을 잃거나 헤맨 적이 있다.',
  '예전에 비해서 계산 능력이 떨어졌다. (물건값이나 거스름돈 계산 등)',
  '예전에 비해 성격이 변했다.',
  '이전에 잘 다루던 기구의 사용이 서툴러졌다. (세탁기, 전기밥솥 등)',
  '예전에 비해 방이나 집안 정리정돈을 하지 못한다.',
  '상황에 맞게 스스로 옷을 선택하여 입지 못한다.',
  '혼자 대중교통으로 목적지에 가기 어렵다.',
  '내복이나 옷이 더러워져도 갈아입지 않으려 한다.',
];

const TOTAL = QUESTIONS.length;
const OPTIONS = [
  { label: '아니다', icon: 'ellipse-outline', activeIcon: 'checkmark-circle' },
  { label: '가끔',   icon: 'ellipse-outline', activeIcon: 'checkmark-circle' },
  { label: '자주',   icon: 'ellipse-outline', activeIcon: 'checkmark-circle' },
];

export default function HealthScreen({ navigation }) {
  const { currentUser } = useUser();
  // 숫자만 있거나 유효하지 않은 이름 데이터 처리 (예: "1" ➔ "어르신" 보정)
  const rawName = currentUser?.name?.trim();
  const userName = (rawName && !/^\d+$/.test(rawName)) ? rawName : '어르신';

  const [idx, setIdx]         = useState(0);
  const [answers, setAnswers] = useState(Array(TOTAL).fill(null));
  const [done, setDone]       = useState(false);
  const cardAnim              = useRef(new Animated.Value(1)).current;

  // 동적 하트 빵빵 무한 피어오름 애니메이션 수치 3종
  const heartAnim1 = useRef(new Animated.Value(0)).current;
  const heartAnim2 = useRef(new Animated.Value(0)).current;
  const heartAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (done) {
      const createHeartLoop = (animVal, delayMs) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delayMs),
            Animated.timing(animVal, {
              toValue: 1,
              duration: 1500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(animVal, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      const l1 = createHeartLoop(heartAnim1, 0);
      const l2 = createHeartLoop(heartAnim2, 450);
      const l3 = createHeartLoop(heartAnim3, 900);

      l1.start();
      l2.start();
      l3.start();

      return () => {
        l1.stop();
        l2.stop();
        l3.stop();
      };
    }
  }, [done]);

  const selected   = answers[idx];
  const progress   = (idx + 1) / TOTAL;

  const animateTransition = (fn) => {
    Animated.sequence([
      Animated.timing(cardAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(cardAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    fn();
  };

  const pick = val => {
    const nextAnswers = [...answers];
    nextAnswers[idx] = val;
    setAnswers(nextAnswers);

    if (idx === TOTAL - 1) {
      setTimeout(() => {
        handleCompleteSurvey(nextAnswers);
      }, 200);
    } else {
      setTimeout(() => {
        animateTransition(() => setIdx(i => i + 1));
      }, 180);
    }
  };

  // KDSQ 검사 완료 및 안전한 기록 보관 파이프라인
  const handleCompleteSurvey = (finalAnswers = answers) => {
    const currentScore = finalAnswers.filter(a => a !== null).reduce((s, a) => s + a, 0);
    const level = currentScore <= 7 ? 'normal' : currentScore <= 14 ? 'caution' : 'risk';
    
    const awsPayload = {
      userId: currentUser?.email || 'anonymous',
      userName: userName,
      surveyType: 'KDSQ-P',
      totalScore: currentScore,
      maxPossibleScore: TOTAL * 2,
      riskLevel: level,
      timestamp: new Date().toISOString(),
      answers: finalAnswers,
    };

    console.log('[AWS Serverless Pipeline] Dispatching Record Payload:', awsPayload);
    setDone(true);
  };

  /* ── 깔끔하고 정갈한 결과 화면 ── */
  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        
        <TopBar title="두뇌 건강 체크" onBack={() => navigation.goBack()} />

        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
          {/* 상단 성취 타이틀 및 시그니처 3D 똑똑이 (확대 + 실시간 하트 빵빵 피어오름 애니메이션) */}
          <View style={styles.resultHeaderArea}>
            <View style={styles.resultMascotWrap}>
              {/* 왼쪽 솟아오르는 분홍 하트 1 */}
              <Animated.View
                style={[
                  styles.floatingHeart,
                  {
                    left: 10,
                    bottom: 60,
                    opacity: heartAnim1,
                    transform: [
                      {
                        translateY: heartAnim1.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -50],
                        }),
                      },
                      {
                        scale: heartAnim1.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.4, 1.3, 0.7],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="heart" size={26} color="#EC4899" />
              </Animated.View>

              {/* 오른쪽 솟아오르는 장미 하트 2 */}
              <Animated.View
                style={[
                  styles.floatingHeart,
                  {
                    right: 10,
                    bottom: 55,
                    opacity: heartAnim2,
                    transform: [
                      {
                        translateY: heartAnim2.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -55],
                        }),
                      },
                      {
                        scale: heartAnim2.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.4, 1.4, 0.7],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="heart" size={24} color="#F43F5E" />
              </Animated.View>

              {/* 중앙 머리 위 솟아오르는 루비 하트 3 */}
              <Animated.View
                style={[
                  styles.floatingHeart,
                  {
                    top: -12,
                    alignSelf: 'center',
                    opacity: heartAnim3,
                    transform: [
                      {
                        translateY: heartAnim3.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -40],
                        }),
                      },
                      {
                        scale: heartAnim3.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.5, 1.3, 0.8],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="heart" size={32} color="#E11D48" />
              </Animated.View>

              {/* 우리의 시그니처 100% 동일한 3D 똑똑이 쿼카 (크기 대폭 확대: 155x155) */}
              <Image
                source={QUOKKA_3D_NUKKI}
                style={{ width: 155, height: 155 }}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.resultMainTitle}>오늘의 두뇌 체크 완료!</Text>
            
            <Text style={styles.resultSubTitle}>
              {`${userName}님, 오늘 두뇌 건강을 살뜰히 챙기셨네요!`}
            </Text>
          </View>

          {/* 추천 활동 카드 그룹 */}
          <View style={styles.recommendSection}>
            <Text style={styles.recommendSectionTitle}>추천 활동</Text>

            {/* 마스코트 3D 똑똑이 섬네일 적용 */}
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => navigation.navigate('AI')}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Image 
                  source={QUOKKA_3D_NUKKI} 
                  style={{ width: 36, height: 36 }} 
                  resizeMode="contain" 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>똑똑이와 즐거운 이야기 나누기</Text>
                <Text style={styles.actionCardSub}>오늘 있었던 일이나 기분을 편하게 얘기해보세요</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C4BEB4" />
            </TouchableOpacity>

            {/* 홈 대시보드와 동일한 게임 아이콘 & 어르신 맞춤 직관적 문구 적용 */}
            <TouchableOpacity 
              style={styles.actionCard} 
              onPress={() => navigation.navigate('Game')}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Image 
                  source={GAME_ICON} 
                  style={{ width: 34, height: 34 }} 
                  resizeMode="contain" 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionCardTitle}>재미있는 게임</Text>
                <Text style={styles.actionCardSub}>카드와 숫자 짝맞추기로 두뇌를 신나게 운동해요</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C4BEB4" />
            </TouchableOpacity>
          </View>

          {/* 하단 다시 체크해보기 단일 버튼 */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={styles.primaryBtn} 
              onPress={() => { setIdx(0); setAnswers(Array(TOTAL).fill(null)); setDone(false); }} 
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>다시 체크해보기</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ── 15개 문항 진행 화면 ── */
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <TopBar title="두뇌 건강 체크" onBack={() => navigation.goBack()} />

      {/* 진행 상태 프로그레스 바 */}
      <View style={styles.progressBlock}>
        <View style={styles.progressMeta}>
          <Text style={styles.progressText}>문항 {idx + 1} / {TOTAL}</Text>
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 상단 친절 배너 */}
        <View style={styles.guideBanner}>
          <Image source={HEALTH_ICON} style={{ width: 22, height: 22, marginRight: 6 }} resizeMode="contain" />
          <Text style={styles.guideText}>어르신의 평소 일상 경험에 맞추어 편안하게 선택해 주세요.</Text>
        </View>

        {/* 질문 카드 (Dashboard 스타일 White Card) */}
        <Animated.View style={[styles.questionCard, { opacity: cardAnim, transform: [{ scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }]}>
          <View style={styles.questionTop}>
            <View style={styles.questionBadge}>
              <Text style={styles.questionBadgeText}>{`질문 ${idx + 1}`}</Text>
            </View>

            <View style={styles.questionDots}>
              {Array.from({ length: TOTAL }).map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.questionDot, 
                    i === idx && styles.questionDotActive, 
                    answers[i] !== null && i !== idx && styles.questionDotDone
                  ]} 
                />
              ))}
            </View>
          </View>

          <Text style={styles.questionText}>{QUESTIONS[idx]}</Text>

          {/* 3지 선다 선택지 그룹 */}
          <View style={styles.optionGroup}>
            {OPTIONS.map(({ label, icon, activeIcon }, i) => {
              const isSelected = selected === i;
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                  ]}
                  onPress={() => pick(i)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={isSelected ? activeIcon : icon}
                    size={24}
                    color={isSelected ? '#3E4C7D' : '#94A3B8'}
                  />
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {label}
                  </Text>
                  {isSelected && (
                    <View style={styles.optionCheck}>
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' },

  progressBlock: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '700', color: '#475569' },
  progressPct:  { fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '800', color: '#3E4C7D' },
  progressTrack: {
    height: 8, backgroundColor: '#EEF2FF',
    borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#3E4C7D', borderRadius: 4 },

  scroll: { padding: 20, gap: 16 },

  guideBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  guideText: { flex: 1, fontFamily: FONT_FAMILY, fontSize: 14, color: '#334155', lineHeight: 20, fontWeight: '600' },

  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1, borderColor: '#E2E8F0',
    padding: 22, gap: 20,
    shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  questionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  questionBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 14,
  },
  questionBadgeText: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '800', color: '#3E4C7D' },
  questionDots: { flexDirection: 'row', gap: 4 },
  questionDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  questionDotActive: { backgroundColor: '#3E4C7D', width: 14 },
  questionDotDone:   { backgroundColor: '#10B981' },
  questionText: { fontFamily: FONT_FAMILY, fontSize: 19, fontWeight: '800', color: '#191F28', lineHeight: 29 },

  optionGroup: { gap: 12 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 18, paddingHorizontal: 18, paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  optionSelected: {
    borderColor: '#3E4C7D',
    backgroundColor: '#EEF2FF',
  },
  optionText: { flex: 1, fontFamily: FONT_FAMILY, fontSize: 16, color: '#191F28', fontWeight: '600' },
  optionTextSelected: { color: '#3E4C7D', fontWeight: '800' },
  optionCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#3E4C7D',
    alignItems: 'center', justifyContent: 'center',
  },

  /* ── 완료 결과 스크롤 스타일 (Dashboard 통일) ── */
  resultScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 20,
  },
  resultHeaderArea: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  resultMascotWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
  },
  floatingHeart: {
    position: 'absolute',
    zIndex: 10,
  },
  resultMainTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 25,
    fontWeight: '800',
    color: '#191F28',
    letterSpacing: -0.3,
  },
  resultSubTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '600',
    color: '#8C857B',
    textAlign: 'center',
  },

  recommendSection: {
    gap: 10,
  },
  recommendSectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 17.5,
    fontWeight: '800',
    color: '#191F28',
    marginLeft: 2,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#3E4C7D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6,
    elevation: 1,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCardTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#191F28',
    marginBottom: 3,
  },
  actionCardSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 13.5,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 19,
  },

  buttonGroup: {
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: '#3E4C7D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3E4C7D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
});
