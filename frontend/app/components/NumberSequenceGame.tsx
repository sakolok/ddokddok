import { useCallback, useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import GameWrapper from './GameWrapper';
import { saveGameResult } from '@/lib/gameStats';
import { useActivity } from '@/app/contexts/ActivityContext';

interface NumberSequenceGameProps {
  onBack: () => void;
  userInfo: { name: string; id: string; userId?: string };
}

type GameState = 'ready' | 'showing' | 'input' | 'result';

const SEQUENCE_LENGTH = 3;
const POINTS_PER_NUMBER = 5;

export function NumberSequenceGame({ onBack, userInfo }: NumberSequenceGameProps) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [gameState, setGameState] = useState<GameState>('ready');
  const [score, setScore] = useState(0);
  const [showingIndex, setShowingIndex] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const { startSession, endSession } = useActivity();
  const currentSessionRef = useRef<string | null>(null);

  const startGame = useCallback(() => {
    currentSessionRef.current = startSession('game', 'sequence');
    const newSequence = Array.from({ length: SEQUENCE_LENGTH }, () => Math.floor(Math.random() * 9) + 1);
    setSequence(newSequence);
    setUserInput([]);
    setIsCorrect(null);
    setShowingIndex(0);
    setGameState('showing');
  }, [startSession]);

  useEffect(() => {
    if (gameState !== 'showing' || sequence.length === 0) return;

    const isLastNumber = showingIndex >= sequence.length - 1;
    const timer = window.setTimeout(() => {
      if (isLastNumber) {
        setGameState('input');
        return;
      }

      setShowingIndex((prev) => Math.min(prev + 1, sequence.length - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [gameState, showingIndex, sequence.length]);

  const handleNumberClick = (num: number) => {
    if (gameState !== 'input') return;
    
    const newInput = [...userInput, num];
    setUserInput(newInput);

    if (newInput.length === sequence.length) {
      checkAnswer(newInput);
    }
  };

  const checkAnswer = (input: number[]) => {
    const correct = input.every((num, index) => num === sequence[index]);
    setIsCorrect(correct);
    setGameState('result');

    // 통계 저장
    const accuracy = correct ? 100 : 0;
    const gameScore = correct ? SEQUENCE_LENGTH * POINTS_PER_NUMBER : 0;
    
    saveGameResult(userInfo.id, {
      gameName: '숫자 기억',
      score: gameScore,
      accuracy: accuracy
    });
    if (currentSessionRef.current) {
      endSession(currentSessionRef.current, gameScore, {
        completed: correct,
        accuracy,
        sequenceLength: sequence.length
      });
      currentSessionRef.current = null;
    }

    if (correct) {
      const points = SEQUENCE_LENGTH * POINTS_PER_NUMBER;
      setScore((prev) => prev + points);
      setTimeout(() => {
        startGame();
      }, 2000);
    } else {
      setTimeout(() => {
        setGameState('ready');
      }, 2000);
    }
  };

  return (
    <GameWrapper 
      title="숫자 기억" 
      onBack={onBack} 
      score={score}
      showStats={gameState !== 'ready'}
    >
      <div className="flex flex-col h-full">
        {/* 레벨 정보 */}
        {gameState !== 'ready' && (
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">{SEQUENCE_LENGTH}개 숫자 기억</p>
          </div>
        )}

        {/* 게임 상태별 화면 */}
        <div className="flex-1 flex items-center justify-center">
          {gameState === 'ready' && (
            <div className="text-center w-full">
              <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
                <p className="text-gray-700 mb-3 text-sm">
                  숫자가 순서대로 나타나요
                </p>
                <p className="text-gray-700 text-sm">
                  잘 기억했다가 같은 순서로 입력해주세요
                </p>
              </div>
              <button
                onClick={startGame}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all active:scale-95"
              >
                <Play className="w-5 h-5" />
                <span>시작하기</span>
              </button>
            </div>
          )}

          {gameState === 'showing' && (
            <div className="text-center">
              <div className="text-6xl mb-4 font-bold text-blue-600">
                {sequence[showingIndex] ?? ''}
              </div>
              <div className="text-gray-500 text-sm">
                {Math.min(showingIndex + 1, sequence.length)} / {sequence.length}
              </div>
            </div>
          )}

          {gameState === 'input' && (
            <div className="w-full max-w-xs">
              <div className="bg-white rounded-xl p-4 mb-6 min-h-16 flex items-center justify-center border border-gray-200">
                <div className="text-xl font-semibold text-gray-800">
                  {userInput.length > 0 ? userInput.join(' ') : '입력하세요'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    className="aspect-square rounded-xl text-xl bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-95 font-semibold"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameState === 'result' && (
            <div className="text-center">
              <div className={`text-5xl mb-4 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                {isCorrect ? '✓' : '✗'}
              </div>
              <p className="text-lg mb-2 font-semibold">
                {isCorrect ? '정답이에요!' : '아쉬워요'}
              </p>
              {isCorrect ? (
                <p className="text-gray-600 text-sm">다음 레벨로 이동해요</p>
              ) : (
                <div className="text-gray-600 text-sm">
                  <p className="mb-2">정답: {sequence.join(' ')}</p>
                  <p>처음부터 다시 시작해요</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GameWrapper>
  );
}
