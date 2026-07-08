import { useState, useEffect } from 'react';
import { useActivity } from '@/app/contexts/ActivityContext';
import { api } from '@/lib/api';
import Layout from './Layout';

interface HomePageProps {
  userInfo: { name: string; id: string; userId?: string };
  onBack: () => void;
  onChatbot: () => void;
  onBrainGame: () => void;
  onSettings: () => void;
}

interface DiagnosisQuestion {
  id: number;
  question: string;
  options: { value: number; text: string }[];
}

const diagnosisQuestions: DiagnosisQuestion[] = [
  {
    id: 1,
    question: "오늘이 몇 월이고, 무슨 요일인지를 잘 모른다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 2,
    question: "자기가 놔둔 물건을 찾지 못한다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 3,
    question: "같은 질문을 반복해서 한다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 4,
    question: "약속을 하고서 잊어버린다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 5,
    question: "물건을 가지러 갔다가 잊어버리고 그냥 온다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 6,
    question: "물건이나, 사람의 이름을 대기가 힘들어 머뭇거린다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 7,
    question: "대화 중 내용이 이해되지 않아 반복해서 물어 본다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 8,
    question: "길을 잃거나 헤맨 적이 있다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 9,
    question: "예전에 비해서 계산 능력이 떨어졌다. (예: 물건값이나 거스름돈 계산을 못한다)",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 10,
    question: "예전에 비해 성격이 변했다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 11,
    question: "이전에 잘 다루던 기구의 사용이 서툴러 졌다. (세탁기, 전기 밥솥, 경운기 등)",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 12,
    question: "예전에 비해 방이나 집안의 정리정돈을 하지 못한다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 13,
    question: "상황에 맞게 스스로 옷을 선택하여 입지 못한다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 14,
    question: "혼자 대중교통 수단을 이용하여 목적지에 가기 힘들다. (신체적 문제, 관절염 등 제외)",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  },
  {
    id: 15,
    question: "내복이나 옷이 더러워져도 갈아입지 않으려고 한다.",
    options: [
      { value: 0, text: "아니다" },
      { value: 1, text: "가끔" },
      { value: 2, text: "자주" }
    ]
  }
];

