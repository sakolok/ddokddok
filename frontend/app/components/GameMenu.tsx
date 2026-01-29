import type { GameType } from '@/app/App';

interface GameMenuProps {
  onGameSelect: (game: GameType) => void;
  userInfo?: { name: string; id: string };
  onBack?: () => void;
}

export function GameMenu({ onGameSelect, userInfo, onBack }: GameMenuProps) {
  const games = [
    {
      id: 'color' as GameType,
      title: '색상 인식',
      description: '우뇌 자극 훈련',
      emoji: '🎨',
      bgGradient: 'bg-gradient-to-br from-pink-100 to-rose-100',
      hoverGradient: 'hover:from-pink-200 hover:to-rose-200',
    },
    {
      id: 'kiro' as GameType,
      title: 'Kiro 퍼즐',
      description: '4x4 조각 맞추기',
      emoji: '🧩',
      bgGradient: 'bg-gradient-to-br from-purple-100 to-violet-100',
      hoverGradient: 'hover:from-purple-200 hover:to-violet-200',
    },
    {
      id: 'memory' as GameType,
      title: '카드 매칭',
      description: '같은 그림 찾기',
      emoji: '🃏',
      bgGradient: 'bg-gradient-to-br from-blue-100 to-cyan-100',
      hoverGradient: 'hover:from-blue-200 hover:to-cyan-200',
    },
    {
      id: 'sequence' as GameType,
      title: '숫자 기억',
      description: '순서대로 기억하기',
      emoji: '🔢',
      bgGradient: 'bg-gradient-to-br from-indigo-100 to-blue-100',
      hoverGradient: 'hover:from-indigo-200 hover:to-blue-200',
    },
    {
      id: 'math' as GameType,
      title: '빠른 계산',
      description: '두뇌 활성화',
      emoji: '🧮',
      bgGradient: 'bg-gradient-to-br from-emerald-100 to-teal-100',
      hoverGradient: 'hover:from-emerald-200 hover:to-teal-200',
    },
  ];

  return (
    <div className="p-6 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <span className="text-xl">←</span>
          </button>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            두뇌 게임 🧠
          </h1>
          {userInfo && (
            <p className="text-lg text-gray-600">
              {userInfo.name}님의 두뇌를 훈련해보세요
            </p>
          )}
          {!userInfo && (
            <p className="text-lg text-gray-600">
              매일 조금씩 두뇌를 훈련해보세요
            </p>
          )}
        </div>
        {onBack && <div className="w-12"></div>}
      </div>

      {/* 게임 목록 */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {games.map((game, index) => (
          <button
            key={game.id}
            onClick={() => onGameSelect(game.id)}
            className={`w-full ${game.bgGradient} ${game.hoverGradient} border border-gray-200 rounded-2xl p-6 transition-all duration-300 hover:border-gray-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] group`}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div className="flex items-center gap-6">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl block group-hover:animate-pulse">{game.emoji}</span>
              </div>
              <div className="text-left flex-1">
                <div className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">
                  {game.title}
                </div>
                <div className="text-lg text-gray-600 group-hover:text-gray-700 transition-colors">
                  {game.description}
                </div>
              </div>
              <div className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300">
                <span className="text-2xl">→</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 하단 메시지 */}
      <div className="text-center py-6 border-t border-gray-100 mt-4">
        <p className="text-base text-gray-500 font-medium flex items-center justify-center gap-2">
          <span className="animate-pulse">✨</span>
          매일 5분씩 두뇌 훈련으로 인지 능력을 향상시키세요
          <span className="animate-pulse">✨</span>
        </p>
      </div>
    </div>
  );
}
