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
const QUOKKA_3D_CLAPPING = require('../../assets/quokka_3d_clapping.png');

let globalSavedCardGameLevel = null;

const ALL_EMOJIS = ['🍎', '🐶', '⭐', '🌸', '🎵', '🚗', '🏠', '🎁', '🍇', '🐱', '⚽', '🌙', '🦋', '🍉', '🎈'];

const LEVEL_CONFIGS = [
  {
    level: 1,
    gridCols: 2,
    pairs: 2, // 4장
    clearTitle: '1단계 성공!',
    clearSub: '참 잘하셨어요!',
  },
  {
    level: 2,
    gridCols: 3,
    pairs: 3, // 6장
    clearTitle: '2단계 성공!',
    clearSub: '기억력이 참 좋으시네요!',
  },
  {
    level: 3,
    gridCols: 4,
    pairs: 4, // 8장
    clearTitle: '3단계 성공!',
    clearSub: '집중력이 정말 대단해요!',
  },
  {
    level: 4,
    gridCols: 4,
    pairs: 6, // 12장
    clearTitle: '4단계 성공!',
    clearSub: '차근차근 정말 잘하시네요!',
  },
  {
    level: 5,
    gridCols: 4,
    pairs: 8, // 16장
    clearTitle: '5단계 성공!',
    clearSub: '끝까지 모두 맞추셨어요!',
  },
];

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

function makeLevelCards(config, initialFlipped = true) {
  const selectedEmojis = ALL_EMOJIS.slice(0, config.pairs);
  const paired = shuffle([...selectedEmojis, ...selectedEmojis]);
  return paired.map((emoji, index) => ({
    id: `${config.level}-${index}-${emoji}-${Math.random()}`,
    emoji,
    flipped: initialFlipped,
    matched: false,
  }));
}

