import { useState, useEffect } from 'react';
import { useActivity } from '@/app/contexts/ActivityContext';
import Layout from './Layout';
import { api } from '@/lib/api';

interface GuardianDashboardProps {
  userInfo: { name: string; id: string; userId?: string };
  onBack: () => void;
  onLogout: () => void;
}

// interface ActivityData {
//   date: string;
//   chatSessions: number;
//   gamesSessions: number;
//   totalTime: number; // 분 단위
//   diagnosisScore?: number;
// }

// interface GameStats {
//   cardMatching: { played: number; avgScore: number; bestScore: number };
//   numberSequence: { played: number; avgScore: number; bestScore: number };
//   mathGame: { played: number; avgScore: number; bestScore: number };
//   colorGame: { played: number; avgScore: number; bestScore: number };
//   kiroPuzzle: { played: number; avgScore: number; bestScore: number };
// }

export default function GuardianDashboard({ userInfo, onBack, onLogout }: GuardianDashboardProps) {
  const [fontSize] = useState<'normal' | 'large'>('large');
  const [selectedPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [showKdsqDetails, setShowKdsqDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const { getWeeklyStats } = useActivity();
  const [weeklyStats, setWeeklyStats] = useState<any | null>(null);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      if (!userInfo.userId) return;
      try {
        const [sessionData, weeklyData] = await Promise.all([
          api.listSessions(userInfo.userId),
          api.weeklyActivity(userInfo.userId)
        ]);
        setSessions(sessionData.items || []);
        setWeeklyStats(weeklyData);
      } catch (err) {
        // fallback to local stats only
        setWeeklyStats(getWeeklyStats());
      }
    };
    loadSessions();
  }, [userInfo.userId]);

  const getCurrentDate = () => {
    const year = currentTime.getFullYear();
    const month = currentTime.getMonth() + 1;
    const date = currentTime.getDate();
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayName = days[currentTime.getDay()];
    
    return `${year}년 ${month}월 ${date}일 ${dayName}`;
  };

  const fontSizeClasses = {
    normal: 'text-base',
    large: 'text-lg'
  };

  const titleSizeClasses = {
    normal: 'text-2xl',
    large: 'text-3xl'
  };

  const getHealthStatus = () => {
    const score = weeklyStats?.kdsq_score_total;
    if (score === undefined || score === null) return null;
    if (score <= 2) {
      return { status: '양호', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    } else if (score <= 5) {
      return { status: '주의 관찰', color: 'text-yellow-700', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' };
    } else if (score <= 8) {
      return { status: '주의 필요', color: 'text-orange-700', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    } else {
      return { status: '변화 신호', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' };
    }
  };

  const getRecommendations = () => {
    const score = weeklyStats?.kdsq_score_total;
    const items: string[] = [];

    if (score === undefined || score === null) {
      items.push("최근 7일 KDSQ 응답이 충분하지 않아 추가 확인을 권장합니다.");
    } else if (score <= 2) {
      items.push("현재 상태가 안정적으로 보이며 현재 생활 패턴을 유지하는 것이 좋습니다.");
      items.push("가벼운 두뇌 활동과 일상 대화를 계속 이어가 주세요.");
    } else if (score <= 5) {
      items.push("일상 리듬을 유지하면서 사회적 교류를 조금 더 늘려보세요.");
      items.push("간단한 기억력 게임이나 회상 대화를 추천합니다.");
    } else if (score <= 8) {
      items.push("인지 변화 신호가 관찰되어 규칙적인 생활과 활동 강화가 필요합니다.");
      items.push("가족과의 대화, 일정 정리, 가벼운 걷기 활동을 권장합니다.");
    } else {
      items.push("인지 변화 신호가 뚜렷하므로 보호자 추가 확인이 필요합니다.");
      items.push("전문가 상담을 고려하고 생활 지원을 강화해 주세요.");
    }

    if (stats.avgDailyTime < 30) {
      items.push("일일 활동 시간을 30분 이상으로 늘려보시는 것을 권장합니다.");
    }

    return items;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[date.getDay()];
    return `${month}/${day}(${dayName})`;
  };

  const stats = weeklyStats
    ? {
        totalTime: weeklyStats.total_time_min ?? weeklyStats.totalTime ?? 0,
        avgDailyTime: weeklyStats.avg_daily_time_min ?? weeklyStats.avgDailyTime ?? 0,
        totalChatSessions: weeklyStats.total_chat_sessions ?? weeklyStats.totalChatSessions ?? 0,
        totalGameSessions: weeklyStats.total_game_sessions ?? weeklyStats.totalGameSessions ?? 0,
        gameStats: weeklyStats.game_stats ?? weeklyStats.gameStats ?? {},
        dailyActivities: weeklyStats.daily_activities ?? weeklyStats.dailyActivities ?? [],
        latestDiagnosis: weeklyStats.latest_diagnosis ?? weeklyStats.latestDiagnosis,
        recentDiagnosisResults: weeklyStats.recentDiagnosisResults,
        kdsqConcernExamples: weeklyStats.kdsq_concern_examples ?? [],
        kdsqResponses: weeklyStats.kdsq_responses ?? []
      }
    : getWeeklyStats();
  const healthStatus = getHealthStatus();
  const latestSession = sessions[0];
  const diagnosisTrend = stats.recentDiagnosisResults
    ? stats.recentDiagnosisResults.map((r: any) => ({
        date: r.date instanceof Date ? r.date : new Date(r.date),
        score: r.score
      }))
    : (stats.dailyActivities || [])
        .filter((d: any) => d.diagnosisScore !== undefined)
        .map((d: any) => ({ date: new Date(d.date), score: d.diagnosisScore }));

  return (
    <Layout isGuardianMode={true}>
      <div className="h-full flex flex-col">
        {/* 헤더 - 초록색 배경 */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
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
                  <h1 className={`${titleSizeClasses[fontSize]} font-bold text-white`}>
                    보호자 대시보드
                  </h1>
                </div>
              </div>
              <p className={`${fontSizeClasses[fontSize]} text-white/90 ml-12`}>
                {userInfo?.name || '사용자'}님의 활동 통계
              </p>
              <p className="text-sm text-white/80 ml-12">
                {getCurrentDate()}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {/* 로그아웃 버튼 */}
              <button
                onClick={onLogout}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M9 3H4C3.44772 3 3 3.44772 3 4V16C3 16.5523 3.44772 17 4 17H9M13 7L17 11M17 11L13 15M17 11H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
            </div>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* 종합 소견 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              🩺 종합 소견
            </h3>
          <div className="space-y-4">
            {healthStatus && (
              <div className={`${healthStatus.bgColor} ${healthStatus.borderColor} border rounded-lg p-6`}>
                <div className="text-sm text-gray-600 mb-2">현재 인지 상태</div>
                <div className={`text-3xl font-extrabold ${healthStatus.color}`}>
                  {healthStatus.status}
                </div>
                {weeklyStats?.kdsq_score_total !== undefined && (
                  <div className="text-sm text-gray-600 mt-2">
                    KDSQ 우려 응답 수: {weeklyStats.kdsq_score_total}
                  </div>
                )}
              </div>
            )}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-800 flex items-center gap-2">
                    🧠 KDSQ 7일 분석
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    우려 응답 {weeklyStats?.kdsq_score_total ?? 0}회
                  </p>
                </div>
                <button
                  onClick={() => setShowKdsqDetails((prev) => !prev)}
                  className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  {showKdsqDetails ? '닫기' : '자세히'}
                </button>
              </div>
              {showKdsqDetails && (
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                  {stats.kdsqConcernExamples && stats.kdsqConcernExamples.length > 0 ? (
                    stats.kdsqConcernExamples.map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="font-medium">Q. {item.question}</div>
                        <div className="mt-1">A. {item.answer}</div>
                      </div>
                    ))
                  ) : (
                    (stats.kdsqResponses || []).slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3">
                        <div className="font-medium">Q. {item.question || '질문'}</div>
                        <div className="mt-1">A. {item.answer || '응답 없음'}</div>
                      </div>
                    ))
                  )}
                  {(!stats.kdsqConcernExamples || stats.kdsqConcernExamples.length === 0) &&
                    (!stats.kdsqResponses || stats.kdsqResponses.length === 0) && (
                      <div className="text-gray-500">우려 응답이 없습니다.</div>
                    )}
                </div>
              )}
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <h4 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                📋 자가진단 주간 추이
              </h4>
              {diagnosisTrend.length > 0 ? (
                <div className="space-y-4">
                  {/* 그래프 영역 */}
                  <div className="relative h-40 bg-white rounded-lg border border-purple-200 p-4">
                    {/* 막대 그래프 */}
                    <div className="h-full flex items-end justify-between px-4">
                      {Array.from({ length: 7 }, (_, index) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - index));
                        const dateStr = date.toISOString().split('T')[0];
                        
                        // 해당 날짜의 진단 결과 찾기
                        const diagnosisResult = diagnosisTrend.find((result: any) =>
                          result.date.toISOString().split('T')[0] === dateStr
                        );
                        
                        const score = diagnosisResult?.score || 0;
                        const hasData = !!diagnosisResult;
                        
                        // 높이를 30점 기준으로 계산 (최소 높이 8px)
                        const barHeight = hasData ? Math.max((score / 30) * 100, 3) : 0;
                        
                        // 점수에 따른 색상 결정 (더 세밀한 그라데이션)
                        let barColor = 'bg-gray-200';
                        let shadowColor = 'shadow-gray-200';
                        
                        if (hasData) {
                          if (score <= 5) {
                            barColor = 'bg-gradient-to-t from-green-500 to-green-400';
                            shadowColor = 'shadow-green-300';
                          } else if (score <= 10) {
                            barColor = 'bg-gradient-to-t from-emerald-500 to-emerald-400';
                            shadowColor = 'shadow-emerald-300';
                          } else if (score <= 16) {
                            barColor = 'bg-gradient-to-t from-blue-500 to-blue-400';
                            shadowColor = 'shadow-blue-300';
                          } else if (score <= 20) {
                            barColor = 'bg-gradient-to-t from-yellow-500 to-yellow-400';
                            shadowColor = 'shadow-yellow-300';
                          } else if (score <= 25) {
                            barColor = 'bg-gradient-to-t from-orange-500 to-orange-400';
                            shadowColor = 'shadow-orange-300';
                          } else {
                            barColor = 'bg-gradient-to-t from-red-500 to-red-400';
                            shadowColor = 'shadow-red-300';
                          }
                        }
                        
                        return (
                          <div key={dateStr} className="flex flex-col items-center flex-1 relative">
                            {/* 막대 */}
                            <div className="relative flex items-end justify-center w-full h-full">
                              {hasData && (
                                <>
                                  {/* 점수 표시 */}
                                  <div className="absolute -top-8 text-xs font-bold text-gray-700 bg-white px-2 py-1 rounded-md shadow-sm border z-10">
                                    {score}점
                                  </div>
                                  {/* 막대 */}
                                  <div 
                                    className={`w-8 rounded-t-lg transition-all duration-500 ease-out ${barColor} ${shadowColor} shadow-lg border border-white/20`}
                                    style={{ 
                                      height: `${barHeight}%`,
                                      minHeight: hasData ? '8px' : '0px'
                                    }}
                                  >
                                    {/* 막대 내부 하이라이트 효과 */}
                                    <div className="w-full h-full rounded-t-lg bg-gradient-to-r from-white/20 to-transparent"></div>
                                  </div>
                                </>
                              )}
                              {!hasData && (
                                <div className="w-8 h-2 bg-gray-200 rounded-full opacity-50"></div>
                              )}
                            </div>
                            
                            {/* 날짜 표시 */}
                            <div className="text-xs text-gray-600 mt-3 text-center">
                              <div className="font-medium">
                                {date.getMonth() + 1}/{date.getDate()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* 범례 */}
                  <div className="flex justify-center gap-3 text-xs flex-wrap">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gradient-to-t from-green-500 to-green-400 rounded"></div>
                      <span className="text-gray-600">우수 (0-5점)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded"></div>
                      <span className="text-gray-600">매우양호 (6-10점)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gradient-to-t from-blue-500 to-blue-400 rounded"></div>
                      <span className="text-gray-600">양호 (11-16점)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gradient-to-t from-yellow-500 to-yellow-400 rounded"></div>
                      <span className="text-gray-600">경미 (17-20점)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gradient-to-t from-orange-500 to-orange-400 rounded"></div>
                      <span className="text-gray-600">주의 (21-25점)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gradient-to-t from-red-500 to-red-400 rounded"></div>
                      <span className="text-gray-600">심각 (26-30점)</span>
                    </div>
                  </div>
                  
                  {/* 최근 진단 정보 */}
                  {weeklyStats?.latestDiagnosis && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">최근 진단:</span>
                        <span className="font-medium text-gray-800">
                          {weeklyStats.latestDiagnosis.date.toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric'
                          })} - {weeklyStats.latestDiagnosis.score}점
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        15개 문항에 대한 응답을 종합하여 산출된 점수입니다. 
                        정기적인 자가진단을 통해 인지 기능 변화를 모니터링하고 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📊</div>
                  <p className="text-sm">아직 자가진단 결과가 없습니다.</p>
                  <p className="text-xs text-gray-400 mt-1">자가진단을 완료하면 주간 추이를 확인할 수 있습니다.</p>
                </div>
              )}
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                💡 권장사항
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                {getRecommendations().map((rec, idx) => (
                  <p key={idx}>• {rec}</p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 주요 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* 총 활동 시간 */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">총 활동 시간</span>
              <span className="text-2xl">⏰</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalTime}분</div>
            <div className="text-sm opacity-90">일평균 {stats.avgDailyTime}분</div>
          </div>

          {/* AI 대화 세션 */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">AI 대화</span>
              <span className="text-2xl">💬</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalChatSessions}회</div>
            <div className="text-sm opacity-90">7일간 총 세션</div>
          </div>

          {/* 게임 세션 */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">두뇌 게임</span>
              <span className="text-2xl">🎮</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalGameSessions}회</div>
            <div className="text-sm opacity-90">7일간 총 세션</div>
          </div>
        </div>

        {/* 일별 활동 차트 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">일별 활동 현황</h3>
          <div className="space-y-3">
            {(stats.dailyActivities || []).map((day) => (
              <div key={day.date} className="flex items-center gap-4">
                <div className="w-16 text-sm text-gray-600 font-medium">
                  {formatDate(day.date)}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  {/* AI 대화 바 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">AI 대화</span>
                      <span className="text-xs text-gray-600">{day.chatSessions}회</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((day.chatSessions / 5) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  {/* 게임 바 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">게임</span>
                      <span className="text-xs text-gray-600">{day.gamesSessions}회</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((day.gamesSessions / 8) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  {/* 총 시간 */}
                  <div className="w-16 text-right">
                    <span className="text-sm font-medium text-gray-700">{day.totalTime}분</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </Layout>
  );
}
