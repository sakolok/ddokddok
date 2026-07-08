import { useState, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';
import GameWrapper from './GameWrapper';
import { saveGameResult } from '@/lib/gameStats';
import { useActivity } from '@/app/contexts/ActivityContext';

interface Card {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryCardGameProps {
  onBack: () => void;
  userInfo: { name: string; id: string; userId?: string };
}

const emojis = ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🥝'];

export function MemoryCardGame({ onBack, userInfo }: MemoryCardGameProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [score, setScore] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const previewTimerRef = useRef<number | null>(null);
  const sessionRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const { startSession, endSession } = useActivity();

  const initializeGame = () => {
    if (sessionRef.current && !completedRef.current) {
      endSession(sessionRef.current, score, { completed: false, moves, matches });
    }
    sessionRef.current = startSession('game', 'memory');
    completedRef.current = false;

    const shuffledEmojis = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((value, index) => ({
        id: index,
        value,
        isFlipped: true,
        isMatched: false,
      }));
    setCards(shuffledEmojis);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setScore(0);
    setGameCompleted(false);
    setIsPreview(true);

    if (previewTimerRef.current) {
      window.clearTimeout(previewTimerRef.current);
    }
    previewTimerRef.current = window.setTimeout(() => {
      setCards((prev) =>
        prev.map((card) => ({ ...card, isFlipped: false }))
      );
      setIsPreview(false);
    }, 7000);
  };

  useEffect(() => {
    initializeGame();
    return () => {
      if (previewTimerRef.current) {
        window.clearTimeout(previewTimerRef.current);
      }
      if (sessionRef.current && !completedRef.current) {
        endSession(sessionRef.current, score, { completed: false, moves, matches });
      }
    };
  }, []);

  useEffect(() => {
    if (flippedCards.length === 2) {
      setIsChecking(true);
      const [first, second] = flippedCards;
      const firstCard = cards[first];
      const secondCard = cards[second];

      if (firstCard.value === secondCard.value) {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card) =>
              card.id === first || card.id === second
                ? { ...card, isMatched: true }
                : card
            )
          );
          setMatches((prev) => prev + 1);
          setFlippedCards([]);
          setIsChecking(false);
          const newScore = 10;
          setScore((prev) => prev + newScore);
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((card) =>
              card.id === first || card.id === second
                ? { ...card, isFlipped: false }
                : card
            )
          );
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
      setMoves((prev) => prev + 1);
    }
  }, [flippedCards, cards]);

  const handleCardClick = (id: number) => {
    if (isPreview || isChecking || flippedCards.length === 2) return;
    const card = cards[id];
    if (card.isFlipped || card.isMatched) return;

    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isFlipped: true } : c))
    );
    setFlippedCards((prev) => [...prev, id]);
  };

  const isGameComplete = matches === emojis.length;

  // 게임 완료 시 통계 저장
  useEffect(() => {
    if (isGameComplete && !gameCompleted) {
      setGameCompleted(true);
      
      // 정확도 계산 (적은 움직임일수록 높은 정확도)
      const maxMoves = emojis.length * 2; // 최대 가능한 움직임
      const accuracy = Math.max(0, Math.min(100, ((maxMoves - moves) / maxMoves) * 100));
      
      // 점수 계산 (매칭 수 * 10 - 추가 움직임)
      const finalScore = Math.max(0, matches * 10 - Math.max(0, moves - emojis.length));
      
      saveGameResult(userInfo.id, {
        gameName: '카드 매칭',
        score: finalScore,
        accuracy: accuracy
      });
      if (sessionRef.current) {
        completedRef.current = true;
        endSession(sessionRef.current, finalScore, {
          completed: true,
          accuracy,
          moves,
          matches
        });
        sessionRef.current = null;
      }
    }
  }, [isGameComplete, gameCompleted, matches, moves, userInfo.id]);

  return (
    <GameWrapper 
      title="카드 매칭" 
      onBack={onBack} 
      score={score} 
      moves={moves}
    >
      <div className="flex flex-col h-full">
        {/* 게임 완료 메시지 */}
        {isGameComplete && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="text-center">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm font-semibold text-gray-800">
                {moves}번 만에 완성!
              </p>
              <p className="text-xs text-gray-600 mt-1">
                매칭: {matches}/{emojis.length}
              </p>
            </div>
          </div>
        )}

        {/* 카드 그리드 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-4 gap-3 w-full max-w-sm">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={isChecking || card.isMatched}
                className={`aspect-square rounded-2xl text-3xl flex items-center justify-center transition-all duration-300 ${
                  card.isFlipped || card.isMatched
                    ? 'bg-white border-2 border-blue-500 shadow-sm'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                } ${
                  card.isMatched ? 'opacity-60' : ''
                } active:scale-95`}
              >
                {(card.isFlipped || card.isMatched) && card.value}
              </button>
            ))}
          </div>
        </div>

        {/* 다시 시작 버튼 */}
        <div className="flex justify-center pt-4">
          <button
            onClick={initializeGame}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-sm">다시 시작</span>
          </button>
        </div>
      </div>
    </GameWrapper>
  );
}
