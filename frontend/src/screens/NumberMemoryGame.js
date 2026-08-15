import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Animated, ScrollView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../components/TopBar';

const FONT_FAMILY = Platform.OS === 'web' 
  ? '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' 
  : 'Pretendard';

const QUOKKA_3D_NUKKI = require('../../assets/quokka_3d_nukki.png');

const KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

// 각 단계별 난이도 (1단계 3자리 ~ 5단계 7자리)
const LEVEL_CONFIGS = [
  { level: 1, digits: 3, showTime: 3 },
  { level: 2, digits: 4, showTime: 4 },
  { level: 3, digits: 5, showTime: 4 },
  { level: 4, digits: 6, showTime: 5 },
  { level: 5, digits: 7, showTime: 5 },
];

function makeSequence(len) {
  return Array.from({ length: len }, () => String(Math.floor(Math.random() * 10)));
}

export default function NumberMemoryGame({ navigation }) {
  const [levelIdx, setLevelIdx] = useState(0); // 0 (1단계) ~ 4 (5단계)
  const [phase, setPhase] = useState('show'); // 'show' | 'input'
  const [seq, setSeq] = useState(() => makeSequence(LEVEL_CONFIGS[0].digits));
  const [input, setInput] = useState([]);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [feedbackState, setIsFeedbackState] = useState('none'); // 'none' | 'correct' | 'wrong'

  const timerRef = useRef(null);
  const starFlyAnim = useRef(new Animated.Value(0)).current;

  const currentConfig = LEVEL_CONFIGS[levelIdx];

  // 새 단계 시작
  const startLevel = (idx) => {
    setLevelIdx(idx);
    setSeq(makeSequence(LEVEL_CONFIGS[idx].digits));
    setInput([]);
    setIsFeedbackState('none');
    setPhase('show');
  };

  // 카운트다운 타이머 (숫자 보여주기)
  useEffect(() => {
    if (phase === 'show') {
      setCountdown(currentConfig.showTime);
      timerRef.current = setInterval(() => {
        setCountdown((p) => {
          if (p <= 1) {
            clearInterval(timerRef.current);
            setPhase('input');
            return 0;
          }
          return p - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, levelIdx, seq]);

  // 최종 축하 별 애니메이션
  useEffect(() => {
    if (gameFinished) {
      starFlyAnim.setValue(0);
      const loopAnim = Animated.loop(
        Animated.timing(starFlyAnim, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        })
      );
      loopAnim.start();
      return () => loopAnim.stop();
    }
  }, [gameFinished]);

  // 별 날아가기 애니메이션 인터폴레이션
  const star1Y = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -55] });
  const star1X = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [-5, -42] });
  const star1Scale = starFlyAnim.interpolate({ inputRange: [0, 0.35, 0.75, 1], outputRange: [0.2, 1.3, 1, 0] });
  const star1Opacity = starFlyAnim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });

  const star2Y = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [25, -60] });
  const star2X = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 45] });
  const star2Scale = starFlyAnim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0.1, 1.4, 0.9, 0] });
  const star2Opacity = starFlyAnim.interpolate({ inputRange: [0, 0.25, 0.85, 1], outputRange: [0, 1, 1, 0] });

  const star3Y = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [30, -70] });
  const star3X = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0] });
  const star3Scale = starFlyAnim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.2, 1.5, 1.1, 0] });
  const star3Opacity = starFlyAnim.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });

  // 키패드 입력 처리
  const pressKey = (k) => {
    if (phase !== 'input' || feedbackState !== 'none') return;

    if (k === 'del') {
      setInput((prev) => prev.slice(0, -1));
      return;
    }

    const nextInput = [...input, k];
    setInput(nextInput);

    // 해당 단계 자릿수만큼 모두 입력 시 (맞든 틀리든 막히지 않고 다음 단계로 자동 이동!)
    if (nextInput.length === seq.length) {
      const isCorrect = nextInput.join('') === seq.join('');

      if (isCorrect) {
        setIsFeedbackState('correct');
        setScore((prev) => prev + (levelIdx + 1) * 20);
      } else {
        setIsFeedbackState('wrong');
      }

      setTimeout(() => {
        if (levelIdx < LEVEL_CONFIGS.length - 1) {
          // 틀리거나 맞춰도 막힘없이 바로 다음 단계 진입!
          startLevel(levelIdx + 1);
        } else {
          // 마지막 5단계 입력 완료 시 최종 모달 오픈
          setGameFinished(true);
        }
      }, 600);
    }
  };

  const resetGame = () => {
    setGameFinished(false);
    setScore(0);
    startLevel(0);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FB" />

      {/* 상단 톡톡톡 네비게이션 헤더 */}
      <TopBar title="순서 기억하기" onBack={() => setPauseModalVisible(true)} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 상단 점수 및 잠시 쉴래요 (우측 정렬) */}
        <View style={styles.topGuideContainer}>
          <View style={styles.statsRightGroup}>
            <Text style={styles.statChipText}>{`점수 ${score}점`}</Text>
            <TouchableOpacity
              style={styles.pauseBtn}
              onPress={() => setPauseModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="pause" size={14} color="#556080" />
              <Text style={styles.pauseBtnText}>잠시 쉴래요</Text>
            </TouchableOpacity>
          </View>

          {/* 피드백에 따른 따뜻한 가이드 상자 */}
          <View
            style={[
              styles.guideBox,
              feedbackState === 'correct' && styles.guideBoxCorrect,
              feedbackState === 'wrong' && styles.guideBoxWrong,
            ]}
          >
            <Text
              style={[
                styles.guideMainText,
                feedbackState === 'correct' && styles.guideTextCorrect,
                feedbackState === 'wrong' && styles.guideTextWrong,
              ]}
            >
              {feedbackState === 'correct'
                ? '정답입니다! 참 잘하셨어요!'
                : feedbackState === 'wrong'
                ? '괜찮아요! 다음 단계로 넘어갈게요.'
                : phase === 'show'
                ? `숫자 순서를 잘 기억해보세요! (${countdown}초)`
                : '기억하신 순서대로 숫자를 눌러보세요!'}
            </Text>
          </View>
        </View>

        {/* 한 줄 가독성 메인 숫자 보드 */}
        <View
          style={[
            styles.boardWrap,
            feedbackState === 'correct' && styles.boardWrapCorrect,
            feedbackState === 'wrong' && styles.boardWrapWrong,
          ]}
        >
          {phase === 'show' ? (
            <View style={styles.singleLineDisplayBox}>
              <Text style={styles.singleLineDisplayText} numberOfLines={1}>
                {seq.join(' ')}
              </Text>
            </View>
          ) : (
            <View style={styles.singleLineInputWrap}>
              {seq.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.inputSlot,
                    i < input.length && styles.inputSlotFilled,
                    feedbackState === 'correct' && styles.inputSlotCorrect,
                    feedbackState === 'wrong' && styles.inputSlotWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.inputSlotText,
                      i < input.length && styles.inputSlotTextFilled,
                      feedbackState === 'correct' && styles.inputSlotTextCorrect,
                      feedbackState === 'wrong' && styles.inputSlotTextWrong,
                    ]}
                  >
                    {i < input.length ? input[i] : '?'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 키패드 영역 */}
        <View style={styles.keypadWrap}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={styles.keyRow}>
              {row.map((k, ki) => {
                if (k === '') return <View key={ki} style={styles.keyEmpty} />;
                const isDel = k === 'del';
                return (
                  <TouchableOpacity
                    key={ki}
                    style={[
                      styles.key,
                      (phase !== 'input' || feedbackState !== 'none') && styles.keyDisabled,
                      isDel && styles.keyDel,
                    ]}
                    onPress={() => pressKey(k)}
                    activeOpacity={0.7}
                    disabled={phase !== 'input' || feedbackState !== 'none'}
                  >
                    {isDel ? (
                      <Ionicons name="backspace-outline" size={28} color="#475569" />
                    ) : (
                      <Text style={styles.keyText}>{k}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* 최종 5단계 완료 모달 */}
      {gameFinished && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative', width: 150, height: 135 }}>
              <Image source={QUOKKA_3D_NUKKI} style={{ width: 120, height: 120 }} resizeMode="contain" />

              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [{ translateY: star1Y }, { translateX: star1X }, { scale: star1Scale }],
                  opacity: star1Opacity,
                }}
              >
                <Text style={{ fontSize: 30 }}>⭐</Text>
              </Animated.View>

              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [{ translateY: star2Y }, { translateX: star2X }, { scale: star2Scale }],
                  opacity: star2Opacity,
                }}
              >
                <Text style={{ fontSize: 32 }}>✨</Text>
              </Animated.View>

              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [{ translateY: star3Y }, { translateX: star3X }, { scale: star3Scale }],
                  opacity: star3Opacity,
                }}
              >
                <Text style={{ fontSize: 36 }}>⭐</Text>
              </Animated.View>
            </View>

            <Text style={styles.modalTitle}>5단계까지 수고하셨어요!</Text>
            <Text style={styles.modalSub}>끝까지 멋지게 노력해주신 어르신 참 잘하셨습니다!</Text>

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={resetGame} activeOpacity={0.85}>
              <Text style={styles.modalPrimaryBtnText}>1단계부터 다시 하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOutBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.modalOutBtnText}>게임 목록으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 잠시 쉬어가기 모달 */}
      {pauseModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Image source={QUOKKA_3D_NUKKI} style={{ width: 90, height: 90, marginBottom: 4 }} resizeMode="contain" />
            <Text style={styles.modalTitle}>잠시 쉬어가기</Text>
            <Text style={styles.modalSub}>천천히 쉬어가셔도 괜찮아요.</Text>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setPauseModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryBtnText}>이어서 계속하기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOutBtn}
              onPress={() => {
                setPauseModalVisible(false);
                navigation.goBack();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalOutBtnText}>게임 목록으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F6F8FB',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topGuideContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 12,
  },
  statsRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 10,
    marginBottom: 10,
  },
  statChipText: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pauseBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  guideBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  guideBoxCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
    borderWidth: 1.5,
  },
  guideBoxWrong: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
  },
  guideMainText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  guideTextCorrect: {
    color: '#15803D',
  },
  guideTextWrong: {
    color: '#B45309',
  },
  boardWrap: {
    width: '100%',
    flex: 1,
    minHeight: 130,
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 14,
  },
  boardWrapCorrect: {
    backgroundColor: '#F0FDF4',
  },
  boardWrapWrong: {
    backgroundColor: '#FFFBEB',
  },
  singleLineDisplayBox: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleLineDisplayText: {
    fontFamily: FONT_FAMILY,
    fontSize: 38,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 8,
    textAlign: 'center',
  },
  singleLineInputWrap: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  inputSlot: {
    width: 38,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  inputSlotFilled: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  inputSlotCorrect: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  inputSlotWrong: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  inputSlotText: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    fontWeight: '700',
    color: '#94A3B8',
  },
  inputSlotTextFilled: {
    color: '#0284C7',
    fontSize: 24,
    fontWeight: '800',
  },
  inputSlotTextCorrect: {
    color: '#15803D',
  },
  inputSlotTextWrong: {
    color: '#B45309',
  },
  keypadWrap: {
    width: '100%',
    maxWidth: 380,
    marginBottom: 8,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  key: {
    flex: 1,
    height: 66,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  keyDel: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyEmpty: {
    flex: 1,
    height: 66,
  },
  keyText: {
    fontFamily: FONT_FAMILY,
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    zIndex: 999,
  },
  modalCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  modalPrimaryBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#0284C7',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalOutBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#64748B',
  },
});
