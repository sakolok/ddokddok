import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface GameWrapperProps {
  children: ReactNode;
  title: string;
  onBack: () => void;
  score?: number;
  moves?: number;
  showStats?: boolean;
}

export default function GameWrapper({ 
  children, 
  title, 
  onBack, 
  score, 
  moves, 
  showStats = true 
}: GameWrapperProps) {
  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 flex-shrink-0">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className="flex-1 text-center">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </div>
        
        <div className="w-10"></div>
      </div>

      {/* 통계 */}
      {showStats && (score !== undefined || moves !== undefined) && (
        <div className="flex justify-center gap-4 p-3 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          {score !== undefined && (
            <div className="text-center">
              <div className="text-xs text-gray-600">점수</div>
              <div className="text-sm font-semibold text-blue-600">{score}</div>
            </div>
          )}
          {moves !== undefined && (
            <div className="text-center">
              <div className="text-xs text-gray-600">이동</div>
              <div className="text-sm font-semibold text-purple-600">{moves}</div>
            </div>
          )}
        </div>
      )}

      {/* 게임 영역 */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {children}
      </div>
    </div>
  );
}