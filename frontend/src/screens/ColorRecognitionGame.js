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

const COLOR_MAP = [
  { name: '빨강', hex: '#EF4444' },
  { name: '파랑', hex: '#3B82F6' },
  { name: '초록', hex: '#16A34A' },
  { name: '노랑', hex: '#EAB308' },
  { name: '보라', hex: '#9333EA' },
  { name: '주황', hex: '#EA580C' },
];

const TOTAL_QUESTIONS = 10;

function makeRound() {
  const wordIdx = Math.floor(Math.random() * COLOR_MAP.length);
  let colorIdx = Math.floor(Math.random() * COLOR_MAP.length);
  // 난이도 조절: 가끔은 글자 뜻과 잉크 색상을 다르게 구성
  if (Math.random() < 0.25) colorIdx = wordIdx;

  const answer = COLOR_MAP[colorIdx]; // 잉크 색상이 정답
  const choices = [answer];

  while (choices.length < 4) {
    const c = COLOR_MAP[Math.floor(Math.random() * COLOR_MAP.length)];
    if (!choices.find((x) => x.name === c.name)) choices.push(c);
  }

  return {
    word: COLOR_MAP[wordIdx].name,
    inkHex: answer.hex,
    answer: answer.name,
    choices: choices.sort(() => Math.random() - 0.5),
  };
}

export default function ColorRecognitionGame({ navigation }) {
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(() => makeRound());
  const [feedbackState, setFeedbackState] = useState('none'); // 'none' | 'correct' | 'wrong'
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);

  const starFlyAnim = useRef(new Animated.Value(0)).current;

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

  const handleChoice = (c) => {
    if (feedbackState !== 'none') return;
    setSelectedChoice(c.name);

    const isCorrect = c.name === round.answer;
    if (isCorrect) {
      setFeedbackState('correct');
      setScore((prev) => prev + 10);
    } else {
      setFeedbackState('wrong');
    }

    setTimeout(() => {
      if (qIdx < TOTAL_QUESTIONS - 1) {
        const nextIdx = qIdx + 1;
        setQIdx(nextIdx);
        setRound(makeRound());
        setFeedbackState('none');
        setSelectedChoice(null);
      } else {
        setGameFinished(true);
      }
    }, 600);
  };

  const resetGame = () => {
    setGameFinished(false);
    setScore(0);
    setQIdx(0);
    setRound(makeRound());
    setFeedbackState('none');
    setSelectedChoice(null);
  };

  const renderChoiceCard = (c) => {
    const isSelected = selectedChoice === c.name;
    const isAnswer = c.name === round.answer;

    let cardStyle = styles.choiceCard;
    let textStyle = styles.choiceText;

    if (feedbackState !== 'none') {
      if (isAnswer) {
        cardStyle = [styles.choiceCard, styles.choiceCardCorrect];
        textStyle = [styles.choiceText, styles.choiceTextCorrect];
      } else if (isSelected && !isAnswer) {
        cardStyle = [styles.choiceCard, styles.choiceCardWrong];
        textStyle = [styles.choiceText, styles.choiceTextWrong];
      }
    }

    return (
      <TouchableOpacity
        key={c.name}
        style={cardStyle}
        onPress={() => handleChoice(c)}
        activeOpacity={0.75}
        disabled={feedbackState !== 'none'}
      >
        <View style={[styles.colorDot, { backgroundColor: c.hex }]} />
        <Text style={textStyle}>{c.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FB" />

      {/* 상단 톡톡톡 네비게이션 헤더 */}
      <TopBar title="색상 맞추기" onBack={() => setPauseModalVisible(true)} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 상단 정보 행 (우측 정렬) */}
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

        {/* 상자 틀 없이 자유롭고 깔끔한 가이드 문구 */}
        <View style={styles.guideTextWrap}>
          <Text
            style={[
              styles.guideText,
              feedbackState === 'correct' && styles.guideTextCorrect,
              feedbackState === 'wrong' && styles.guideTextWrong,
            ]}
          >
            {feedbackState === 'correct'
              ? '정답입니다! 참 잘하셨어요!'
              : feedbackState === 'wrong'
              ? '괜찮아요! 다음 문제로 넘어갈게요.'
              : '글자의 글자색(잉크 색상)을 맞춰보세요!'}
          </Text>
        </View>

        {/* 상자 틀 없이 시원하게 나타나는 대형 스트룹 색상 타이포그래피 */}
        <View style={styles.wordDisplayArea}>
          <Text
            style={[
              styles.wordText,
              { color: round.inkHex },
              feedbackState === 'correct' && styles.wordTextCorrect,
              feedbackState === 'wrong' && styles.wordTextWrong,
            ]}
            numberOfLines={1}
          >
            {round.word}
          </Text>
        </View>

        {/* 2x2 그리드 선택지 카드 영역 */}
        <View style={styles.choicesGrid}>
          <View style={styles.choiceRow}>
            {round.choices.slice(0, 2).map((c) => renderChoiceCard(c))}
          </View>
          <View style={styles.choiceRow}>
            {round.choices.slice(2, 4).map((c) => renderChoiceCard(c))}
          </View>
        </View>
      </ScrollView>

      {/* 최종 완주 모달 */}
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

            <Text style={styles.modalTitle}>완주 성공!</Text>
            <Text style={styles.modalSub}>차근차근 정말 잘 풀어내셨습니다!</Text>

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={resetGame} activeOpacity={0.85}>
              <Text style={styles.modalPrimaryBtnText}>1번 문제부터 다시 하기</Text>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: 'center',
  },
  statsRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    gap: 12,
    marginBottom: 8,
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
  guideTextWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  guideText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  guideTextCorrect: {
    color: '#15803D',
  },
  guideTextWrong: {
    color: '#B45309',
  },
  wordDisplayArea: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    marginVertical: 12,
  },
  wordText: {
    fontFamily: FONT_FAMILY,
    fontSize: 56,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 3,
  },
  wordTextCorrect: {
    color: '#15803D',
  },
  wordTextWrong: {
    color: '#B45309',
  },
  choicesGrid: {
    width: '100%',
    maxWidth: 380,
    gap: 14,
  },
  choiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  choiceCard: {
    flex: 1,
    height: 74,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  choiceCardCorrect: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  choiceCardWrong: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  choiceText: {
    fontFamily: FONT_FAMILY,
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
  },
  choiceTextCorrect: {
    color: '#15803D',
  },
  choiceTextWrong: {
    color: '#B45309',
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
    backgroundColor: '#9333EA',
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
