import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import TopBar from '../components/TopBar';

const FONT_FAMILY = Platform.OS === 'web' 
  ? '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' 
  : 'Pretendard';

const ICON_CARD_MATCH  = require('../../assets/game_icon_card_match.png');
const ICON_NUMBER_MEM  = require('../../assets/game_icon_number_mem.png');
const ICON_QUICK_MATH  = require('../../assets/game_icon_quick_math.png');
const ICON_COLOR_MATCH = require('../../assets/game_icon_color_match.png');

const GAMES = [
  {
    key: 'CardMatchGame',
    title: '카드 짝맞추기',
    desc: '같은 그림 카드를 찾아 차근차근 짝을 맞추는 기억력 게임입니다.',
    iconAsset: ICON_CARD_MATCH,
    color: '#3E4C7D',
    bg: '#EEF2FF',
  },
  {
    key: 'NumberMemoryGame',
    title: '순서 기억하기',
    desc: '화면에 나타나는 숫자를 차례대로 기억해서 맞혀보세요.',
    iconAsset: ICON_NUMBER_MEM,
    color: '#0284C7',
    bg: '#E0F2FE',
  },
  {
    key: 'QuickMathGame',
    title: '쉬운 셈하기',
    desc: '간단하고 재미있는 숫자 더하기와 빼기를 풀어보세요.',
    iconAsset: ICON_QUICK_MATH,
    color: '#D97706',
    bg: '#FEF3C7',
  },
  {
    key: 'ColorRecognitionGame',
    title: '색상 맞추기',
    desc: '글자의 뜻 대신 글자의 알맞은 색상을 빠르게 맞춰보세요.',
    iconAsset: ICON_COLOR_MATCH,
    color: '#E11D48',
    bg: '#FFE4E6',
  },
];

export default function GameScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 앱 공통 상단 네비게이션 헤더 */}
      <TopBar title="두뇌 훈련 게임" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 화면 높이에 수직으로 꽉 차도록 확장되는 4종 카드 리스트 */}
        {GAMES.map((game) => (
          <TouchableOpacity
            key={game.key}
            style={styles.gameCard}
            onPress={() => navigation.navigate(game.key)}
            activeOpacity={0.85}
          >
            {/* 좌측 게임 대표 3D 맞춤 이모지 아이콘 */}
            <View style={[styles.gameIconWrap, { backgroundColor: game.bg }]}>
              <Image
                source={game.iconAsset}
                style={{ width: 50, height: 50 }}
                resizeMode="contain"
              />
            </View>

            {/* 중앙 게임 이름 & 짤림 없는 전체 설명 */}
            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle} numberOfLines={1}>{game.title}</Text>
              <Text style={styles.gameDesc}>{game.desc}</Text>
            </View>

            {/* 우측 게임 시작 버튼 */}
            <View style={[styles.startBtnPill, { backgroundColor: game.bg }]}>
              <Text style={[styles.startBtnText, { color: game.color }]}>시작</Text>
              <Ionicons name="chevron-forward" size={14} color={game.color} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F8FB' },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'space-between',
    gap: 14,
  },

  gameCard: {
    flex: 1,
    minHeight: 110,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#3E4C7D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8,
    elevation: 1,
  },

  gameIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameInfo: {
    flex: 1,
    paddingRight: 2,
  },
  gameTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    fontWeight: '800',
    color: '#191F28',
    marginBottom: 4,
  },
  gameDesc: {
    fontFamily: FONT_FAMILY,
    fontSize: 13.5,
    color: '#475569',
    lineHeight: 19,
    fontWeight: '500',
    flexWrap: 'wrap',
  },

  startBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  startBtnText: {
    fontFamily: FONT_FAMILY,
    fontSize: 14,
    fontWeight: '800',
  },
});
