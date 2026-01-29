import { useState, useEffect } from 'react';
import { ArrowLeft, Clock } from 'lucide-react';
import { saveGameResult } from '@/lib/gameStats';

interface MathGameProps {
  onBack: () => void;
  userInfo: { name: string; id: string };
}

type Operation = '+' | '-' | '×';

interface Question {
  num1: number;
  num2: number;
  operation: Operation;
  answer: number;
}

export function MathGame({ onBack, userInfo }: MathGameProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isGameActive, setIsGameActive] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const generateQuestion = (): Question => {
    const operations: Operation[] = ['+', '-', '×'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let num1: number, num2: number, answer: number;
    
    switch (operation) {
      case '+':
        num1 = Math.floor(Math.random() * 50) + 1;
        num2 = Math.floor(Math.random() * 50) + 1;
        answer = num1 + num2;
        break;
      case '-':
        num1 = Math.floor(Math.random() * 50) + 20;
        num2 = Math.floor(Math.random() * (num1 - 1)) + 1;
        answer = num1 - num2;
        break;
      case '×':
        num1 = Math.floor(Math.random() * 12) + 1;
        num2 = Math.floor(Math.random() * 12) + 1;
        answer = num1 * num2;
        break;
    }
    
    return { num1, num2, operation, answer };
  };

  const startGame = () => {
    setIsGameActive(true);
    setScore(0);
    setTimeLeft(30);
    setCorrectCount(0);
    setWrongCount(0);
    setUserAnswer('');
    setFeedback(null);
    setQuestion(generateQuestion());
  };

  useEffect(() => {
    if (isGameActive && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && isGameActive) {
      setIsGameActive(false);
      
      // 게임 종료 시 통계 저장
      const totalQuestions = correctCount + wrongCount;
      const accuracy = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
      
      saveGameResult(userInfo.id, {
        gameName: '빠른 계산',
        score: score,
        accuracy: accuracy
      });
    }
  }, [isGameActive, timeLeft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question || !userAnswer) return;

    const isCorrect = parseInt(userAnswer) === question.answer;
    
    setFeedback(isCorrect ? 'correct' : 'wrong');
    
    if (isCorrect) {
      const points = 5;
      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongCount((prev) => prev + 1);
    }

    setTimeout(() => {
      setFeedback(null);
      setUserAnswer('');
      setQuestion(generateQuestion());
    }, 500);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <div className="bg-white">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>뒤로</span>
          </button>
          <div className="text-right">
            <div className="text-sm text-gray-600">점수</div>
            <div className="text-2xl">{score}</div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl mb-2">빠른 계산</h2>
          {!isGameActive ? (
            <p className="text-gray-600">30초 동안 최대한 많이 풀어요</p>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0064FF]" />
              <span className={timeLeft <= 10 ? 'text-red-500' : ''}>
                {timeLeft}초
              </span>
            </div>
          )}
        </div>

        {!isGameActive && timeLeft === 30 ? (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-2xl p-8 mb-6">
              <p className="text-gray-700">
                빠르게 계산하여 점수를 획득하세요
              </p>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-[#0064FF] text-white rounded-2xl hover:bg-[#0055DD] transition-colors active:scale-95 text-lg"
            >
              시작하기
            </button>
          </div>
        ) : !isGameActive && timeLeft === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-3xl mb-6">완료!</h3>
            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">최종 점수</span>
                  <span className="text-2xl">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">정답</span>
                  <span className="text-green-600">{correctCount}개</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">오답</span>
                  <span className="text-red-600">{wrongCount}개</span>
                </div>
              </div>
            </div>
            <button
              onClick={startGame}
              className="px-8 py-4 bg-[#0064FF] text-white rounded-2xl hover:bg-[#0055DD] transition-colors active:scale-95"
            >
              다시 시작
            </button>
          </div>
        ) : (
          question && (
            <div>
              <div className="flex items-center justify-center gap-6 mb-6 text-sm">
                <div className="text-green-600">정답 {correctCount}</div>
                <div className="text-red-600">오답 {wrongCount}</div>
              </div>

              <div
                className={`rounded-2xl p-12 mb-6 transition-all ${
                  feedback === 'correct'
                    ? 'bg-blue-50 border-2 border-[#0064FF]'
                    : feedback === 'wrong'
                    ? 'bg-red-50 border-2 border-red-500'
                    : 'bg-gray-50'
                }`}
              >
                <div className="text-center text-6xl">
                  {question.num1} {question.operation} {question.num2} = ?
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="number"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full px-6 py-4 text-3xl text-center border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-[#0064FF]"
                  placeholder="답"
                  autoFocus
                  disabled={!isGameActive}
                />
                <button
                  type="submit"
                  disabled={!userAnswer || !isGameActive}
                  className="w-full py-4 bg-[#0064FF] text-white rounded-2xl hover:bg-[#0055DD] disabled:bg-gray-200 disabled:text-gray-400 transition-colors active:scale-95 text-lg"
                >
                  확인
                </button>
              </form>
            </div>
          )
        )}
      </div>
    </div>
  );
}