export default function CardMatchGame({ navigation }) {
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [cards, setCards] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(true);
  const [previewCountdown, setPreviewCountdown] = useState(4);
  const [attempts, setAttempts] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [levelCleared, setLevelCleared] = useState(false);
  const [gameMasterFinished, setGameMasterFinished] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);

  const mascotBounceAnim = useRef(new Animated.Value(1)).current;
  const starFlyAnim = useRef(new Animated.Value(0)).current;
  const previewTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const currentConfig = LEVEL_CONFIGS[currentLevelIdx];

  useEffect(() => {
    if (gameMasterFinished) {
      starFlyAnim.setValue(0);
      // 똑똑이가 축하의 별을 보라빛/황금빛으로 퍼뜨리며 날려보내는 루프 애니메이션
      const flyAnimation = Animated.loop(
        Animated.timing(starFlyAnim, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        })
      );
      flyAnimation.start();
      return () => flyAnimation.stop();
    }
  }, [gameMasterFinished]);

  // 별 1 (좌측 위로 날아오름)
  const star1Y = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [20, -55] });
  const star1X = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [-5, -42] });
  const star1Scale = starFlyAnim.interpolate({ inputRange: [0, 0.35, 0.75, 1], outputRange: [0.2, 1.3, 1, 0] });
  const star1Opacity = starFlyAnim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });

  // 별 2 (우측 위로 날아오름)
  const star2Y = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [25, -60] });
  const star2X = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [5, 45] });
  const star2Scale = starFlyAnim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0.1, 1.4, 0.9, 0] });
  const star2Opacity = starFlyAnim.interpolate({ inputRange: [0, 0.25, 0.85, 1], outputRange: [0, 1, 1, 0] });

  // 별 3 (중앙 높이 반짝이며 솟아오름)
  const star3Y = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [30, -70] });
  const star3X = starFlyAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0] });
  const star3Scale = starFlyAnim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [0.2, 1.5, 1.1, 0] });
  const star3Opacity = starFlyAnim.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });

  useEffect(() => {
    if (globalSavedCardGameLevel !== null && globalSavedCardGameLevel > 0 && globalSavedCardGameLevel < LEVEL_CONFIGS.length) {
      setShowResumePrompt(true);
    } else {
      startLevel(0);
    }

    return () => {
      clearTimers();
    };
  }, []);

  const clearTimers = () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  };

  const triggerMascotBounce = () => {
    Animated.sequence([
      Animated.timing(mascotBounceAnim, { toValue: 1.15, duration: 180, useNativeDriver: true }),
      Animated.timing(mascotBounceAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  };

  const startLevel = (levelIdx) => {
    clearTimers();
    setCurrentLevelIdx(levelIdx);
    const config = LEVEL_CONFIGS[levelIdx];
    
    // 시작 시 4초간 카드를 모두 펼쳐 보여줌
    setCards(makeLevelCards(config, true));
    setSelectedIndices([]);
    setIsProcessing(false);
    setIsPreviewing(true);
    setPreviewCountdown(4);
    setAttempts(0);
    setMatchedPairs(0);
    setLevelCleared(false);
    setGameMasterFinished(false);

    // 1초마다 카운트다운
    countdownIntervalRef.current = setInterval(() => {
      setPreviewCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 4초 후 카드를 뒤집고 게임 시작
    previewTimerRef.current = setTimeout(() => {
      setCards((prevCards) => prevCards.map((c) => ({ ...c, flipped: false })));
      setIsPreviewing(false);
    }, 4000);
  };

  const handleConfirmResume = () => {
    setShowResumePrompt(false);
    startLevel(globalSavedCardGameLevel);
  };

  const handleDeclineResume = () => {
    setShowResumePrompt(false);
    globalSavedCardGameLevel = null;
    startLevel(0);
  };

  const handleSaveAndExit = () => {
    clearTimers();
    globalSavedCardGameLevel = currentLevelIdx;
    setPauseModalVisible(false);
    navigation.goBack();
  };

  const flipCard = (index) => {
    if (isPreviewing || isProcessing || levelCleared) return;
    if (cards[index].flipped || cards[index].matched) return;
    if (selectedIndices.includes(index)) return;

    const newCards = [...cards];
    newCards[index].flipped = true;
    setCards(newCards);

    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);

    if (newSelected.length === 2) {
      setIsProcessing(true);
      setAttempts((prev) => prev + 1);

      const [firstIdx, secondIdx] = newSelected;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      if (firstCard.emoji === secondCard.emoji) {
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIdx].matched = true;
          matchedCards[secondIdx].matched = true;
          setCards(matchedCards);
          setSelectedIndices([]);
          setIsProcessing(false);

          const newMatchedCount = matchedPairs + 1;
          setMatchedPairs(newMatchedCount);

          if (newMatchedCount >= currentConfig.pairs) {
            triggerMascotBounce();
            setTimeout(() => {
              if (currentLevelIdx === LEVEL_CONFIGS.length - 1) {
                setGameMasterFinished(true);
                globalSavedCardGameLevel = null;
              } else {
                setLevelCleared(true);
              }
            }, 300);
          }
        }, 350);
      } else {
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIdx].flipped = false;
          resetCards[secondIdx].flipped = false;
          setCards(resetCards);
          setSelectedIndices([]);
          setIsProcessing(false);
        }, 850);
      }
    }
  };

  const handleNextLevel = () => {
    if (currentLevelIdx < LEVEL_CONFIGS.length - 1) {
      const nextIdx = currentLevelIdx + 1;
      globalSavedCardGameLevel = nextIdx;
      startLevel(nextIdx);
    }
  };

  const getCardSize = () => {
    if (currentConfig.gridCols === 2) return { width: 125, height: 125, fontSize: 50, margin: 10 };
    if (currentConfig.gridCols === 3) return { width: 95, height: 95, fontSize: 40, margin: 8 };
    return { width: 72, height: 72, fontSize: 30, margin: 6 };
  };

  const cardStyleSpec = getCardSize();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8FB" />

      <TopBar title="카드 짝맞추기" onBack={() => setPauseModalVisible(true)} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* 상단 단계 및 시도 횟수 정보 */}
        <View style={styles.headerInfoCard}>
          <View style={styles.badgeRow}>
            {/* 단계를 'X단계' 로 깔끔하게 표시 */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{`${currentConfig.level}단계`}</Text>
            </View>
            <View style={styles.statsRightGroup}>
              {/* 시도 횟수 표시 복원 */}
              <Text style={styles.statChipText}>{`시도 ${attempts}회`}</Text>
              <Text style={styles.statDivider}>|</Text>
              <Text style={styles.statChipText}>{`맞춘 짝 ${matchedPairs}/${currentConfig.pairs}`}</Text>
              <TouchableOpacity
                style={styles.pauseBtn}
                onPress={() => setPauseModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="pause" size={14} color="#556080" />
                <Text style={styles.pauseBtnText}>잠시 쉴래요</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 가이드 문구 간결화 & 4초 미리보기 안내 */}
          <View style={styles.guideBox}>
            <View style={styles.guideTextGroup}>
              {isPreviewing ? (
                <>
                  <Text style={styles.guideMainText}>{`그림 위치를 잘 기억하세요! (${previewCountdown}초)`}</Text>
                  <Text style={styles.guideSubText}>4초 후에 카드가 뒤집혀요.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.guideMainText}>같은 그림의 카드를 맞춰보세요!</Text>
                  <Text style={styles.guideSubText}>천천히 편안하게 맞추시면 돼요.</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* 카드 그리드 판 */}
        <View style={styles.boardWrap}>
          <View style={[styles.grid, { width: currentConfig.gridCols * (cardStyleSpec.width + cardStyleSpec.margin * 2) }]}>
            {cards.map((card, idx) => {
              const isOpen = card.flipped || card.matched;
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[
                    styles.card,
                    { width: cardStyleSpec.width, height: cardStyleSpec.height, margin: cardStyleSpec.margin },
                    isOpen && styles.cardFlipped,
                    card.matched && styles.cardMatched,
                  ]}
                  onPress={() => flipCard(idx)}
                  activeOpacity={0.8}
                  disabled={isPreviewing}
                >
                  <Text style={[styles.cardText, { fontSize: cardStyleSpec.fontSize }]}>
                    {isOpen ? card.emoji : '❓'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 하단 다시 섞기 버튼 */}
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => startLevel(currentLevelIdx)}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={18} color="#3E4C7D" />
          <Text style={styles.retryBtnText}>이 단계 다시 섞기</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 단계 클리어 모달 */}
      {levelCleared && !gameMasterFinished && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Animated.View style={{ transform: [{ scale: mascotBounceAnim }] }}>
              <Image source={QUOKKA_3D_NUKKI} style={{ width: 100, height: 100, marginBottom: 6 }} resizeMode="contain" />
            </Animated.View>
            <Text style={styles.modalTitle}>{currentConfig.clearTitle}</Text>
            <Text style={styles.modalSub}>{currentConfig.clearSub}</Text>
            
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleNextLevel} activeOpacity={0.85}>
              <Text style={styles.modalPrimaryBtnText}>{`다음 ${currentLevelIdx + 2}단계 도전`}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOutBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.modalOutBtnText}>게임 목록으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5단계 완주 모달 */}
      {gameMasterFinished && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: 12, position: 'relative', width: 150, height: 135 }}>
              {/* 똑똑이 캐릭터는 편안하게 가만히 유지 */}
              <Image source={QUOKKA_3D_NUKKI} style={{ width: 120, height: 120 }} resizeMode="contain" />

              {/* 똑똑이가 날려보내는 반짝이는 별 1 */}
              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [
                    { translateY: star1Y },
                    { translateX: star1X },
                    { scale: star1Scale },
                  ],
                  opacity: star1Opacity,
                }}
              >
                <Text style={{ fontSize: 30 }}>⭐</Text>
              </Animated.View>

              {/* 똑똑이가 날려보내는 반짝이는 별 2 */}
              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [
                    { translateY: star2Y },
                    { translateX: star2X },
                    { scale: star2Scale },
                  ],
                  opacity: star2Opacity,
                }}
              >
                <Text style={{ fontSize: 32 }}>✨</Text>
              </Animated.View>

              {/* 똑똑이가 날려보내는 반짝이는 별 3 */}
              <Animated.View
                style={{
                  position: 'absolute',
                  transform: [
                    { translateY: star3Y },
                    { translateX: star3X },
                    { scale: star3Scale },
                  ],
                  opacity: star3Opacity,
                }}
              >
                <Text style={{ fontSize: 36 }}>⭐</Text>
              </Animated.View>
            </View>

            <Text style={styles.modalTitle}>마지막 단계까지 성공하셨어요!</Text>
            <Text style={styles.modalSub}>끝까지 멋지게 맞춰내신 어르신께 축하의 별을 전합니다!</Text>

            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => startLevel(0)} activeOpacity={0.85}>
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
              style={styles.modalSecondaryBtn}
              onPress={handleSaveAndExit}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSecondaryBtnText}>{`잠시 쉬고 나중에 하기 (${currentConfig.level}단계 보관)`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 이어서 하기 모달 */}
      {showResumePrompt && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Image source={QUOKKA_3D_NUKKI} style={{ width: 90, height: 90, marginBottom: 4 }} resizeMode="contain" />
            <Text style={styles.modalTitle}>이어서 하실까요?</Text>
            <Text style={styles.modalSub}>{`이전에 맞추시던 ${globalSavedCardGameLevel + 1}단계 기록이 남아있어요.`}</Text>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={handleConfirmResume}
              activeOpacity={0.85}
            >
              <Text style={styles.modalPrimaryBtnText}>{`${globalSavedCardGameLevel + 1}단계 이어서 하기`}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOutBtn}
              onPress={handleDeclineResume}
              activeOpacity={0.85}
            >
              <Text style={styles.modalOutBtnText}>1단계부터 새로 시작하기</Text>
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
    paddingHorizontal: 16,
    paddingBottom: 28,
    alignItems: 'center',
  },
  headerInfoCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelBadgeText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '800',
    color: '#4F46E5',
  },
  statsRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statChipText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  statDivider: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 4,
  },
  pauseBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  guideBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
  },
  guideTextGroup: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideMainText: {
    fontFamily: FONT_FAMILY,
    fontSize: 15.5,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 22,
    textAlign: 'center',
  },
  guideSubText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13.5,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  boardWrap: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardFlipped: {
    backgroundColor: '#FFFFFF',
    borderColor: '#6366F1',
  },
  cardMatched: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  cardText: {
    fontFamily: FONT_FAMILY,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 16,
    fontWeight: '700',
    color: '#4F46E5',
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
    backgroundColor: '#4F46E5',
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
  modalSecondaryBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modalSecondaryBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14.5,
    fontWeight: '700',
    color: '#475569',
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
