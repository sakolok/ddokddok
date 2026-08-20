import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Image, Modal,
  Linking, Platform, TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../services/UserContext';
import { getRealChatLogs, subscribeChatLogs } from '../services/chatService';

const FONT_FAMILY = Platform.OS === 'web' 
  ? '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' 
  : 'Pretendard';

// 핵심 3D PNG 아이콘 에셋
const CHECKLIST_ICON   = require('../../assets/self_assessment_icon.png');
const CARDS_ICON       = require('../../assets/brain_game_icon.png');
const STUDIO_MIC_ICON  = require('../../assets/studio_mic_icon.png');

const ICON_CARD_MATCH  = require('../../assets/game_icon_card_match.png');
const ICON_COLOR_MATCH = require('../../assets/game_icon_color_match.png');
const ICON_NUMBER_MEM  = require('../../assets/game_icon_number_mem.png');
const ICON_QUICK_MATH  = require('../../assets/game_icon_quick_math.png');

// ── 데이터 선언 ──────────────────────────────────────────
const ALERTS = [
  { id: 1, icon: 'heart',               color: '#ef4444', bg: '#fff1f2', title: '건강 체크 알림',    desc: '오늘 인지 건강 체크를 아직 하지 않으셨어요.',   time: '방금 전',  unread: true  },
  { id: 2, icon: 'chatbubble-ellipses', color: '#0d9488', bg: '#e6f4f1', title: '똑톡이와 대화',     desc: '어제 나눴던 산책 이야기 이어서 해볼까요?',     time: '1시간 전', unread: true  },
];

// KDSQ 15개 문항 및 어르신 검사 답변 데이터
const KDSQ_QUESTIONS_DATA = [
  { id: 1,  q: '오늘이 몇 월이고, 무슨 요일인지를 잘 모른다.',           answer: '아니다', score: 0, level: 'normal'  },
  { id: 2,  q: '자기가 놔둔 물건을 찾지 못한다.',                        answer: '가끔',   score: 1, level: 'caution' },
  { id: 3,  q: '같은 질문을 반복해서 한다.',                           answer: '아니다', score: 0, level: 'normal'  },
  { id: 4,  q: '약속을 하고서 잊어버린다.',                            answer: '아니다', score: 0, level: 'normal'  },
  { id: 5,  q: '물건을 가지러 갔다가 잊어버리고 그냥 온다.',               answer: '가끔',   score: 1, level: 'caution' },
  { id: 6,  q: '물건이나, 사람의 이름을 대기가 힘들어 머뭇거린다.',         answer: '가끔',   score: 1, level: 'caution' },
  { id: 7,  q: '대화 중 내용이 이해되지 않아 반복해서 물어본다.',         answer: '아니다', score: 0, level: 'normal'  },
  { id: 8,  q: '길을 잃거나 헤맨 적이 있다.',                           answer: '아니다', score: 0, level: 'normal'  },
  { id: 9,  q: '예전에 비해서 계산 능력이 떨어졌다.',                   answer: '아니다', score: 0, level: 'normal'  },
  { id: 10, q: '예전에 비해 성격이 변했다.',                           answer: '아니다', score: 0, level: 'normal'  },
  { id: 11, q: '이전에 잘 다루던 기구의 사용이 서툴러졌다.',             answer: '아니다', score: 0, level: 'normal'  },
  { id: 12, q: '예전에 비해 방이나 집안 정리정돈을 하지 못한다.',         answer: '아니다', score: 0, level: 'normal'  },
  { id: 13, q: '상황에 맞게 스스로 옷을 선택하여 입지 못한다.',           answer: '아니다', score: 0, level: 'normal'  },
  { id: 14, q: '혼자 대중교통으로 목적지에 가기 어렵다.',                 answer: '아니다', score: 0, level: 'normal'  },
  { id: 15, q: '내복이나 옷이 더러워져도 갈아입지 않으려 한다.',           answer: '아니다', score: 0, level: 'normal'  },
];

