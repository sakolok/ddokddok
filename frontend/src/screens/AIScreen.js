import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, Easing, FlatList, StatusBar,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { saveRealChatLog } from '../services/chatService';

const FONT_FAMILY = Platform.OS === 'web' 
  ? '"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif' 
  : 'Pretendard';

const QUOKKA_3D_NUKKI = require('../../assets/quokka_3d_nukki.png');

const SUGGESTIONS = ['오늘 건강 어때?', '재미있는 농담 해줘', '옛날 이야기 해줘', '오늘 날씨 어때?'];

export default function AIScreen({ navigation, route }) {
  // voiceState: 'idle' | 'listening' | 'thinking' | 'speaking'
  const [voiceState, setVoiceState] = useState('idle');
  const [textMode, setTextMode]     = useState(false);
  const [input, setInput]           = useState('');
  
  const [messages, setMessages]     = useState([
    {
      id: '1',
      from: 'ai',
      text: '안녕하세요 어르신! 똑똑이입니다. 오늘 편안하게 이야기 나눠보세요.',
      time: '방금 전',
    },
  ]);

  const flatListRef = useRef(null);

  // 애니메이션 수치 (마이크 펄스 & 쿼카 투명도/크기 전환)
  const pulseScale    = useRef(new Animated.Value(1)).current;
  const pulseOpac     = useRef(new Animated.Value(0.5)).current;
  const pulseLoop     = useRef(null);

  const quokkaOpacity = useRef(new Animated.Value(1)).current;
  const quokkaScale   = useRef(new Animated.Value(1)).current;

  // 대화가 시작되면(메시지 2개 이상) 3D 쿼카가 선명한 상태에서 은은한 배경 워터마크 모드로 자연스럽게 전환
  useEffect(() => {
    if (messages.length > 1) {
      Animated.parallel([
        Animated.timing(quokkaOpacity, {
          toValue: 0.22,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(quokkaScale, {
          toValue: 1.12,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(quokkaOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(quokkaScale, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [messages.length]);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.45, duration: 750, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1,    duration: 750, easing: Easing.in(Easing.ease),  useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpac, { toValue: 0, duration: 750, useNativeDriver: true }),
          Animated.timing(pulseOpac, { toValue: 0.5, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseScale.setValue(1);
    pulseOpac.setValue(0.5);
  };

  // 대시보드 마이크 버튼 눌러 들어왔을 때 즉시 음성 듣기 모드 가동
  useEffect(() => {
    if (route?.params?.autoListen) {
      startPulse();
      setVoiceState('listening');
    }
  }, [route?.params]);

  // 대화 추가 시 하단 자동 스크롤
  const addMessage = (newMsg) => {
    setMessages(prev => [...prev, newMsg]);
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // 음성 마이크 버튼 토글 (실시간 대화)
  const handleMicPress = () => {
    if (voiceState === 'idle') {
      startPulse();
      setVoiceState('listening');
    } else if (voiceState === 'listening') {
      stopPulse();
      setVoiceState('thinking');

      setTimeout(() => {
        const userText = '오늘 햇살이 좋아서 집 앞 산책을 조금 다녀왔어.';
        const aiText = '산책을 다녀오셨군요! 따스한 햇살을 쬐시면 기분도 좋아지고 밤에 잠도 잘 오실 거예요. 오늘 다리는 불편하지 않으셨나요?';

        addMessage({
          id: Date.now().toString(),
          from: 'user',
          text: userText,
          time: '방금 전',
        });

        // 실제 대화 기록에 저장
        saveRealChatLog(userText, aiText);

        setTimeout(() => {
          setVoiceState('speaking');
          addMessage({
            id: (Date.now() + 1).toString(),
            from: 'ai',
            text: aiText,
            time: '방금 전',
          });

          setTimeout(() => {
            setVoiceState('idle');
          }, 3500);
        }, 1200);
      }, 1000);
    }
  };

  // 텍스트 전송
  const handleSendText = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const aiResponse = `네 어르신, "${trimmed}" 라고 말씀해 주셔서 감사합니다. 똑똑이가 항상 어르신의 이야기를 경청하고 있습니다.`;

    addMessage({
      id: Date.now().toString(),
      from: 'user',
      text: trimmed,
      time: '방금 전',
    });
    
    // 실제 대화 기록에 저장
    saveRealChatLog(trimmed, aiResponse);

    setInput('');
    setVoiceState('thinking');

    setTimeout(() => {
      setVoiceState('speaking');
      addMessage({
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: aiResponse,
        time: '방금 전',
      });

      setTimeout(() => {
        setVoiceState('idle');
      }, 3000);
    }, 1000);
  };

  const getStatusText = () => {
    switch (voiceState) {
      case 'listening': return '듣고 있습니다. 편하게 말씀하세요.';
      case 'thinking':  return '생각하고 있습니다...';
      case 'speaking':  return '답변을 말씀드리고 있습니다.';
      default:          return '마이크 버튼을 누르고 말씀해 주세요';
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── 1. 상단 헤더: "똑똑이와 대화하기" ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>똑똑이와 대화하기</Text>
        </View>

        <View style={{ width: 44 }} />
      </View>

      {/* ── 2. 메인 대화 영역 ── */}
      <KeyboardAvoidingView
        style={{ flex: 1, position: 'relative' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 3D 쿼카 캐릭터 (첫 화면: 선명 ➔ 대화 시작 시 은은한 배경 워터마크 모드로 모션 페이드 전환) */}
        <Animated.View
          style={[
            styles.quokkaStageContainer,
            {
              opacity: quokkaOpacity,
              transform: [{ scale: quokkaScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={QUOKKA_3D_NUKKI}
            style={styles.quokka3DImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* 채팅 메시지 리스트 (Z-Index 5: 대화 시작 후 스크롤 시 글씨 가독성 100% 보장) */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.msgRow, item.from === 'user' && styles.msgRowUser]}>
              <View style={[styles.bubble, item.from === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                <Text style={[styles.bubbleText, item.from === 'user' && styles.bubbleTextUser]}>
                  {item.text}
                </Text>
              </View>
            </View>
          )}
        />

        {/* 상태 말풍선 뱃지 (하단 마이크 바로 위 고정) */}
        <View style={styles.floatingStatusBadge} pointerEvents="none">
          <View style={styles.speechBadgeBubble}>
            <View style={[styles.statusDot, { backgroundColor: voiceState === 'listening' ? '#EF4444' : voiceState === 'speaking' ? '#10B981' : '#3E4C7D' }]} />
            <Text style={styles.speechBadgeText}>
              {voiceState === 'listening' ? '말씀 듣는 중...' :
               voiceState === 'speaking' ? '답변해 드리는 중...' :
               '늘 곁에 있는 똑똑이'}
            </Text>
          </View>
        </View>

        {/* 추천 질문 칩 */}
        {!textMode && voiceState === 'idle' && (
          <View style={styles.suggestArea}>
            <FlatList
              horizontal
              data={SUGGESTIONS}
              keyExtractor={s => s}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestChip}
                  activeOpacity={0.8}
                  onPress={() => {
                    addMessage({ id: Date.now().toString(), from: 'user', text: item, time: '방금 전' });
                    setVoiceState('thinking');
                    setTimeout(() => {
                      setVoiceState('speaking');
                      addMessage({
                        id: (Date.now() + 1).toString(),
                        from: 'ai',
                        text: `"${item}"에 대해 물어봐 주셔서 감사합니다 어르신! 똑똑이가 답변드릴게요.`,
                        time: '방금 전',
                      });
                      setTimeout(() => setVoiceState('idle'), 3000);
                    }, 1000);
                  }}
                >
                  <Text style={styles.suggestText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ── 3. 하단 음성 마이크 / 텍스트 입력 컨트롤 바 ── */}
        <View style={styles.inputBar}>
          {textMode ? (
            <View style={styles.textInputRow}>
              <TouchableOpacity
                style={styles.modeToggleBtn}
                onPress={() => setTextMode(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="mic-outline" size={24} color="#3E4C7D" />
              </TouchableOpacity>
              <TextInput
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                placeholder="똑똑이에게 하고 싶은 말을 적어보세요..."
                placeholderTextColor="#94A3B8"
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
                onPress={handleSendText}
                disabled={!input.trim()}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.micControlArea}>
              <TouchableOpacity
                style={styles.micCenter}
                onPress={handleMicPress}
                activeOpacity={0.85}
              >
                {voiceState === 'listening' && (
                  <Animated.View
                    style={[
                      styles.pulseRing,
                      {
                        transform: [{ scale: pulseScale }],
                        opacity: pulseOpac,
                      },
                    ]}
                  />
                )}
                <View style={[
                  styles.micBtn,
                  voiceState === 'listening' && styles.micBtnListening,
                  voiceState === 'thinking'  && styles.micBtnThinking,
                  voiceState === 'speaking'  && styles.micBtnSpeaking,
                ]}>
                  <Ionicons
                    name={
                      voiceState === 'listening' ? 'square' :
                      voiceState === 'thinking'  ? 'hourglass-outline' :
                      voiceState === 'speaking'  ? 'volume-medium-outline' :
                      'mic'
                    }
                    size={32}
                    color="#ffffff"
                  />
                </View>
              </TouchableOpacity>

              <Text style={styles.statusHintText}>{getStatusText()}</Text>

              <TouchableOpacity
                style={styles.textModeSwitch}
                onPress={() => setTextMode(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.textModeSwitchText}>키보드로 글자 입력하기</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontFamily: FONT_FAMILY, fontSize: 19, fontWeight: '800', color: '#1E293B', letterSpacing: -0.3 },

  quokkaStageContainer: {
    position: 'absolute',
    bottom: 150,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  quokka3DImage: {
    width: 230,
    height: 230,
  },

  floatingStatusBadge: {
    position: 'absolute',
    bottom: 128,
    alignSelf: 'center',
    zIndex: 8,
  },

  chatContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 170, gap: 12, zIndex: 5 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 4 },
  msgRowUser: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  bubbleAi: {
    backgroundColor: '#ffffff',
    borderWidth: 1, borderColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#3E4C7D',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontFamily: FONT_FAMILY, fontSize: 16, color: '#1E293B', lineHeight: 25, fontWeight: '500' },
  bubbleTextUser: { fontFamily: FONT_FAMILY, color: '#ffffff', fontWeight: '500' },

  suggestArea: { paddingVertical: 8, backgroundColor: 'transparent', zIndex: 6 },
  suggestContent: { paddingHorizontal: 16, gap: 8 },
  suggestChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#CBD5E1',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  suggestText: { fontFamily: FONT_FAMILY, fontSize: 14, color: '#334155', fontWeight: '600' },

  speechBadgeBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#3E4C7D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  speechBadgeText: { fontFamily: FONT_FAMILY, fontSize: 13, fontWeight: '700', color: '#1E293B' },

  inputBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03, shadowRadius: 10, elevation: 3,
    zIndex: 10,
  },
  micControlArea: { alignItems: 'center' },
  micCenter: { position: 'relative', width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  pulseRing: {
    position: 'absolute',
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EF4444',
  },
  micBtn: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#3E4C7D',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#3E4C7D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  micBtnListening: { backgroundColor: '#EF4444' },
  micBtnThinking:  { backgroundColor: '#F59E0B' },
  micBtnSpeaking:  { backgroundColor: '#10B981' },

  statusHintText: { fontFamily: FONT_FAMILY, fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 8, marginBottom: 6 },
  textModeSwitch: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  textModeSwitchText: { fontFamily: FONT_FAMILY, fontSize: 13, color: '#64748B', fontWeight: '500', textDecorationLine: 'underline' },

  textInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modeToggleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  textInput: {
    flex: 1, minHeight: 44, maxHeight: 100,
    backgroundColor: '#F1F5F9', borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: FONT_FAMILY, fontSize: 16, color: '#1E293B',
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3E4C7D', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#E2E8F0' },
});
