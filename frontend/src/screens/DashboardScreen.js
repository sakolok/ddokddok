import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Image, Modal,
  Linking, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../services/UserContext';
import { getRealChatLogs, subscribeChatLogs } from '../services/chatService';

const FONT_FAMILY = Platform.OS === 'web' 
  ? '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' 
  : 'Pretendard';

const CHECKLIST_ICON  = require('../../assets/self_assessment_icon.png');
const CARDS_ICON      = require('../../assets/brain_game_icon.png');
const STUDIO_MIC_ICON = require('../../assets/studio_mic_icon.png');
const QUOKKA_MASCOT   = require('../../assets/quokka_mascot.png');

// ── 데이터 선언 ──────────────────────────────────────────
const ALERTS = [
  { id: 1, icon: 'heart',               color: '#ef4444', bg: '#fff1f2', title: '건강 체크 알림',    desc: '오늘 인지 건강 체크를 아직 하지 않으셨어요.',   time: '방금 전',  unread: true  },
  { id: 2, icon: 'chatbubble-ellipses', color: '#1e3a8a', bg: '#eef2ff', title: '똑똑이와 대화',     desc: '어제 나눴던 산책 이야기 이어서 해볼까요?',     time: '1시간 전', unread: true  },
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


// ── 대화 기록 탭 (Chat History Tab - 실제 대화 전용) ────────
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
      {/* 헤더 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#E2E7F0' }}>
        <TouchableOpacity style={S.iconBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color="#191F28" />
        </TouchableOpacity>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#191F28' }}>대화 기록</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* 대화 기록 카드 리스트 또는 심플한 빈 상태 */}
        {logs.length === 0 ? (
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            paddingVertical: 48,
            paddingHorizontal: 24,
            alignItems: 'center',
            justify: 'center',
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

// ── 시니어 전용 홈 탭 (Voice Input & Companion UX - TokTokTok Premium) ────────────────

// ── 헬스조선(Health Chosun) 실시간 검증 보도 기사 전체 풀 (로그인 시 dynamic shuffle) ──
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
  {
    id: 4,
    icon: 'nutrition-outline',
    iconBg: '#FEE2E2',
    iconColor: '#B91C1C',
    publisher: '헬스조선',
    title: '“혈당 조절에 제일” 의사·영양사가 추천하는 간식, 뭘까?',
    subtitle: '견과류와 식이섬유 중심의 두뇌 영양 간식 선택법',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/10/2026081002632.html'
  },
  {
    id: 5,
    icon: 'leaf-outline',
    iconBg: '#E0E7FF',
    iconColor: '#4338CA',
    publisher: '헬스조선',
    title: '지방 태우고 노화 막는데… 차 자주 마셔야 할 ‘또 하나의 이유’',
    subtitle: '항산화 성분이 풍부한 차 습관과 두뇌 혈류 개선 효과',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/11/2026081101167.html'
  },
  {
    id: 6,
    icon: 'sparkles-outline',
    iconBg: '#F3E8FF',
    iconColor: '#6B21A8',
    publisher: '헬스조선',
    title: '“장 깨끗해진다” 치아씨드 제대로 먹는 3가지 방법',
    subtitle: '식이섬유 섭취를 통한 장 건강과 신체 활력 증진',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/11/2026081101211.html'
  },
  {
    id: 7,
    icon: 'restaurant-outline',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    publisher: '헬스조선',
    title: '살 뺀다고 ‘쌀밥’ 줄이기 전… 한 끗 차이로 혈당 잡는 식사법',
    subtitle: '올바른 탄수화물 조절과 규칙적인 혈당 관리 수칙',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/10/2026081002250.html'
  },
  {
    id: 8,
    icon: 'body-outline',
    iconBg: '#DCFCE7',
    iconColor: '#166534',
    publisher: '헬스조선',
    title: '척추 망가진다… 캐리어 끄는 올바른 방법, 따로 있다는데?',
    subtitle: '일상생활 관절 보호와 올바른 바른 자세 교정 가이드',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/10/2026081002079.html'
  },
  {
    id: 9,
    icon: 'basket-outline',
    iconBg: '#E0F2FE',
    iconColor: '#1D4ED8',
    publisher: '헬스조선',
    title: '“농약 씻어내고 신선도 유지”… 채소 세척 때 쓰면 좋다는데, 뭐지?',
    subtitle: '신선한 채소 섭취와 안전한 식재료 손질 꿀팁',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/10/2026081002029.html'
  },
  {
    id: 10,
    icon: 'sunny-outline',
    iconBg: '#FFEDD5',
    iconColor: '#C2410C',
    publisher: '헬스조선',
    title: '“포만감 최고”… ‘간헐적 단식’ 창시자가 아침에 먹는 음식, 뭘까?',
    subtitle: '활기찬 하루를 여는 단백질 중심의 아침 영양 식단',
    url: 'https://health.chosun.com/site/data/html_dir/2026/08/10/2026081002322.html'
  }
];

function SeniorHomeTab({ navigation }) {
  const { currentUser } = useUser();
  const userName = currentUser?.name || '어르신';
  const [isCallModalVisible, setIsCallModalVisible] = useState(false);
  const [callState, setCallState] = useState('talking'); // 'listening' | 'speaking' | 'talking'
  const [quokkaDialogue, setQuokkaDialogue] = useState('어르신, 반가워요! 저 똑똑이 쿼카예요 🦘 오늘 어떤 재미있는 일 있으셨어요?');

  const getRandomArticles = () => {
    const shuffled = [...HEALTH_NEWS_ARTICLES_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  };

  const [newsArticles, setNewsArticles] = useState(getRandomArticles);

  useEffect(() => {
    setNewsArticles(getRandomArticles());
  }, []);

  const handleOpenNewsArticle = (article) => {
    if (article && article.url) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(article.url, '_blank');
      } else {
        Linking.openURL(article.url).catch((err) => console.log('Error opening news URL:', err));
      }
    }
  };

  const handleDownloadIcon = (iconSource, fileName) => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const resolved = Image.resolveAssetSource ? Image.resolveAssetSource(iconSource) : null;
        const uri = resolved ? resolved.uri : iconSource;
        const link = document.createElement('a');
        link.href = uri;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(`${fileName} 파일이 다운로드됩니다.`);
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  const [isRecording, setIsRecording] = useState(false);

  // 동적 실시간 날짜 계산 (한국어 포맷)
  const now = new Date();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const dayName = dayNames[now.getDay()];
  const dynamicDateStr = `${month}월 ${date}일 ${dayName}`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F6F8FB' }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36 }} showsVerticalScrollIndicator={false}>
      
      {/* ── 0. 고도화된 톡톡톡 브랜드 상단 헤더 & 실시간 갱신 날짜 ── */}
      <View style={{ marginBottom: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 25, fontWeight: '800', color: '#191F28', letterSpacing: -0.5 }}>
            {`${userName}님, 반가워요`}
          </Text>

          </View>

        {/* 갱신되는 실시간 한국어 날짜 */}
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#8C857B', fontWeight: '600', marginBottom: 8 }}>
          {dynamicDateStr}
        </Text>

        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, color: '#4A453E', fontWeight: '600', lineHeight: 23 }}>
          오늘 있었던 일, 똑똑이한테 편하게 얘기해보세요.
        </Text>
      </View>

      {/* ── 1. 중앙 메인 히어로 마이크 카드 (Large Centerpiece Interactive Hero Mic) ── */}
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
        
        {/* 상단 파형 애니메이션 비주얼라이저 (Sound Wave Equalizer) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, marginBottom: 22 }}>
          {[12, 22, 34, 18, 28, 40, 24, 16, 32, 20, 12].map((h, i) => (
            <View 
              key={i} 
              style={{ 
                width: 4, 
                height: isRecording ? Math.max(10, (h * (i % 2 === 0 ? 1.25 : 0.75))) : h, 
                backgroundColor: isRecording ? '#3E4C7D' : '#D1CBC2', 
                borderRadius: 2 
              }} 
            />
          ))}
        </View>

        {/* 딥 인디고 거대 마이크 버튼 (지름 110px) */}
        <View style={{
          width: 128,
          height: 128,
          borderRadius: 64,
          backgroundColor: '#EBF0F7',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20
        }}>
          <TouchableOpacity
            style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: isRecording ? '#2E3A66' : '#3E4C7D',
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

        {/* 가독성 높은 메인 안내 문구 */}
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 22, fontWeight: '800', color: '#191F28', textAlign: 'center', marginBottom: 6 }}>
          {isRecording ? '듣고 있어요...' : '눌러서 말하기'}
        </Text>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#8C857B', fontWeight: '500' }}>
          귀여운 똑똑이와 대화해 보세요
        </Text>
      </View>

      {/* ── 마이크 누르면 나오는 쿼카 캐릭터 실시간 대화/영상통화 풀스크린 모달 ── */}
      <Modal
        visible={isCallModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsCallModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#1E2540' }}>
          {/* 상단 통화 상태 헤더 */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'ios' ? 54 : 32,
            paddingBottom: 16
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#ffffff' }}>
                똑똑이 쿼카와 음성/영상 대화 중 🦘
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsCallModalVisible(false)}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* 중앙 쿼카 캐릭터 메인 뷰 */}
          <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 140 }}>
            {/* 쿼카 캐릭터 대형 아바타 (Pororo Call Style) */}
            <View style={{
              position: 'relative',
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: '#FFF8F0',
              borderWidth: 6,
              borderColor: '#FFE8D6',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.35,
              shadowRadius: 24,
              elevation: 10
            }}>
              <Image source={QUOKKA_MASCOT} style={{ width: 190, height: 190 }} resizeMode="contain" />
            </View>

            {/* 실시간 쿼카 말풍선 (Dialogue Bubble) */}
            <View style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              paddingHorizontal: 22,
              paddingVertical: 18,
              maxWidth: '92%',
              borderWidth: 2,
              borderColor: '#E2E7F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 5,
              marginBottom: 20
            }}>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '700', color: '#191F28', lineHeight: 28, textAlign: 'center' }}>
                {quokkaDialogue}
              </Text>
            </View>

            {/* 대화 질문 칩 (Quick Voice Prompts) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: '95%' }}>
              {['오늘 건강 어때?', '재미있는 농담 해줘', '옛날 이야기 해줘', '오늘 날씨 어때?'].map((prompt, i) => (
                <TouchableOpacity
                  key={i}
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                  onPress={() => {
                    setQuokkaDialogue(`어르신께서 "${prompt}" 라고 말씀하셨군요! 귀여운 똑똑이 쿼카가 기쁘게 대답해 드릴게요 🦘✨`);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, color: '#ffffff', fontWeight: '600' }}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* 우측 하단 어르신 영상 카메라 PIP (Picture-In-Picture Preview) */}
          <View style={{
            position: 'absolute',
            bottom: 120,
            right: 20,
            width: 90,
            height: 120,
            borderRadius: 16,
            backgroundColor: '#334155',
            borderWidth: 2,
            borderColor: '#ffffff',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8
          }}>
            <Ionicons name="person-circle-outline" size={48} color="#94A3B8" />
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 11, color: '#ffffff', fontWeight: '700', marginTop: 2 }}>어르신 화면</Text>
          </View>

          {/* 하단 통화 컨트롤 바 (End Call / Mic Mute / AI Screen Shift) */}
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#0F172A',
            paddingVertical: 20,
            paddingHorizontal: 30,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28
          }}>
            <TouchableOpacity
              style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => setQuokkaDialogue('어르신 말씀이 아주 잘 들려요! 편안하게 이야기하세요 😊')}
            >
              <Ionicons name="mic" size={26} color="#ffffff" />
            </TouchableOpacity>

            {/* 빨간색 통화 종료 버튼 */}
            <TouchableOpacity
              style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 }}
              onPress={() => setIsCallModalVisible(false)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={32} color="#ffffff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {
                setIsCallModalVisible(false);
                navigation.navigate('AI');
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 2. 오늘의 케어 (2컬럼 그리드 카드) ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#191F28' }}>
          오늘의 케어
        </Text>
        
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
        {/* 왼쪽: 인지 건강 자가진단 (중앙 정렬, 더 크고 선명한 아이콘) */}
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 22, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
          onPress={() => navigation.navigate('Health')}
          activeOpacity={0.8}
        >
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 }}>
            <Image source={CHECKLIST_ICON} style={{ width: 52, height: 52 }} resizeMode="contain" />
          </View>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#191F28', textAlign: 'center', marginBottom: 4 }}>자가 체크</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#8C857B', fontWeight: '500', textAlign: 'center' }}>오늘의 두뇌 상태 점검</Text>
        </TouchableOpacity>

        {/* 오른쪽: 두뇌 훈련 게임 (중앙 정렬, 더 크고 선명한 아이콘) */}
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: '#ffffff', borderRadius: 22, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
          onPress={() => navigation.navigate('Game')}
          activeOpacity={0.8}
        >
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E2E7F0', shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 1 }}>
            <Image source={CARDS_ICON} style={{ width: 52, height: 52 }} resizeMode="contain" />
          </View>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#191F28', textAlign: 'center', marginBottom: 4 }}>두뇌 훈련 게임</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#8C857B', fontWeight: '500', textAlign: 'center' }}>즐겁게 기억력 키우기</Text>
        </TouchableOpacity>
      </View>

      {/* ── 3. 오늘의 건강 뉴스 (실시간 제작 건강 정보 3선) ── */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '800', color: '#191F28', flex: 1 }} numberOfLines={1}>
                  {article.title}
                </Text>
              </View>
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