// 두뇌 게임 기록 세부 데이터 (4종 PNG 아이콘 에셋 매핑)
const GAME_HISTORY_DATA = [
  { id: 'cards',  name: '카드 짝 맞추기', iconAsset: ICON_CARD_MATCH,  score: '88점', grade: 'S등급',  time: '24초 완성', color: '#0D9488', bg: '#E6F4F1', desc: '시각 단기 기억력 우수', category: '기억력' },
  { id: 'colors', name: '색상 맞추기',    iconAsset: ICON_COLOR_MATCH, score: '95점', grade: 'A+등급', time: '정확도 100%', color: '#0284C7', bg: '#E0F2FE', desc: '집중 제어력 상위 5%', category: '집중력' },
  { id: 'numbers',name: '숫자 기억하기',  iconAsset: ICON_NUMBER_MEM,  score: '7단계',grade: '우수',   time: '순서 기억 유지', color: '#7C3AED', bg: '#F3E8FF', desc: '작업 기억 유지 양호', category: '작업기억' },
  { id: 'math',   name: '신속 연산 게임', iconAsset: ICON_QUICK_MATH,  score: '90점', grade: '우수',   time: '반응 1.2초', color: '#D97706', bg: '#FEF3C7', desc: '수리 순발력 상위권', category: '순발력' },
];

