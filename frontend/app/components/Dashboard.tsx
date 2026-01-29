import { useState, useEffect } from 'react';
import { BarChart3, Trophy, Target, TrendingUp, Calendar } from 'lucide-react';
import { getGameStats, initializeGameStats, GameStats } from '@/lib/gameStats';
import Layout from './Layout';

interface DashboardProps {
  userInfo: {
    name: string;
    id: string;
  };
  onBack: () => void;
}

export default function Dashboard({ userInfo, onBack }: DashboardProps) {
  const [gameStats, setGameStats] = useState<GameStats[]>([]);
  const [totalGamesPlayed, setTotalGamesPlayed] = useState(0);
  const [weeklyProgress, setWeeklyProgress] = useState(0);

  useEffect(() => {
    // 로컬 스토리지에서 게임 통계 불러오기
    loadGameStats();
  }, [userInfo.id]);

  const loadGameStats = () => {
    const stats = getGameStats(userInfo.id);
    
    if (stats.length === 0) {
      // 초기 데이터 설정
      const initialStats = initializeGameStats(userInfo.id);
      setGameStats(initialStats);
    } else {
      setGameStats(stats);
      
      const total = stats.reduce((sum: number, game: GameStats) => sum + game.totalPlayed, 0);
      setTotalGamesPlayed(total);
      
      // 이번 주 진행률 계산
      const thisWeekGames = stats.reduce((sum: number, game: GameStats) => {
        const lastPlayed = new Date(game.lastPlayed);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return lastPlayed > weekAgo ? sum + game.totalPlayed : sum;
      }, 0);
      setWeeklyProgress(Math.min(100, (thisWeekGames / 10) * 100)); // 주당 10게임 목표
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout>
      <div className="p-6 h-full flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              📊 나의 통계
            </h1>
            <p className="text-gray-600 text-sm">두뇌 훈련 진행 상황</p>
          </div>
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 10L5 10M10 15L5 10L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* 요약 카드들 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-xs font-medium">총 게임 수</p>
                  <p className="text-xl font-bold text-blue-800">{totalGamesPlayed}</p>
                </div>
                <div className="bg-blue-200 p-2 rounded-lg">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-xs font-medium">이번 주</p>
                  <p className="text-xl font-bold text-green-800">{weeklyProgress.toFixed(0)}%</p>
                </div>
                <div className="bg-green-200 p-2 rounded-lg">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-xs font-medium">평균 정확도</p>
                  <p className="text-xl font-bold text-yellow-800">
                    {gameStats.length > 0 
                      ? (gameStats.reduce((sum, game) => sum + game.accuracy, 0) / gameStats.length).toFixed(0)
                      : 0}%
                  </p>
                </div>
                <div className="bg-yellow-200 p-2 rounded-lg">
                  <Target className="w-4 h-4 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-xs font-medium">최고 점수</p>
                  <p className="text-xl font-bold text-purple-800">
                    {Math.max(...gameStats.map(game => game.bestScore), 0)}
                  </p>
                </div>
                <div className="bg-purple-200 p-2 rounded-lg">
                  <Trophy className="w-4 h-4 text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* 주간 목표 진행률 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              이번 주 목표
            </h2>
            <div className="mb-3">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>주간 게임 목표 (10게임)</span>
                <span>{Math.round((weeklyProgress / 100) * 10)}/10</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${weeklyProgress}%` }}
                ></div>
              </div>
            </div>
            <p className="text-xs text-gray-600">
              {weeklyProgress >= 100 
                ? "🎉 이번 주 목표를 달성했습니다!" 
                : `목표 달성까지 ${10 - Math.round((weeklyProgress / 100) * 10)}게임 남았습니다.`
              }
            </p>
          </div>

          {/* 게임별 상세 통계 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              게임별 통계
            </h2>
            
            <div className="space-y-3">
              {gameStats.map((game, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 text-sm">{game.gameName}</h3>
                    <span className="text-xs text-gray-500">
                      {formatDate(game.lastPlayed)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-gray-600">플레이 횟수</p>
                      <p className="font-semibold text-gray-800">{game.totalPlayed}회</p>
                    </div>
                    <div>
                      <p className="text-gray-600">최고 점수</p>
                      <p className={`font-semibold ${getScoreColor(game.bestScore)}`}>
                        {game.bestScore}점
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">평균 점수</p>
                      <p className={`font-semibold ${getScoreColor(game.averageScore)}`}>
                        {game.averageScore.toFixed(1)}점
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">정확도</p>
                      <p className={`font-semibold ${getScoreColor(game.accuracy)}`}>
                        {game.accuracy.toFixed(1)}%
                      </p>
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