// ── 보호자 전용 대시보드 탭 (Analytics & Monitoring Dashboard UX - 실제 대화 가동) ──
function GuardianHomeTab({ navigation }) {
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

  const latestLogTime = realLogs.length > 0 ? realLogs[0].date : '대화 기록 없음';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      {/* ── 1. 어르신 실시간 안부 상태 & 전화 숏컷 ── */}
      <View style={{ backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: realLogs.length > 0 ? '#dcfce7' : '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: realLogs.length > 0 ? '#16a34a' : '#94a3b8' }} />
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '800', color: realLogs.length > 0 ? '#15803d' : '#64748b' }}>
              {latestLogTime}
            </Text>
          </View>
        </View>

        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 }}>
          {`${userName}님의 오늘 안부`}
        </Text>
        <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, color: '#475569', fontWeight: '600', lineHeight: 22, marginBottom: 16 }}>
          {realLogs.length > 0 ? '어르신 기분이 좋아 보여요 😊' : '오늘 아직 나눈 음성 대화가 없습니다.'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            onPress={() => Linking.openURL('tel:01012345678')}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={16} color="#ffffff" />
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '800', color: '#ffffff' }}>전화걸기</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: '#fff1f2', borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1, borderColor: '#fecdd3' }}
            onPress={() => alert('비상 알림이 전달되었습니다.')}
            activeOpacity={0.8}
          >
            <Ionicons name="alert-circle" size={16} color="#e11d48" />
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '800', color: '#e11d48' }}>비상 연락</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 2. 인지 건강 상태 점수 ── */}
      <View style={{ backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#0f172a' }}>인지 건강 상태</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#2563eb' }}>95점 · 양호함</Text>
        </View>

        {/* 프로그레스 바 */}
        <View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden', marginBottom: 14 }}>
          <View style={{ width: '95%', height: '100%', backgroundColor: '#2563eb', borderRadius: 5 }} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 }}>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#475569', fontWeight: '600' }}>최근 감정</Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: '#16a34a' }}>기분 좋음 88%</Text>
        </View>
      </View>

      {/* ── 3. 대화 기록 & 음성 (실제 대화 기록) ── */}
      <Text style={{ fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 14 }}>
        대화 기록 & 음성
      </Text>

      {realLogs.length === 0 ? (
        <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14 }}>
          <Ionicons name="chatbubble-ellipses-outline" size={32} color="#94a3b8" style={{ marginBottom: 10 }} />
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '700', color: '#475569', marginBottom: 4, textAlign: 'center' }}>
            아직 기록된 어르신의 대화가 없습니다.
          </Text>
          <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
            어르신께서 똑똑이와 음성 대화를 나누시면 이곳에 실시간 기록됩니다.
          </Text>
        </View>
      ) : (
        realLogs.map(log => (
          <View key={log.id} style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: '#64748b' }}>{log.date}</Text>
              <View style={{ backgroundColor: log.moodBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ fontFamily: FONT_FAMILY, fontSize: 12, fontWeight: '800', color: log.moodColor }}>{log.mood}</Text>
              </View>
            </View>

            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 15, color: '#1e293b', lineHeight: 22, fontWeight: '600', marginBottom: 14 }}>
              {log.summary}
            </Text>

            <TouchableOpacity 
              style={{ backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              onPress={() => setPlayingId(playingId === log.id ? null : log.id)}
              activeOpacity={0.8}
            >
              <Ionicons name={playingId === log.id ? 'pause-circle' : 'play-circle'} size={20} color="#2563eb" />
              <Text style={{ fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: '#2563eb' }}>
                {playingId === log.id ? '음성 재생 중...' : '음성 다시듣기'}
              </Text>
            </TouchableOpacity>
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
  
  // 2-in-1 모드 전환 상태
  const [userMode, setUserRoleMode] = useState(rawRole === 'guardian' ? 'guardian' : 'senior');
  const [activeTab, setActiveTab]   = useState('home');

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* 홈 탭일 때만 메인 상단 헤더 렌더링 (대화기록/알림 탭은 건강체크 화면처럼 전용 헤더만 통일감 있게 표시) */}
      {activeTab === 'home' && (
        <View style={S.header}>
          <View style={S.headerLeft}>
            <Text style={{ fontFamily: FONT_FAMILY, fontSize: 23, fontWeight: '900', letterSpacing: -0.5 }}>
              <Text style={{ color: userMode === 'senior' ? '#3E4C7D' : '#0D9488' }}>똑똑</Text>
              <Text style={{ color: '#F59E0B' }}>똑</Text>
            </Text>
            {userMode === 'guardian' && (
              <View style={S.guardianTag}>
                <Text style={S.guardianTagText}>보호자 모드</Text>
              </View>
            )}
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
          <GuardianHomeTab navigation={navigation} />
        )
      ) : activeTab === 'history' ? (
        <ChatHistoryTab onBack={() => setActiveTab('home')} navigation={navigation} />
      ) : (
        <AlertTab onBack={() => setActiveTab('home')} />
      )}

      {/* 하단 탭바 (피그마 디자인 가이드 100% 매칭) */}
      <View style={[S.tabBar, { paddingBottom: insets.bottom + 6 }]}>
        {[
          { key: 'home',    icon: 'home',         iconOff: 'home-outline',         label: '홈' },
          { key: 'ai',      icon: 'mic',          iconOff: 'mic-outline',          label: '음성대화', onPress: () => navigation.navigate('AI') },
          { key: 'health',  icon: 'pulse',        iconOff: 'pulse-outline',        label: '건강체크', onPress: () => navigation.navigate('Health') },
          { key: 'history', icon: 'chatbubbles',  iconOff: 'chatbubbles-outline',  label: '대화기록', onPress: () => setActiveTab('history') },
        ].map(({ key, icon, iconOff, label, onPress }) => {
          const active = activeTab === key;
          const activeColor = userMode === 'senior' ? '#3E4C7D' : '#2563eb';
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
  rowSpaceBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  rowIconBase: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },

  // 헤더
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center' },
  headerLogo:  { width: 36, height: 36 },
  guardianTag: { backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  guardianTagText: { fontSize: 13, fontWeight: '700', color: '#1e3a8a' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#ffffff' },

  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },

  // 상단 배너 (Sleek Modern Card + Warm Micro Accent)
  heroBanner: {
    backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: '#e8f3ff',
    shadowColor: '#1b64da', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  heroBannerGuardian: {
    backgroundColor: '#f0fdf4', borderColor: '#bbf7d0',
  },

  guardianSignalCard: {
    backgroundColor: '#f0fdf4', borderRadius: 18, borderWidth: 1, borderColor: '#bbf7d0',
    padding: 16, marginBottom: 16,
  },
  signalHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  signalTitle: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '800', color: '#065f46' },
  signalDesc: { fontFamily: FONT_FAMILY, fontSize: 14, color: '#191f28', lineHeight: 22 },

  sectionTitle: { fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#191f28', marginBottom: 14, marginTop: 4 },
  sectionMore:  { fontFamily: FONT_FAMILY, fontSize: 14, color: '#1b64da', fontWeight: '700' },

  // 빠른 시작
  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickItemBox: { flex: 1, paddingVertical: 16, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  quickItemLabel: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: '#191f28', textAlign: 'center' },

  // 똑똑이 대화 카드
  aiCard: {
    backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#ffeef0', borderRadius: 22, padding: 20, marginBottom: 24,
    shadowColor: '#f04452', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  aiCardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  aiCardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  aiCardDesc:  { fontSize: 13, color: '#475569', fontWeight: '500' },
  aiArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  // 주간 통계 및 리스트
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: { flex: 1, padding: 14, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontFamily: FONT_FAMILY, fontSize: 17, fontWeight: '800', color: '#191f28' },
  statLabel: { fontFamily: FONT_FAMILY, fontSize: 13, color: '#6b7684', marginTop: 2, fontWeight: '500' },

  newsCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10, borderRadius: 20 },
  newsText: { fontFamily: FONT_FAMILY, fontSize: 15, color: '#191f28', fontWeight: '500' },

  // 알림 스타일
  alertHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  alertTitle: { fontFamily: FONT_FAMILY, flex: 1, fontSize: 18, fontWeight: '800', color: '#191f28', marginLeft: 8 },
  alertItem: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10 },
  alertItemTitle: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '700', color: '#191f28', marginBottom: 4 },
  alertDesc: { fontFamily: FONT_FAMILY, fontSize: 14, color: '#6b7684', lineHeight: 20 },

  // 탭바
  tabBar: { flexDirection: 'row', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center' },
  tabIconWrap: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapActive: { backgroundColor: '#e8f3ff' },
  tabLabel: { fontFamily: FONT_FAMILY, fontSize: 12, color: '#8b95a1', marginTop: 3, fontWeight: '500' },
  tabLabelActive: { fontFamily: FONT_FAMILY, color: '#1b64da', fontWeight: '800' },

  // 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '65%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontFamily: FONT_FAMILY, fontSize: 18, fontWeight: '800', color: '#191f28' },
  historyRowItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  historyDateText: { fontFamily: FONT_FAMILY, fontSize: 15, fontWeight: '700', color: '#191f28', marginBottom: 6 },
  historyStatsContainer: { flexDirection: 'row', gap: 16 },
  historyStatText: { fontFamily: FONT_FAMILY, fontSize: 14, color: '#6b7684' }
});