// ── 알림 탭 ──────────────────────────────────────────────
function AlertTab({ onBack }) {
  const [alerts] = useState(ALERTS);
  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <View style={S.alertHeader}>
        <TouchableOpacity style={S.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={S.alertTitle}>알림 센터</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        {alerts.map(item => (
          <View key={item.id} style={[S.cardBase, S.alertItem]}>
            <View style={[S.rowIconBase, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.alertItemTitle}>{item.title}</Text>
              <Text style={S.alertDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ── 대화 기록 탭 ───────────────────────────────────────
function ChatHistoryTab({ onBack, navigation }) {
  const [logs, setLogs] = useState(getRealChatLogs);

  useEffect(() => {
    setLogs(getRealChatLogs());
    const unsubscribe = subscribeChatLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#E2E7F0' }}>
        <TouchableOpacity style={S.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#191F28" />
        </TouchableOpacity>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#191F28' }}>대화 기록</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {logs.length === 0 ? (
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            paddingVertical: 48,
            paddingHorizontal: 24,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: '#E2E7F0',
            marginTop: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.03,
            shadowRadius: 8,
            elevation: 1
          }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Ionicons name="chatbubbles-outline" size={32} color="#94A3B8" />
            </View>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#475569', textAlign: 'center' }}>
              아직 나눈 대화가 없어요
            </Text>
          </View>
        ) : (
          logs.map(log => (
            <TouchableOpacity
              key={log.id}
              style={{ backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 14, borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}
              onPress={() => navigation.navigate('AI')}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#8C857B', fontWeight: '600' }}>{log.date}</Text>
                <View style={{ backgroundColor: log.moodBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '700', color: log.moodColor }}>{log.mood}</Text>
                </View>
              </View>

              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#191F28', marginBottom: 8 }}>{log.title}</Text>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 12 }}>{log.summary}</Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 }}>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#3E4C7D', fontWeight: '700' }}>#{log.topic}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#3E4C7D', fontWeight: '700' }}>대화 이어서 하기</Text>
                  <Ionicons name="chevron-forward" size={16} color="#3E4C7D" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ── 헬스조선 보도 기사 전체 풀 ──
const HEALTH_NEWS_ARTICLES_POOL = [
  {
    id: 1,
    icon: 'pulse-outline',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    publisher: '헬스조선',
    title: '깜빡하는 건 흔한 일… ‘치매’ 심각하게 의심해야 할 상황은?',
    subtitle: '건망증과 치매의 결정적 차이 및 초기 증상 자가 체크법',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/10/2026081002264.html'
  },
  {
    id: 2,
    icon: 'fitness-outline',
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
    publisher: '헬스조선',
    title: '“많이 걷는다고 해결 안 돼” 혈압 잡는 운동법 따로 있다',
    subtitle: '혈관 건강과 두뇌 활성화를 돕는 올바른 산책 및 유산소 운동 수칙',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/10/2026081002509.html'
  },
  {
    id: 3,
    icon: 'moon-outline',
    iconBg: '#E0F2FE',
    iconColor: '#0369A1',
    publisher: '헬스조선',
    title: '“수명 짧아진다”… 의사들 경고하는 ‘수면 습관’은?',
    subtitle: '불면증 극복과 뇌 피로 회복을 돕는 건강한 수면 지침',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/10/2026081002133.html'
  },
];

// ── 시니어 전용 홈 탭 (Senior Home Tab) ────────────────
function SeniorHomeTab({ navigation }) {
  const { currentUser } = useUser();
  const userName = currentUser?.name || '어르신';
  const [newsArticles] = useState(HEALTH_NEWS_ARTICLES_POOL);

  const handleOpenNewsArticle = (article) => {
    if (article && article.url) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(article.url, '_blank');
      } else {
        Linking.openURL(article.url).catch((err) => console.log('Error opening news URL:', err));
      }
    }
  };

  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayName = dayNames[now.getDay()];
  const dynamicDateStr = `${month}월 ${date}일 ${dayName}`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F8FB' }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
      
      {/* ── 상단 인사말 및 날짜 ── */}
      <View style={{ marginBottom: 22 }}>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 25, fontWeight: '800', color: '#191F28', letterSpacing: -0.5, marginBottom: 4 }}>
          {`${userName}님, 반가워요`}
        </Text>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#8C857B', fontWeight: '600', marginBottom: 8 }}>
          {dynamicDateStr}
        </Text>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, color: '#4A453E', fontWeight: '600', lineHeight: 23 }}>
          오늘 있었던 일, 똑톡이한테 편하게 얘기해보세요.
        </Text>
      </View>

      {/* ── 중앙 마이크 카드 ── */}
      <View style={{ 
        backgroundColor: '#ffffff', 
        borderRadius: 28, 
        paddingVertical: 32, 
        paddingHorizontal: 20, 
        alignItems: 'center', 
        marginBottom: 26, 
        borderWidth: 1, 
        borderColor: '#E2E7F0',
        shadowColor: '#3E4C7D', 
        shadowOffset: { width: 0, height: 8 }, 
        shadowOpacity: 0.06, 
        shadowRadius: 18, 
        elevation: 3 
      }}>
        <View style={{ width: 128, height: 128, borderRadius: 64, backgroundColor: '#EBF0F7', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: '#3E4C7D',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#3E4C7D',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 14,
              elevation: 6
            }}
            onPress={() => navigation.navigate('AI', { autoListen: true })}
            activeOpacity={0.85}
          >
            <Image source={STUDIO_MIC_ICON} style={{ width: 62, height: 72 }} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 22, fontWeight: '800', color: '#191F28', textAlign: 'center', marginBottom: 6 }}>
          눌러서 말하기
        </Text>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#8C857B', fontWeight: '500' }}>
          귀여운 똑톡이와 대화해 보세요
        </Text>
      </View>

      {/* ── 퀵 2버튼: 건강 체크 & 두뇌 게임 ── */}
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 28 }}>
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}
          onPress={() => navigation.navigate('Health')}
          activeOpacity={0.85}
        >
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 }}>
            <Image source={CHECKLIST_ICON} style={{ width: 52, height: 52 }} resizeMode="contain" />
          </View>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#191F28', textAlign: 'center', marginBottom: 4 }}>두뇌 건강 체크</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#8C857B', fontWeight: '500', textAlign: 'center' }}>간단한 자가 진단하기</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}
          onPress={() => navigation.navigate('Game')}
          activeOpacity={0.85}
        >
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 }}>
            <Image source={CARDS_ICON} style={{ width: 52, height: 52 }} resizeMode="contain" />
          </View>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#191F28', textAlign: 'center', marginBottom: 4 }}>두뇌 훈련 게임</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#8C857B', fontWeight: '500', textAlign: 'center' }}>즐겁게 기억력 키우기</Text>
        </TouchableOpacity>
      </View>

      {/* ── 건강 뉴스 ── */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#191F28' }}>
          오늘의 건강 뉴스
        </Text>
      </View>

      <View style={{ backgroundColor: '#ffffff', borderRadius: 22, paddingHorizontal: 18, paddingVertical: 6, borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
        {newsArticles.map((article, idx) => (
          <TouchableOpacity 
            key={article.id}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: idx < newsArticles.length - 1 ? 1 : 0, borderBottomColor: '#F2EFE8' }}
            onPress={() => handleOpenNewsArticle(article)}
            activeOpacity={0.7}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: article.iconBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name={article.icon} size={22} color={article.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '800', color: '#191F28', marginBottom: 3 }} numberOfLines={1}>
                {article.title}
              </Text>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#8C857B', fontWeight: '500' }} numberOfLines={1}>
                {article.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C4BEB4" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ))}
      </View>

    </ScrollView>
  );
}

// ── 보호자 전용 대시보드 탭 (Guardian Home Tab - 요청하신 무의미 요소 완전 삭제) ──────────────────────
function GuardianHomeTab({ navigation, onOpenHealthDetail, onOpenTranscript, onOpenGameDetail }) {
  const { currentUser } = useUser();
  const userName = currentUser?.name || '어르신';
  const [playingId, setPlayingId] = useState(null);
  const [realLogs, setRealLogs] = useState(getRealChatLogs);

  useEffect(() => {
    setRealLogs(getRealChatLogs());
    const unsubscribe = subscribeChatLogs((updatedLogs) => {
      setRealLogs(updatedLogs);
    });
    return unsubscribe;
  }, []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
      
      {/* ── 1. KDSQ 인지 건강 검사 결과 카드 ── */}
      <TouchableOpacity 
        style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 }}
        onPress={onOpenHealthDetail}
        activeOpacity={0.88}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={{ width: 42, height: 40, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E7F0' }}>
              <Image source={CHECKLIST_ICON} style={{ width: 32, height: 32 }} resizeMode="contain" />
            </View>
            <Text numberOfLines={1} style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#0f172a', flex: 1 }}>
              KDSQ 인지 건강 검사
            </Text>
          </View>
        </View>

        {/* 점수 요약 */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginVertical: 8 }}>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 26, fontWeight: '900', color: '#0d9488' }}>3점</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, color: '#64748b', fontWeight: '700' }}>/ 15점 만점</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#94a3b8', marginLeft: 'auto' }}>2026.08.18 검사</Text>
        </View>

        {/* 프로그레스 게이지 */}
        <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginBottom: 14 }}>
          <View style={{ width: '20%', height: '100%', backgroundColor: '#0d9488', borderRadius: 4 }} />
        </View>

        {/* 클릭 유도 패널 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f0fdf4', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
          <Text numberOfLines={1} style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '800', color: '#166534', flexShrink: 1 }}>
            문항별 답변 세부사항 확인하기
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#166534" />
        </View>
      </TouchableOpacity>

      {/* ── 2. 두뇌 훈련 게임 시계열 차트 카드 ── */}
      <TouchableOpacity 
        style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 }}
        onPress={onOpenGameDetail}
        activeOpacity={0.88}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={{ width: 42, height: 40, borderRadius: 12, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E7F0' }}>
              <Image source={CARDS_ICON} style={{ width: 32, height: 32 }} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
                두뇌 훈련 점수 시계열 추이
              </Text>
              <Text numberOfLines={1} style={{ fontFamily: FONT_FAMILY, fontSize: 12, color: '#64748b', fontWeight: '500', marginTop: 2 }}>
                월~일 주간 점수 변화 기록
              </Text>
            </View>
          </View>
        </View>

        {/* 시계열 추이 바 차트 (한 줄 정렬 및 오버플로우 방지) */}
        <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, marginVertical: 6, borderWidth: 1, borderColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 125 }}>
            {[
              { day: '월', score: 85, fillHeight: '65%', isCompleted: true  },
              { day: '화', score: 90, fillHeight: '78%', isCompleted: true  },
              { day: '수', score: 95, fillHeight: '92%', isCompleted: true, isPeak: true },
              { day: '목', score: 88, fillHeight: '72%', isCompleted: true  },
              { day: '금', score: 92, fillHeight: '82%', isCompleted: true  },
              { day: '토', score: 70, fillHeight: '50%', isCompleted: true  },
              { day: '일', score: 0,  fillHeight: '12%', isCompleted: false },
            ].map((pt) => (
              <View key={pt.day} style={{ alignItems: 'center', flex: 1, paddingHorizontal: 1 }}>
                {/* 상단 점수 태그 */}
                {pt.isCompleted ? (
                  <View style={{ backgroundColor: pt.isPeak ? '#0284c7' : '#0d9488', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 5, marginBottom: 5 }}>
                    <Text style={{ fontFamily: FONT_FAMILY, fontSize: 10, fontWeight: '800', color: '#ffffff' }}>{pt.score}점</Text>
                  </View>
                ) : (
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 10, fontWeight: '800', color: '#cbd5e1', marginBottom: 5 }}>-</Text>
                )}

                {/* 차트 시계열 수직 트랙 */}
                <View style={{ width: 12, height: 60, backgroundColor: '#e2e8f0', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' }}>
                  <View style={{ width: '100%', height: pt.fillHeight, backgroundColor: pt.isPeak ? '#0284c7' : pt.isCompleted ? '#0d9488' : '#cbd5e1', borderRadius: 6 }} />
                </View>

                {/* 요일 서클 라벨 */}
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: pt.isPeak ? '#0284c7' : pt.isCompleted ? '#0d9488' : '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: '800', color: pt.isCompleted ? '#ffffff' : '#64748b' }}>{pt.day}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>

      {/* ── 3. 대화 기록 & 음성 다시듣기 ── */}
      <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 14, marginTop: 4 }}>
        대화 기록 & 음성
      </Text>

      {realLogs.length === 0 ? (
        <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#94a3b8" style={{ marginBottom: 10 }} />
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '800', color: '#475569', marginBottom: 4, textAlign: 'center' }}>
            아직 기록된 어르신의 대화가 없습니다.
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 }}>
            어르신께서 똑톡이와 음성 대화를 나누시면 이곳에 실시간 기록됩니다.
          </Text>
        </View>
      ) : (
        realLogs.map(log => (
          <View key={log.id} style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: '#64748b' }}>{log.date}</Text>
              <View style={{ backgroundColor: log.moodBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '800', color: log.moodColor }}>{log.mood}</Text>
              </View>
            </View>

            <Text numberOfLines={1} style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 6 }}>{log.title}</Text>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#334155', lineHeight: 22, fontWeight: '500', marginBottom: 14 }}>
              {log.summary}
            </Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#e6f4f1', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onPress={() => setPlayingId(playingId === log.id ? null : log.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={playingId === log.id ? 'pause-circle' : 'play-circle'} size={18} color="#0d9488" />
                <Text numberOfLines={1} style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '800', color: '#0d9488' }}>
                  {playingId === log.id ? '음성 재생 중' : '음성 다시듣기'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onPress={() => onOpenTranscript(log)}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={18} color="#475569" />
                <Text numberOfLines={1} style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '800', color: '#475569' }}>
                  대화 전문 보기
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ── 메인 대시보드 스크린 ────────────────────────────────────
export default function DashboardScreen({ navigation, route }) {
  const { currentUser } = useUser();
  const rawRole      = route.params?.role ?? currentUser?.role ?? 'user';
  const insets       = useSafeAreaInsets();
  
  // 2-in-1 모드 전환 및 모달 상태
  const [userMode, setUserRoleMode] = useState(rawRole === 'guardian' ? 'guardian' : 'senior');
  const [activeTab, setActiveTab]   = useState('home');

  // 모달 상태 4종
  const [isPinModalOpen, setIsPinModalOpen]         = useState(false);
  const [pinInput, setPinInput]                     = useState('');
  const [pinError, setPinError]                     = useState('');
  const [isHealthDetailOpen, setIsHealthDetailOpen]   = useState(false);
  const [isGameDetailOpen, setIsGameDetailOpen]     = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState(null);

  // 모드 전환 시 PIN 검증
  const handleToggleMode = () => {
    if (userMode === 'senior') {
      setPinInput('');
      setPinError('');
      setIsPinModalOpen(true);
    } else {
      setUserRoleMode('senior');
    }
  };

  const handleVerifyPin = () => {
    if (pinInput === '1234' || pinInput.length >= 4) {
      setIsPinModalOpen(false);
      setUserRoleMode('guardian');
      setPinInput('');
      setPinError('');
    } else {
      setPinError('비밀번호가 올바르지 않습니다. (기본: 1234)');
    }
  };

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 홈 탭 메인 상단 헤더 */}
      {activeTab === 'home' && (
        <View style={S.header}>
          <View style={S.headerLeft}>
            {/* 똑똑똑 브랜드 로고 */}
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 23, fontWeight: '900', letterSpacing: -0.5 }}>
              <Text style={{ color: userMode === 'senior' ? '#3E4C7D' : '#0D9488' }}>똑똑</Text>
              <Text style={{ color: '#F59E0B' }}>똑</Text>
            </Text>
          </View>

          <View style={S.headerRight}>
            <TouchableOpacity style={S.iconBtn} onPress={() => setActiveTab('alert')} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={24} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 모드별 홈 탭 분리 렌더링 */}
      {activeTab === 'home' ? (
        userMode === 'senior' ? (
          <SeniorHomeTab navigation={navigation} />
        ) : (
          <GuardianHomeTab 
            navigation={navigation} 
            onOpenHealthDetail={() => setIsHealthDetailOpen(true)}
            onOpenGameDetail={() => setIsGameDetailOpen(true)}
            onOpenTranscript={(log) => setSelectedTranscript(log)}
          />
        )
      ) : activeTab === 'history' ? (
        <ChatHistoryTab onBack={() => setActiveTab('home')} navigation={navigation} />
      ) : (
        <AlertTab onBack={() => setActiveTab('home')} />
      )}

      {/* 하단 탭바 (사용자 모드일 때만 표시, 보호자 모드에서는 하단 네비게이션 바 숨김) */}
      {userMode === 'senior' && (
        <View style={[S.tabBar, { paddingBottom: insets.bottom + 6 }]}>
          {[
            { key: 'home',    icon: 'home',         iconOff: 'home-outline',         label: '홈' },
            { key: 'ai',      icon: 'mic',          iconOff: 'mic-outline',          label: '음성대화', onPress: () => navigation.navigate('AI') },
            { key: 'health',  icon: 'pulse',        iconOff: 'pulse-outline',        label: '건강체크', onPress: () => navigation.navigate('Health') },
            { key: 'history', icon: 'chatbubbles',  iconOff: 'chatbubbles-outline',  label: '대화기록', onPress: () => setActiveTab('history') },
          ].map(({ key, icon, iconOff, label, onPress }) => {
            const active = activeTab === key;
            const activeColor = '#3E4C7D';
            return (
              <TouchableOpacity key={key} style={S.tabItem} onPress={onPress ?? (() => setActiveTab(key))} activeOpacity={0.7}>
                <View style={[S.tabIconWrap]}>
                  <Ionicons name={active ? icon : iconOff} size={22} color={active ? activeColor : '#A39D93'} />
                </View>
                <Text style={[S.tabLabel, active && S.tabLabelActive, { color: active ? activeColor : '#A39D93' }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── 1. 보호자 PIN 번호 입력 모달 ── */}
      <Modal visible={isPinModalOpen} animationType="fade" transparent={true}>
        <View style={S.modalOverlayCenter}>
          <View style={S.pinCard}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#e6f4f1', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Ionicons name="lock-closed" size={24} color="#0d9488" />
            </View>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 4 }}>
              보호자 PIN 번호 입력
            </Text>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#64748b', marginBottom: 16, textAlign: 'center' }}>
              안전한 케어 모드 진입을 위해 PIN 번호를 입력하세요.
            </Text>

            <TextInput
              style={S.pinInput}
              value={pinInput}
              onChangeText={setPinInput}
              keyboardType="number-pad"
              secureTextEntry={true}
              maxLength={6}
              placeholder="PIN 번호 4~6자리"
              placeholderTextColor="#94a3b8"
              autoFocus={true}
            />

            {pinError ? (
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, color: '#e11d48', marginTop: 6, fontWeight: '600' }}>
                {pinError}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#f1f5f9', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                onPress={() => setIsPinModalOpen(false)}
              >
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '700', color: '#475569' }}>취소</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ flex: 1, backgroundColor: '#0d9488', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                onPress={handleVerifyPin}
              >
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '800', color: '#ffffff' }}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 2. KDSQ 인지 검사 문항별 상세 답변 모달 ── */}
      <Modal visible={isHealthDetailOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={CHECKLIST_ICON} style={{ width: 28, height: 28 }} resizeMode="contain" />
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#0f172a' }}>KDSQ 문항별 세부 답변</Text>
            </View>
            <TouchableOpacity onPress={() => setIsHealthDetailOpen(false)} style={S.iconBtn}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {/* 총점 요약 배너 */}
            <View style={{ backgroundColor: '#0d9488', borderRadius: 20, padding: 20, marginBottom: 20 }}>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#ccfbf1', fontWeight: '700', marginBottom: 4 }}>
                최근 인지건강 검사결과 (2026.08.18)
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: '900', color: '#ffffff' }}>3점</Text>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, color: '#e6f4f1', fontWeight: '700' }}>/ 15점 만점 (정상/양호)</Text>
              </View>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#f0fdf4', marginTop: 8, lineHeight: 18 }}>
                * KDSQ 진단 기준: 7점 이하(정상), 8~14점(주의 요망), 15점 이상(전문의 상담 권유)
              </Text>
            </View>

            {/* 15개 전체 질문 및 답변 목록 */}
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>
              질문 및 어르신 답변 내역 (총 15문항)
            </Text>

            <View style={{ gap: 10, marginBottom: 24 }}>
              {KDSQ_QUESTIONS_DATA.map(item => (
                <View key={item.id} style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '800', color: '#0d9488', marginBottom: 4 }}>
                    Q{item.id < 10 ? `0${item.id}` : item.id}.
                  </Text>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 10, lineHeight: 22 }}>
                    {item.q}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: item.level === 'caution' ? '#fef3c7' : '#f0fdf4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                    <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '600', color: item.level === 'caution' ? '#92400e' : '#166534' }}>
                      선택한 답변
                    </Text>
                    <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '800', color: item.level === 'caution' ? '#b45309' : '#15803d' }}>
                      {item.answer} ({item.score}점)
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 보호자 권장 가이드 */}
            <View style={{ backgroundColor: '#e6f4f1', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#99f6e4', marginBottom: 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name="bulb-outline" size={18} color="#0f766e" />
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '800', color: '#0f766e' }}>보호자 전문 케어 가이드</Text>
              </View>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#115e59', lineHeight: 20 }}>
                어르신의 현재 인지 건강은 3점으로 지극히 정상적인 상태입니다. 가끔 약속이나 물건 위치를 깜빡하시는 항목(Q2, Q5, Q6)이 있으므로 똑톡이와의 데일리 음성 대화와 두뇌 게임을 꾸준히 이용하시도록 격려해 주세요.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── 3. 두뇌 훈련 게임 4종 세부 분석 보고서 모달 ── */}
      <Modal visible={isGameDetailOpen} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={CARDS_ICON} style={{ width: 28, height: 28 }} resizeMode="contain" />
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#0f172a' }}>두뇌 게임 4종 세부 분석 보고서</Text>
            </View>
            <TouchableOpacity onPress={() => setIsGameDetailOpen(false)} style={S.iconBtn}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {/* 총점 요약 배너 */}
            <View style={{ backgroundColor: '#0284c7', borderRadius: 20, padding: 20, marginBottom: 20 }}>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#e0f2fe', fontWeight: '700', marginBottom: 4 }}>
                주간 두뇌 훈련 종합 성과 지수
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 32, fontWeight: '900', color: '#ffffff' }}>90점</Text>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, color: '#e0f2fe', fontWeight: '700' }}>/ 100점 만점 (상위 5% 최우수)</Text>
              </View>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#f0f9ff', marginTop: 8, lineHeight: 18 }}>
                어르신의 기억력, 집중력, 순발력 전 분야가 고르게 향상되고 있으며 출석 달성률 92%를 기록 중입니다.
              </Text>
            </View>

            {/* 영역별 인지 지표 진행 바 */}
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>
              영역별 인지 능력 분석
            </Text>

            <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 24, gap: 14 }}>
              {[
                { domain: '시각 단기 기억력', val: '88점', percent: '88%', color: '#0d9488' },
                { domain: '주의 집중 제어력', val: '95점', percent: '95%', color: '#0284c7' },
                { domain: '작업 기억 순서유지', val: '90점', percent: '90%', color: '#7c3aed' },
                { domain: '수리 연산 순발력', val: '92점', percent: '92%', color: '#d97706' },
              ].map(item => (
                <View key={item.domain}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: '#334155' }}>{item.domain}</Text>
                    <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '800', color: item.color }}>{item.val}</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: item.percent, height: '100%', backgroundColor: item.color, borderRadius: 4 }} />
                  </View>
                </View>
              ))}
            </View>

            {/* 4종 게임 세부 성과 리스트 */}
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>
              게임 종목별 세부 성과 내역
            </Text>

            <View style={{ gap: 12, marginBottom: 24 }}>
              {GAME_HISTORY_DATA.map(game => (
                <View key={game.id} style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: '#E2E7F0' }}>
                      <Image source={game.iconAsset} style={{ width: 34, height: 34 }} resizeMode="contain" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '800', color: '#0f172a' }}>{game.name}</Text>
                        <View style={{ backgroundColor: game.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 11, fontWeight: '800', color: game.color }}>{game.grade}</Text>
                        </View>
                      </View>
                      <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#64748b', marginTop: 2 }}>영역: {game.category}</Text>
                    </View>
                    <Text style={{ fontFamily: FONT_FAMILY, fontSize: 20, fontWeight: '900', color: game.color }}>{game.score}</Text>
                  </View>

                  <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#475569', fontWeight: '600' }}>특이 분석: {game.desc}</Text>
                    <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, color: '#0284c7', fontWeight: '800' }}>{game.time}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* 전문 권장 소견 */}
            <View style={{ backgroundColor: '#f0f9ff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#bae6fd', marginBottom: 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name="bulb-outline" size={18} color="#0284c7" />
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '800', color: '#0369a1' }}>두뇌 케어 가이드 소견</Text>
              </View>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#0c4a6e', lineHeight: 20 }}>
                어르신은 시각적 주의 집약력 및 반응속도가 매우 뛰어납니다. 주 4회 이상 두뇌 게임을 꾸준히 이어나갈 수 있도록 격려해 주시면 자극 둔화를 방지하는 데 매우 효과적입니다.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── 4. 대화 전문 상세 모달 ── */}
      <Modal visible={!!selectedTranscript} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="chatbubbles-outline" size={22} color="#0d9488" />
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#0f172a' }}>음성 대화 전문 기록</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedTranscript(null)} style={S.iconBtn}>
              <Ionicons name="close" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {selectedTranscript && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
              <View style={{ backgroundColor: '#ffffff', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 }}>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#64748b', marginBottom: 4 }}>{selectedTranscript.date}</Text>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 }}>{selectedTranscript.title}</Text>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#334155', lineHeight: 20 }}>{selectedTranscript.summary}</Text>
              </View>

              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>대화 내용 기록 (Voice Log)</Text>

              <View style={{ gap: 12 }}>
                <View style={{ alignSelf: 'flex-start', backgroundColor: '#e6f4f1', borderRadius: 16, padding: 14, maxWidth: '85%' }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '800', color: '#0f766e', marginBottom: 2 }}>똑톡이 (AI)</Text>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#0f172a', lineHeight: 20 }}>어르신, 오늘 아침 식사는 맛있게 하셨어요?</Text>
                </View>

                <View style={{ alignSelf: 'flex-end', backgroundColor: '#0d9488', borderRadius: 16, padding: 14, maxWidth: '85%' }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '800', color: '#ccfbf1', marginBottom: 2 }}>어르신</Text>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#ffffff', lineHeight: 20 }}>응, 오늘 아침에 된장찌개 끓여서 맛있게 먹었단다.</Text>
                </View>

                <View style={{ alignSelf: 'flex-start', backgroundColor: '#e6f4f1', borderRadius: 16, padding: 14, maxWidth: '85%' }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '800', color: '#0f766e', marginBottom: 2 }}>똑톡이 (AI)</Text>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#ffffff', lineHeight: 20 }}>구수한 된장찌개라니 정말 맛있으셨겠어요! 날씨도 따뜻한데 식사 후 공원 산책도 다녀오셨나요?</Text>
                </View>

                <View style={{ alignSelf: 'flex-end', backgroundColor: '#0d9488', borderRadius: 16, padding: 14, maxWidth: '85%' }}>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '800', color: '#ccfbf1', marginBottom: 2 }}>어르신</Text>
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#ffffff', lineHeight: 20 }}>그래, 햇살이 따스해서 동네 이웃이랑 30분 동안 걷고 왔지.</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// ── 스타일 선언 객체 (S) ──────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  cardBase: {
    backgroundColor: '#ffffff', borderRadius: 22, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  rowIconBase: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  // 헤더
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // 알림
  alertHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  alertTitle: { fontFamily: FONT_FAMILY, flex: 1, fontSize: 18, fontWeight: '800', color: '#191f28', marginLeft: 8 },
  alertItem: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  alertItemTitle: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '700', color: '#191f28', marginBottom: 4 },
  alertDesc: { fontFamily: FONT_FAMILY, fontSize: 14, color: '#6b7684', lineHeight: 20 },

  // 탭바
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabIconWrap: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontFamily: FONT_FAMILY, fontSize: 12, color: '#8b95a1', marginTop: 3, fontWeight: '500' },
  tabLabelActive: { fontFamily: FONT_FAMILY, fontWeight: '800' },

  // PIN 모달
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pinCard: { width: '100%', maxWidth: 320, backgroundColor: '#ffffff', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 5 },
  pinInput: { width: '100%', height: 50, backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 10 },
});