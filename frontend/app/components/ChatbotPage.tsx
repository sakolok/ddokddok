import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useActivity } from '@/app/contexts/ActivityContext';
import Layout from './Layout';
import { api } from '@/lib/api';
import { TranscribeStreamingSession, isTranscribeStreamingSupported } from '@/lib/transcribeStreaming';

interface ChatbotPageProps {
  userInfo: { name: string; id: string; userId?: string };
  onBack: () => void;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  audioUrl?: string;
  tags?: {
    kdsq_item_id?: string;
    risk_hint?: string;
  };
}

interface ApiSession {
  user_id: string;
  session_id: string;
  welcomeText?: string;
  welcomeAudioUrl?: string;
}

export default function ChatbotPage({ userInfo, onBack }: ChatbotPageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [transcribeSupported, setTranscribeSupported] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [streamingTranscript, setStreamingTranscript] = useState('');
  const [currentBotResponse, setCurrentBotResponse] = useState('');
  const [textInput, setTextInput] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [apiSession, setApiSession] = useState<ApiSession | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const apiSessionRef = useRef<ApiSession | null>(null);
  // const [sessionStarted, setSessionStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionActiveRef = useRef(false);
  const streamingSessionRef = useRef<TranscribeStreamingSession | null>(null);
  const recordingModeRef = useRef<'browser' | 'streaming' | null>(null);
  const streamingTranscriptRef = useRef('');
  const lastSentRef = useRef<string>('');
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const { startSession: startActivitySession, endSession: endActivitySession } = useActivity();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // API 함수들
  const startSession = async (): Promise<ApiSession | null> => {
    if (!userInfo.userId) return null;
    try {
      const welcomeText = `안녕하세요 ${userInfo?.name || '사용자'}님! 오늘 기분은 어떠신가요? 편하게 이야기해주세요.`;
      const data = await api.startSession(userInfo.userId, welcomeText);
      return {
        user_id: data.user_id,
        session_id: data.session_id,
        welcomeText: data.welcome_text || welcomeText,
        welcomeAudioUrl: data.audio?.url
      };
    } catch (error) {
      console.error('세션 시작 오류:', error);
      return null;
    }
  };

  const sendTurn = async (session: ApiSession, transcript: string): Promise<{ text: string; audioUrl?: string; tags?: any } | null> => {
    if (!session) return null;

    try {
      const data = await api.turn(session.session_id, session.user_id, transcript);
      return {
        text: data.assistant_text,
        audioUrl: data.audio?.url,
        tags: data.tags
      };
    } catch (error) {
      console.error('턴 전송 오류:', error);
      return null;
    }
  };

  const endSession = async () => {
    if (!apiSession) return;

    try {
      await api.endSession(apiSession.session_id);
    } catch (error) {
      console.error('세션 종료 오류:', error);
    }
  };

  // 컴포넌트 초기화 시 세션 시작
  useEffect(() => {
    const initializeSession = async () => {
      // 활동 세션 시작
      const activitySessionId = startActivitySession('chat');
      setCurrentSessionId(activitySessionId);
      
      const session = await startSession();
      if (session) {
        setApiSession(session);
        apiSessionRef.current = session;
        setIsDemoMode(false);
        // setSessionStarted(true);
        
        // 초기 환영 메시지 추가
        const welcomeMessage: Message = {
          id: Date.now(),
          text: session.welcomeText || `안녕하세요 ${userInfo?.name || '사용자'}님! 오늘 기분은 어떠신가요? 편하게 이야기해주세요.`,
          sender: 'bot',
          timestamp: new Date(),
          audioUrl: session.welcomeAudioUrl
        };
        setMessages([welcomeMessage]);
        setCurrentBotResponse(welcomeMessage.text);
        window.setTimeout(() => {
          speakText(welcomeMessage.text, welcomeMessage.audioUrl);
        }, 250);
      } else {
        console.warn('API 연결 실패');
        setIsDemoMode(true);
        const welcomeMessage: Message = {
          id: Date.now(),
          text: `서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.`,
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    };

    initializeSession();

    // 컴포넌트 언마운트 시 세션 종료
    return () => {
      if (apiSession) {
        endSession();
      }
      // 활동 세션 종료
      if (currentSessionId) {
        endActivitySession(currentSessionId, undefined, { messageCount: messages.length });
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      streamingSessionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  // 음성 인식 및 합성 초기화
  useEffect(() => {
    setTranscribeSupported(isTranscribeStreamingSupported());

    // 음성 인식 지원 확인
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (typeof SpeechRecognition === 'function') {
      setSpeechSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ko-KR';
      
      recognitionRef.current.onstart = () => {
        recognitionActiveRef.current = true;
        recordingModeRef.current = 'browser';
        setIsRecording(true);
        setVoiceError('');
        setInterimTranscript('');
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }
        
        // 실시간으로 중간 결과 업데이트
        setInterimTranscript(interimText);

        const finalTrimmed = finalText.trim();
        if (finalTrimmed) {
          if (finalTrimmed !== lastSentRef.current) {
            lastSentRef.current = finalTrimmed;
            latestTranscriptRef.current = '';
            if (silenceTimerRef.current) {
              window.clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
            setInterimTranscript('');
            setIsRecording(false);
            sendMessageWithText(finalTrimmed);
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }
          return;
        }

        const combined = interimText.trim();
        if (combined) {
          latestTranscriptRef.current = combined;
        }

        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = window.setTimeout(() => {
          const text = latestTranscriptRef.current.trim();
          if (text) {
            setInterimTranscript('');
            setIsRecording(false);
            lastSentRef.current = text;
            sendMessageWithText(text);
            latestTranscriptRef.current = '';
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          }
        }, 2000);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('음성 인식 오류:', event.error);
        recognitionActiveRef.current = false;
        recordingModeRef.current = null;
        setIsRecording(false);
        setInterimTranscript('');
        if (event.error !== 'not-allowed' && event.error !== 'service-not-allowed') {
          setSpeechSupported(false);
          setVoiceError('브라우저 음성 인식이 실패해 실시간 음성 인식으로 전환했습니다. 마이크 버튼을 다시 눌러주세요.');
        } else {
          setVoiceError('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
        }
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };
      
      recognitionRef.current.onend = () => {
        // 사용자가 수동으로 중지한 경우가 아니라면 상태 업데이트
        recognitionActiveRef.current = false;
        if (recordingModeRef.current === 'browser') {
          recordingModeRef.current = null;
        }
        setIsRecording(false);
        setInterimTranscript('');
        if (silenceTimerRef.current) {
          window.clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };
    }

    // 음성 합성 초기화
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startTranscribeRecording = async () => {
    if (!userInfo.userId) {
      alert('로그인 사용자 정보가 없어 음성 입력을 시작할 수 없습니다.');
      return;
    }
    if (!transcribeSupported) {
      alert('이 브라우저는 실시간 음성 입력을 지원하지 않습니다. 아래 텍스트 입력을 사용해주세요.');
      return;
    }

    try {
      const streamConfig = await api.transcribeStreamUrl({
        user_id: userInfo.userId,
        session_id: apiSessionRef.current?.session_id
      });

      const streamSession = new TranscribeStreamingSession({
        url: streamConfig.url,
        targetSampleRate: streamConfig.sample_rate,
        onOpen: () => {
          setVoiceError('');
        },
        onTranscript: (update) => {
          streamingTranscriptRef.current = update.transcript;
          setStreamingTranscript(update.transcript);
        },
        onError: (message) => {
          console.error('실시간 음성 인식 오류:', message);
          setVoiceError('실시간 음성 인식 연결에 문제가 생겼습니다. 다시 시도하거나 텍스트로 입력해주세요.');
        }
      });

      streamingSessionRef.current = streamSession;
      recordingModeRef.current = 'streaming';
      streamingTranscriptRef.current = '';
      setStreamingTranscript('');
      setVoiceError('');
      await streamSession.start();
      setIsRecording(true);
    } catch (error) {
      console.error('실시간 음성 인식 시작 실패:', error);
      streamingSessionRef.current?.abort();
      streamingSessionRef.current = null;
      recordingModeRef.current = null;
      setIsRecording(false);
      setVoiceError('실시간 음성 인식을 시작하지 못했습니다. 마이크 권한과 네트워크 상태를 확인해주세요.');
    }
  };

  const stopTranscribeRecording = async () => {
    const streamSession = streamingSessionRef.current;
    if (!streamSession) return;

    setIsRecording(false);
    setIsTranscribing(true);
    setVoiceError('');
    try {
      const transcript = (await streamSession.stop()).trim();
      const text = transcript || streamingTranscriptRef.current.trim();
      if (!text) {
        setVoiceError('인식된 음성이 없습니다. 다시 말씀하시거나 직접 입력해주세요.');
        return;
      }
      lastSentRef.current = text;
      setStreamingTranscript('');
      streamingTranscriptRef.current = '';
      sendMessageWithText(text);
    } catch (error) {
      console.error('실시간 음성 인식 종료 실패:', error);
      setVoiceError('음성 인식을 종료하는 중 문제가 생겼습니다. 다시 시도해주세요.');
    } finally {
      streamingSessionRef.current = null;
      recordingModeRef.current = null;
      setIsTranscribing(false);
    }
  };

  // 음성 인식 시작/중지
  const toggleRecording = () => {
    if (isTranscribing) return;

    if (!speechSupported && !transcribeSupported) {
      alert('이 브라우저는 음성 입력을 지원하지 않습니다. 아래 텍스트 입력을 사용해주세요.');
      return;
    }

    if (recognitionActiveRef.current || isRecording) {
      if (recordingModeRef.current === 'streaming') {
        void stopTranscribeRecording();
        return;
      }

      if (!recognitionRef.current) return;
      recognitionRef.current.stop();
      const pendingText = latestTranscriptRef.current.trim();
      if (pendingText) {
        lastSentRef.current = pendingText;
        latestTranscriptRef.current = '';
        sendMessageWithText(pendingText);
      }
      setIsRecording(false);
      setInterimTranscript('');
      if (silenceTimerRef.current) {
        window.clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } else {
      if (transcribeSupported) {
        void startTranscribeRecording();
        return;
      }

      if (speechSupported && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          return;
        } catch (err: any) {
          if (err?.name !== 'InvalidStateError') {
            console.error('음성 인식 시작 실패:', err);
            setVoiceError('브라우저 음성 인식 시작에 실패해 실시간 음성 인식으로 전환합니다.');
            setSpeechSupported(false);
          }
        }
      }
      startTranscribeRecording();
    }
  };

  // 텍스트를 음성으로 변환 (API 오디오 우선 사용)
  const speakText = (text: string, audioUrl?: string) => {
    // 기존 음성 중지
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    setIsSpeaking(true);

    // API에서 제공한 오디오 URL이 있으면 우선 사용
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        currentAudioRef.current = null;
      };
      
      audio.onerror = () => {
        console.warn('API 오디오 재생 실패, TTS로 대체');
        setIsSpeaking(false);
        currentAudioRef.current = null;
        // TTS로 대체
        speakWithTTS(text);
      };
      
      audio.play().catch(() => {
        console.warn('API 오디오 재생 실패, TTS로 대체');
        setIsSpeaking(false);
        currentAudioRef.current = null;
        speakWithTTS(text);
      });
    } else {
      // API 오디오가 없으면 브라우저 TTS 사용
      speakWithTTS(text);
    }
  };

  // 브라우저 TTS 사용
  const speakWithTTS = (text: string) => {
    if (!synthRef.current || typeof window.SpeechSynthesisUtterance === 'undefined') {
      setIsSpeaking(false);
      return;
    }

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.7;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    synthRef.current.speak(utterance);
  };

  // 음성 재생 중지
  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setIsSpeaking(false);
  };

  const sendMessageWithText = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setVoiceError('');

    // 사용자 메시지 추가
    const userMessage: Message = {
      id: Date.now(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    setIsLoading(true);

    try {
      let response;
      let session = apiSessionRef.current || apiSession;
      if (!session) {
        session = await startSession();
        if (session) {
          setApiSession(session);
          apiSessionRef.current = session;
          setIsDemoMode(false);
        }
      }
      if (!session) {
        throw new Error('API 세션을 시작할 수 없습니다');
      }
      response = await sendTurn(session, text.trim());
      if (!response) {
        // 세션이 만료됐을 수 있으니 재시도
        const retrySession = await startSession();
        if (retrySession) {
          setApiSession(retrySession);
          apiSessionRef.current = retrySession;
          response = await sendTurn(retrySession, text.trim());
        }
      }

      if (response) {
        setCurrentBotResponse(response.text);
        
        // 음성 재생
        setTimeout(() => {
          speakText(response.text, response.audioUrl);
        }, 500);
        
        const botMessage: Message = {
          id: Date.now() + 1,
          text: response.text,
          sender: 'bot',
          timestamp: new Date(),
          audioUrl: response.audioUrl,
          tags: response.tags
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error('응답을 받을 수 없습니다');
      }
      
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      const errorMessage = '죄송합니다. 잠시 후 다시 시도해주세요.';
      setCurrentBotResponse(errorMessage);
      
      const errorMsg: Message = {
        id: Date.now() + 1,
        text: errorMessage,
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = textInput.trim();
    if (!text || isLoading || isTranscribing) return;
    setTextInput('');
    sendMessageWithText(text);
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Layout>
      <div className="h-full flex flex-col">
        {/* 헤더 */}
          <div className="flex items-center p-5 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={async () => {
              // 세션 종료 후 뒤로가기
              if (apiSession) {
                await endSession();
              }
              // 활동 세션 종료
              if (currentSessionId) {
                endActivitySession(currentSessionId, undefined, { messageCount: messages.length });
              }
              onBack();
            }}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all mr-3"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 10H5M5 10L8 7M5 10L8 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-lg font-semibold text-gray-800">AI 친구와 대화</h2>
            <p className="text-sm text-gray-600">
              {apiSession ? '실시간 AI 상담' : (isDemoMode ? '연결 실패' : '연결 중')} - 마음을 편하게 나눠보세요
            </p>
          </div>
          <div className="w-8"></div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50 relative">
          {/* 캐릭터 영역 */}
          <div className="bg-gradient-to-b from-blue-50 to-transparent pb-6 mb-4">
            <div className="flex justify-center pt-6">
              <div className="relative">
                {/* 캐릭터 몸체 */}
                <div className={`relative w-28 h-28 transition-all duration-300 ${
                  isSpeaking ? 'animate-pulse scale-110' : (isLoading || isTranscribing) ? 'animate-bounce' : 'hover:scale-105'
                }`}>
                  {/* 메인 몸체 (노란 원) */}
                  <div className="w-full h-full bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full shadow-lg relative overflow-hidden">
                    
                    {/* 볏 (빨간 부분) */}
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="w-7 h-5 bg-gradient-to-b from-red-400 to-red-500 rounded-t-full"></div>
                      <div className="w-5 h-3 bg-gradient-to-b from-red-400 to-red-500 rounded-t-full absolute -right-2 top-1"></div>
                      <div className="w-3 h-2 bg-gradient-to-b from-red-400 to-red-500 rounded-t-full absolute -right-3 top-2"></div>
                    </div>
                    
                    {/* 눈 */}
                    <div className="absolute top-7 left-5">
                      <div className="w-5 h-5 bg-gray-800 rounded-full relative">
                        <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1 left-1"></div>
                      </div>
                    </div>
                    <div className="absolute top-7 right-5">
                      <div className="w-5 h-5 bg-gray-800 rounded-full relative">
                        <div className="w-1.5 h-1.5 bg-white rounded-full absolute top-1 left-1"></div>
                      </div>
                    </div>
                    
                    {/* 부리 */}
                    <div className="absolute top-10 left-1/2 transform -translate-x-1/2">
                      <div className="w-2.5 h-1.5 bg-gradient-to-b from-orange-400 to-orange-500 rounded-full"></div>
                    </div>
                    
                    {/* 볼 */}
                    <div className="absolute top-9 left-2.5">
                      <div className="w-3 h-3 bg-pink-300 rounded-full opacity-60"></div>
                    </div>
                    <div className="absolute top-9 right-2.5">
                      <div className="w-3 h-3 bg-pink-300 rounded-full opacity-60"></div>
                    </div>
                    
                    {/* 날개 */}
                    <div className="absolute top-14 -left-1.5">
                      <div className="w-5 h-7 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full transform -rotate-12"></div>
                    </div>
                    <div className="absolute top-14 -right-1.5">
                      <div className="w-5 h-7 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full transform rotate-12"></div>
                    </div>
                    
                    {/* 발 */}
                    <div className="absolute -bottom-1.5 left-7">
                      <div className="w-2.5 h-1.5 bg-orange-400 rounded-full"></div>
                    </div>
                    <div className="absolute -bottom-1.5 right-7">
                      <div className="w-2.5 h-1.5 bg-orange-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
                
                {/* 상태 표시 (한줄) */}
                {(isSpeaking || isLoading || isRecording || isTranscribing) && (
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                    <div
                      className={`text-white text-xs px-2 py-1 rounded-full shadow-lg whitespace-nowrap ${
                        isSpeaking
                          ? 'bg-green-500 animate-pulse'
                          : isLoading
                          ? 'bg-blue-500'
                          : isTranscribing
                          ? 'bg-purple-500 animate-pulse'
                          : 'bg-red-500 animate-pulse'
                      }`}
                    >
                      {isSpeaking
                        ? '🗣️ 말하는 중'
                        : isLoading
                        ? '💭 생각 중'
                        : isTranscribing
                        ? '📝 변환 중'
                        : '👂 듣는 중'}
                    </div>
                  </div>
                )}
                
                {/* 음성 파형 애니메이션 */}
                {(isSpeaking || isRecording) && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full animate-pulse ${
                          isSpeaking ? 'bg-green-400' : 'bg-red-400'
                        }`}
                        style={{
                          height: `${Math.random() * 15 + 8}px`,
                          animationDelay: `${i * 0.1}s`,
                          animationDuration: '0.5s'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* 캐릭터 인사말 */}
            <div className="text-center mt-4 px-6">
              <p className="text-sm text-gray-600 font-medium">
                안녕하세요! 저는 삐약이에요 🐥
              </p>
              <p className="text-xs text-gray-500 mt-1">
                편하게 대화해주세요!
              </p>
            </div>
          </div>

          {/* AI 응답 큰 글씨 표시 */}
          {currentBotResponse && (
            <div
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
              onClick={() => {
                setCurrentBotResponse('');
                if (!recognitionActiveRef.current && !isSpeaking && !isRecording && !isTranscribing && !isLoading) {
                  if (transcribeSupported) {
                    void startTranscribeRecording();
                    return;
                  }
                }
                if (speechSupported && recognitionRef.current && !recognitionActiveRef.current && !isSpeaking) {
                  try {
                    recognitionRef.current.start();
                  } catch (err: any) {
                    if (err?.name !== 'InvalidStateError') {
                      console.error('음성 인식 시작 실패:', err);
                    }
                  }
                }
              }}
            >
              <div className="bg-white rounded-3xl p-8 mx-4 max-w-4xl w-full shadow-2xl">
                <div className="text-center">
                  <div className="text-blue-500 text-lg font-semibold mb-6 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    AI 응답
                  </div>
                  <div className="text-4xl font-bold text-gray-800 leading-relaxed min-h-[6rem] flex items-center justify-center px-4">
                    {currentBotResponse}
                  </div>
                  <div className="text-sm text-gray-500 mt-6">
                    화면을 터치하면 닫힙니다
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 브라우저 음성 인식 텍스트 표시 */}
          {isRecording && recordingModeRef.current === 'browser' && interimTranscript && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
              <div className="bg-white rounded-3xl p-8 mx-4 max-w-2xl w-full shadow-2xl">
                <div className="text-center">
                  <div className="text-red-500 text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    음성 인식 중
                  </div>
                  <div className="text-3xl font-bold text-gray-800 leading-relaxed min-h-[4rem] flex items-center justify-center">
                    {interimTranscript || "말씀해주세요..."}
                  </div>
                  <div className="text-sm text-gray-500 mt-4">
                    말이 끝나면 자동으로 전송됩니다
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 대화 메시지들 */}
          <div className="px-4 pb-4 space-y-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md border ${
                  message.sender === 'user' 
                    ? 'bg-blue-500 text-white border-blue-400' 
                    : 'bg-white text-gray-800 border-gray-100'
                }`}>
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs opacity-70">{formatTime(message.timestamp)}</span>
                    {message.sender === 'bot' && (
                      <div className="flex items-center gap-1">
                        {/* 위험 힌트 표시 */}
                        {message.tags?.risk_hint && message.tags.risk_hint !== 'NONE' && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                            ⚠️
                          </span>
                        )}
                        <button
                          onClick={() => speakText(message.text, message.audioUrl)}
                          disabled={isSpeaking}
                          className={`ml-2 p-1.5 rounded-full transition-all ${
                            isSpeaking ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-500'
                          }`}
                          title="음성으로 듣기"
                        >
                          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                            <path d="M3 9V15C3 15.5523 3.44772 16 4 16H6L10 20V4L6 8H4C3.44772 8 3 8.44772 3 9Z" fill="currentColor"/>
                            <path d="M14 7C14 5.89543 13.1046 5 12 5V3C14.2091 3 16 4.79086 16 7V13C16 15.2091 14.2091 17 12 17V15C13.1046 15 14 14.1046 14 13V7Z" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-4 py-3 rounded-2xl shadow-md border border-gray-100">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 음성 입력 영역 */}
        <div className="p-5 bg-white border-t border-gray-200 flex-shrink-0">
          {isSpeaking && (
            <div className="flex justify-center mb-3">
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm rounded-full hover:bg-red-600 transition-all shadow-lg animate-pulse"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                  <rect x="6" y="4" width="8" height="12" rx="1" fill="currentColor"/>
                </svg>
                🔇 음성 중지
              </button>
            </div>
          )}

          {isRecording && recordingModeRef.current === 'streaming' && (
            <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-center">
              <p className="min-h-[1.5rem] text-sm text-gray-800">
                {streamingTranscript || '듣고 있어요. 천천히 말씀해주세요.'}
              </p>
            </div>
          )}
          
          <div className="flex justify-center items-center gap-6">
            {/* 마이크 버튼 */}
            {(speechSupported || transcribeSupported) ? (
              <button
                onClick={toggleRecording}
                className={`p-6 rounded-full transition-all shadow-xl ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse scale-110 shadow-red-200'
                    : 'bg-gradient-to-r from-green-400 to-green-600 text-white hover:from-green-500 hover:to-green-700 hover:scale-105 shadow-green-200'
                }`}
                disabled={isLoading || isTranscribing}
                title={isRecording ? "🛑 음성 인식 중지 (다시 클릭)" : "🎤 음성으로 말하기"}
              >
                {isRecording ? (
                  <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                    <rect x="6" y="6" width="8" height="8" rx="1" fill="currentColor"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                    <path d="M10 1C8.34315 1 7 2.34315 7 4V10C7 11.6569 8.34315 13 10 13C11.6569 13 13 11.6569 13 10V4C13 2.34315 11.6569 1 10 1Z" fill="currentColor"/>
                    <path d="M5 8C5.55228 8 6 8.44772 6 9V10C6 13.3137 8.68629 16 12 16H14C14.5523 16 15 16.4477 15 17C15 17.5523 14.5523 18 14 18H12C7.58172 18 4 14.4183 4 10V9C4 8.44772 4.44772 8 5 8Z" fill="currentColor"/>
                    <path d="M10 16V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-sm">음성 인식을 지원하지 않는 브라우저입니다</p>
              </div>
            )}
          </div>

          <form onSubmit={handleTextSubmit} className="mt-4 flex gap-2">
            <input
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              className="flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="음성 입력이 안 되면 직접 입력하세요"
              disabled={isLoading || isTranscribing}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isLoading || isTranscribing}
              className="rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              전송
            </button>
          </form>

          
          {/* 도움말 */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 font-medium">
              {isTranscribing ? (
                <span className="text-purple-600">📝 음성 인식 결과를 정리하는 중입니다</span>
              ) : isRecording ? (
                <span className="text-red-600">
                  {recordingModeRef.current === 'streaming'
                    ? '🎤 실시간 인식 중입니다. 마이크 버튼을 다시 누르면 전송합니다'
                    : '🎤 말씀하시면 실시간으로 인식됩니다 (마이크 버튼으로 중지 가능)'}
                </span>
              ) : isSpeaking ? (
                <span className="text-green-600">🗣️ 삐약이가 응답 중입니다</span>
              ) : (
                <span>🗣️ 마이크 버튼을 눌러 음성으로 대화해보세요</span>
              )}
            </p>
            {isRecording && (
              <p className="text-xs text-red-500 mt-1 animate-pulse">
                💡 마이크 버튼을 다시 누르면 음성 인식이 중지됩니다
              </p>
            )}
            {voiceError && (
              <p className="text-xs text-amber-600 mt-2">
                {voiceError}
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