export default function HomePage({ userInfo, onBack, onChatbot, onBrainGame, onSettings }: HomePageProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [fontSize] = useState<'normal' | 'large'>('large');
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const { addDiagnosisResult } = useActivity();

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getCurrentDate = () => {
    const year = currentTime.getFullYear();
    const month = currentTime.getMonth() + 1;
    const date = currentTime.getDate();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayName = days[currentTime.getDay()];
    
    return `${year}년 ${month}월 ${date}일 ${dayName}`;
  };

  const startDiagnosis = () => {
    setShowDiagnosis(true);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
  };

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (currentQuestion < diagnosisQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 자가 점검 완료 - 결과를 ActivityContext에 저장
      const totalScore = newAnswers.reduce((sum, answer) => sum + answer, 0);
      addDiagnosisResult(totalScore, newAnswers);
      if (userInfo.userId) {
        const binaryAnswers = newAnswers.map((v) => (v > 0 ? 1 : 0));
        api.selfAssessment(userInfo.userId, binaryAnswers).catch(() => {});
      }
      setShowResult(true);
    }
  };

  const resetDiagnosis = () => {
    setShowDiagnosis(false);
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
  };

  const restartDiagnosis = () => {
    setCurrentQuestion(0);
    setAnswers([]);
    setShowResult(false);
  };

  const getTotalScore = () => {
    return answers.reduce((sum, answer) => sum + answer, 0);
  };

  const getResultMessage = () => {
    const score = getTotalScore();
    if (score <= 5) {
      return {
        emoji: "🧑🏻‍💼",
        message: "자가 점검 결과가 안정적으로 보입니다. 활기찬 생활을 이어가고 계시네요.",
        recommendations: [
          "현재 상태를 유지하세요",
          "새로운 취미 활동 도전",
          "사회적 활동 지속",
          "규칙적인 운동 계속"
        ],
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-700"
      };
    } else if (score <= 16) {
      return {
        emoji: "👴🏻",
        message: "일상에서 자연스러운 변화가 있을 수 있습니다. 건강한 생활 리듬을 유지해보세요.",
        recommendations: [
          "규칙적인 두뇌 훈련",
          "주 3회 이상 운동",
          "충분한 수면 (7-8시간)",
          "균형 잡힌 식사"
        ],
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
        textColor: "text-blue-700"
      };
    } else {
      return {
        emoji: "👵🏻",
        message: "일부 변화 신호가 관찰됩니다. 보호자와 함께 생활 패턴을 확인해보세요.",
        recommendations: [
          "전문의 상담 권장",
          "가족과 함께 활동",
          "인지 훈련 프로그램 참여",
          "정기적인 건강 검진"
        ],
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        textColor: "text-orange-700"
      };
    }
  };

  const fontSizeClasses = {
    normal: 'text-base',
    large: 'text-lg'
  };

  const titleSizeClasses = {
    normal: 'text-3xl',
    large: 'text-4xl'
  };

  const ChatIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="white" fillOpacity="0.9"/>
      <path d="M12 16C12 13.7909 13.7909 12 16 12H24C26.2091 12 28 13.7909 28 16V20C28 22.2091 26.2091 24 24 24H18L14 28V20C14 18.8954 13.1046 18 12 18V16Z" fill="#667eea"/>
    </svg>
  );

  const GameIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="white" fillOpacity="0.9"/>
      <rect x="10" y="14" width="20" height="12" rx="2" fill="#52c41a"/>
      <circle cx="14" cy="18" r="1.5" fill="white"/>
      <circle cx="18" cy="18" r="1.5" fill="white"/>
      <rect x="22" y="16" width="2" height="2" fill="white"/>
      <rect x="25" y="16" width="2" height="2" fill="white"/>
    </svg>
  );

  const DiagnosisIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="20" fill="white" fillOpacity="0.9"/>
      <path d="M20 8C15.6 8 12 11.6 12 16C12 20.4 15.6 24 20 24C24.4 24 28 20.4 28 16C28 11.6 24.4 8 20 8ZM20 22C16.7 22 14 19.3 14 16C14 12.7 16.7 10 20 10C23.3 10 26 12.7 26 16C26 19.3 23.3 22 20 22Z" fill="#f59e0b"/>
      <path d="M20 12C18.9 12 18 12.9 18 14C18 15.1 18.9 16 20 16C21.1 16 22 15.1 22 14C22 12.9 21.1 12 20 12Z" fill="#f59e0b"/>
      <rect x="19" y="17" width="2" height="5" fill="#f59e0b"/>
      <path d="M12 28H28C29.1 28 30 28.9 30 30C30 31.1 29.1 32 28 32H12C10.9 32 10 31.1 10 30C10 28.9 10.9 28 12 28Z" fill="#f59e0b"/>
    </svg>
  );

  return (
    <Layout isUserMode={true}>
      <div className="h-full flex flex-col">
        {/* 헤더 - 단색 파란색 배경 */}
        <div className="bg-blue-500 text-white p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={onBack}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 2.5C11.375 2.5 12.5 3.625 12.5 5C12.5 6.375 11.375 7.5 10 7.5C8.625 7.5 7.5 6.375 7.5 5C7.5 3.625 8.625 2.5 10 2.5ZM10 15C12.875 15 17.25 16.625 17.5 17.5H2.5C2.75 16.625 7.125 15 10 15ZM10 10C12.75 10 17.5 12.25 17.5 15V17.5H2.5V15C2.5 12.25 7.25 10 10 10Z" fill="white"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className={`${titleSizeClasses[fontSize]} font-light text-white mb-1`}>
                      안녕하세요,
                    </h1>
                    <h2 className={`${titleSizeClasses[fontSize]} font-bold text-white`}>
                      {userInfo?.name || '사용자'}님
                    </h2>
                  </div>
                </div>
              </div>
              <p className={`${fontSizeClasses[fontSize]} text-white/90 ml-12`}>
                오늘도 함께 건강한 하루를 보내요
              </p>
              <p className="text-sm text-white/80 ml-12">
                {getCurrentDate()}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {/* 설정 버튼 */}
              <button
                onClick={onSettings}
                className="flex items-center gap-2 px-4 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition-all text-sm font-medium"
                title="설정"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16.25 10C16.25 10.625 16.125 11.25 15.875 11.875L17.5 13.125C17.625 13.25 17.625 13.5 17.5 13.625L15.875 16.375C15.75 16.5 15.5 16.5 15.375 16.375L13.625 15.125C13 15.375 12.375 15.5 11.75 15.5V17.5C11.75 17.625 11.625 17.75 11.5 17.75H8.5C8.375 17.75 8.25 17.625 8.25 17.5V15.5C7.625 15.5 7 15.375 6.375 15.125L4.625 16.375C4.5 16.5 4.25 16.5 4.125 16.375L2.5 13.625C2.375 13.5 2.375 13.25 2.5 13.125L4.125 11.875C3.875 11.25 3.75 10.625 3.75 10C3.75 9.375 3.875 8.75 4.125 8.125L2.5 6.875C2.375 6.75 2.375 6.5 2.5 6.375L4.125 3.625C4.25 3.5 4.5 3.5 4.625 3.625L6.375 4.875C7 4.625 7.625 4.5 8.25 4.5V2.5C8.25 2.375 8.375 2.25 8.5 2.25H11.5C11.625 2.25 11.75 2.375 11.75 2.5V4.5C12.375 4.5 13 4.625 13.625 4.875L15.375 3.625C15.5 3.5 15.75 3.5 15.875 3.625L17.5 6.375C17.625 6.5 17.625 6.75 17.5 6.875L15.875 8.125C16.125 8.75 16.25 9.375 16.25 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>설정</span>
              </button>
            </div>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 기능 카드들 */}
          <div className="space-y-6 mb-6">
            {/* AI 챗봇 카드 - 핑크색 파스텔 톤 */}
            <div
              onClick={onChatbot}
              className="bg-pink-50 rounded-2xl p-6 text-gray-700 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-5 border border-pink-300"
            >
              <div className="flex-shrink-0">
                <ChatIcon />
              </div>
              <div className="flex-1">
                <h3 className={`${fontSize === 'large' ? 'text-2xl' : 'text-xl'} font-bold mb-2`}>
                  AI 친구와 대화하기
                </h3>
                <p className={`${fontSizeClasses[fontSize]} opacity-90 mb-1`}>
                  오늘 기분은 어떠세요?
                </p>
                <p className={`${fontSizeClasses[fontSize]} opacity-90`}>
                  편하게 이야기 나눠요
                </p>
              </div>
            </div>

            {/* 자가진단 카드 - 주황색 파스텔 톤 */}
            <div
              onClick={startDiagnosis}
              className="bg-orange-50 rounded-2xl p-6 text-gray-700 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-5 border border-orange-300"
            >
              <div className="flex-shrink-0">
                <DiagnosisIcon />
              </div>
              <div className="flex-1">
                <h3 className={`${fontSize === 'large' ? 'text-2xl' : 'text-xl'} font-bold mb-2`}>
                  자가 점검
                </h3>
                <p className={`${fontSizeClasses[fontSize]} opacity-90 mb-1`}>
                  15개 간단한 질문으로
                </p>
                <p className={`${fontSizeClasses[fontSize]} opacity-90`}>
                  생활 변화 신호를 확인해보세요
                </p>
              </div>
            </div>

            {/* 두뇌 훈련 게임 카드 - 초록색 파스텔 톤 */}
            <div
              onClick={onBrainGame}
              className="bg-green-50 rounded-2xl p-6 text-gray-700 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-5 border border-green-300"
            >
              <div className="flex-shrink-0">
                <GameIcon />
              </div>
              <div className="flex-1">
                <h3 className={`${fontSize === 'large' ? 'text-2xl' : 'text-xl'} font-bold mb-2`}>
                  두뇌 훈련 게임
                </h3>
                <p className={`${fontSizeClasses[fontSize]} opacity-90 mb-1`}>
                  재미있는 게임으로
                </p>
                <p className={`${fontSizeClasses[fontSize]} opacity-90`}>
                  기억력을 키워요
                </p>
              </div>
            </div>
          </div>

        {/* 자가 점검 모달 */}
        {showDiagnosis && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-[562px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 h-[95vh] max-h-[900px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-8">
                {!showResult ? (
                  <>
                    {/* 자가 점검 진행 중 */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-bold text-gray-800">자가 점검</h3>
                        <button
                          onClick={resetDiagnosis}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                        >
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-yellow-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentQuestion + 1) / diagnosisQuestions.length) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-base text-gray-600 mb-8">
                        질문 {currentQuestion + 1} / {diagnosisQuestions.length}
                      </p>
                    </div>

                    <div className="mb-8">
                      <h4 className="text-2xl font-semibold text-gray-800 mb-8 leading-relaxed">
                        {diagnosisQuestions[currentQuestion].question}
                      </h4>
                      <div className="space-y-3">
                        {diagnosisQuestions[currentQuestion].options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleAnswer(option.value)}
                            className="w-full p-6 text-left bg-gray-50 hover:bg-gradient-to-r hover:from-orange-50 hover:to-yellow-50 rounded-xl border border-gray-200 hover:border-orange-200 transition-all duration-200"
                          >
                            <span className="text-gray-800 font-medium text-lg">{option.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* 자가 점검 결과 */}
                    <div className="flex flex-col h-full">
                      <div className="flex-[0.8]"></div>
                      <div className="text-center mb-6 flex flex-col items-center justify-center">
                        <div className="text-9xl mb-8">
                          {getResultMessage().emoji}
                        </div>
                        <p className="text-xl text-gray-700 leading-relaxed max-w-sm mx-auto">
                          {getResultMessage().message}
                        </p>
                      </div>
                      
                      <div className={`${getResultMessage().bgColor} ${getResultMessage().borderColor} border rounded-xl p-6 mb-6`}>
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2 ${getResultMessage().textColor}">
                          💡 추천 활동
                        </h4>
                        <ul className={`space-y-2 ${getResultMessage().textColor}`}>
                          {getResultMessage().recommendations.map((rec, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-sm mt-1">•</span>
                              <span className="text-sm leading-relaxed">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-3 mt-auto">
                        <button
                          onClick={restartDiagnosis}
                          className="flex-1 py-4 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all text-lg"
                        >
                          다시 점검
                        </button>
                        <button
                          onClick={resetDiagnosis}
                          className="flex-1 py-4 px-6 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-medium hover:shadow-lg transition-all text-lg"
                        >
                          확인
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

          {/* 하단 메시지 */}
          <div className="text-center py-6 border-t border-gray-100 mt-6">
            <p className={`${fontSizeClasses[fontSize]} text-gray-500`}>
              천천히, 편안하게 사용하세요
            </p>
          </div>

          {/* 오늘의 건강 정보 섹션 */}
          <div className="mt-4">
            <h3 className={`${fontSize === 'large' ? 'text-2xl' : 'text-xl'} font-semibold text-gray-800 mb-4 px-2`}>뇌 건강 생활 정보</h3>
            <div className="space-y-4 max-h-48 overflow-y-auto">
              {/* 기사 1 - 치매 예방 운동 */}
              <a 
                href="https://www.hidoc.co.kr/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className={`${fontSize === 'large' ? 'text-xl' : 'text-lg'} font-semibold text-gray-800 mb-3`}>규칙적인 운동으로 치매 예방하기</h4>
                    <p className={`${fontSize === 'large' ? 'text-lg' : 'text-base'} text-gray-600 leading-relaxed mb-3`}>주 3회 이상 30분 운동으로 뇌 혈류량 증가, 인지기능 향상에 도움</p>
                    <p className={`${fontSize === 'large' ? 'text-lg' : 'text-base'} text-blue-600 font-medium`}>하이닥 건강정보</p>
                  </div>
                </div>
              </a>

              {/* 기사 2 - 치매 예방 식습관 */}
              <a 
                href="https://www.amc.seoul.kr/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className={`${fontSize === 'large' ? 'text-xl' : 'text-lg'} font-semibold text-gray-800 mb-3`}>뇌 건강에 좋은 음식과 식습관</h4>
                    <p className={`${fontSize === 'large' ? 'text-lg' : 'text-base'} text-gray-600 leading-relaxed mb-3`}>오메가3, 항산화 성분이 풍부한 음식으로 치매 위험 40% 감소</p>
                    <p className={`${fontSize === 'large' ? 'text-lg' : 'text-base'} text-green-600 font-medium`}>서울아산병원</p>
                  </div>
                </div>
              </a>

              {/* 기사 3 - 치매 예방 두뇌 활동 */}
              <a 
                href="https://www.snuh.org/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className={`${fontSize === 'large' ? 'text-xl' : 'text-lg'} font-semibold text-gray-800 mb-3`}>두뇌 훈련 게임의 치매 예방 효과</h4>
                    <p className={`${fontSize === 'large' ? 'text-lg' : 'text-base'} text-gray-600 leading-relaxed mb-3`}>매일 15분 두뇌 게임으로 기억력, 집중력, 문제해결 능력 향상</p>
                    <p className={`${fontSize === 'large' ? 'text-lg' : 'text-base'} text-purple-600 font-medium`}>서울대학교병원</p>
                  </div>
                </div>
              </a>

              {/* 기사 4 - 치매 예방 수면 */}
              <a 
                href="https://www.samsunghospital.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-5 border border-orange-100 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className={`${fontSize === 'large' ? 'text-xl' : 'text-lg'} font-semibold text-gray-800 mb-3`}>충분한 수면이 치매 예방의 핵심</h4>
                    <p className={`${fontSize === 'large' ? 'text-lg' : 'text-base'} text-gray-600 leading-relaxed mb-3`}>하루 7-8시간 양질의 수면으로 뇌 독소 제거, 기억 정리 효과</p>
                    <p className={`${fontSize === 'large' ? 'text-lg' : 'text-base'} text-orange-600 font-medium`}>삼성서울병원</p>
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
