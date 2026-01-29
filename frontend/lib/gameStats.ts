export interface GameStats {
  gameName: string;
  totalPlayed: number;
  bestScore: number;
  averageScore: number;
  lastPlayed: string;
  accuracy: number;
  scores: number[];
}

export interface GameResult {
  score: number;
  accuracy: number;
  gameName: string;
}

export const saveGameResult = (userId: string, result: GameResult) => {
  const statsKey = `gameStats_${userId}`;
  const existingStats = localStorage.getItem(statsKey);
  
  let stats: GameStats[] = [];
  
  if (existingStats) {
    stats = JSON.parse(existingStats);
  }
  
  // 해당 게임의 통계 찾기 또는 생성
  let gameStats = stats.find(s => s.gameName === result.gameName);
  
  if (!gameStats) {
    gameStats = {
      gameName: result.gameName,
      totalPlayed: 0,
      bestScore: 0,
      averageScore: 0,
      lastPlayed: new Date().toISOString(),
      accuracy: 0,
      scores: []
    };
    stats.push(gameStats);
  }
  
  // 통계 업데이트
  gameStats.totalPlayed += 1;
  gameStats.bestScore = Math.max(gameStats.bestScore, result.score);
  gameStats.scores.push(result.score);
  gameStats.averageScore = gameStats.scores.reduce((sum, score) => sum + score, 0) / gameStats.scores.length;
  gameStats.lastPlayed = new Date().toISOString();
  gameStats.accuracy = result.accuracy;
  
  // 최근 10개 점수만 유지
  if (gameStats.scores.length > 10) {
    gameStats.scores = gameStats.scores.slice(-10);
  }
  
  // 로컬 스토리지에 저장
  localStorage.setItem(statsKey, JSON.stringify(stats));
};

export const getGameStats = (userId: string): GameStats[] => {
  const statsKey = `gameStats_${userId}`;
  const existingStats = localStorage.getItem(statsKey);
  
  if (existingStats) {
    return JSON.parse(existingStats);
  }
  
  return [];
};

export const initializeGameStats = (userId: string) => {
  const existingStats = getGameStats(userId);
  
  if (existingStats.length === 0) {
    const initialStats: GameStats[] = [
      {
        gameName: '카드 매칭',
        totalPlayed: 0,
        bestScore: 0,
        averageScore: 0,
        lastPlayed: new Date().toISOString(),
        accuracy: 0,
        scores: []
      },
      {
        gameName: '숫자 기억',
        totalPlayed: 0,
        bestScore: 0,
        averageScore: 0,
        lastPlayed: new Date().toISOString(),
        accuracy: 0,
        scores: []
      },
      {
        gameName: '빠른 계산',
        totalPlayed: 0,
        bestScore: 0,
        averageScore: 0,
        lastPlayed: new Date().toISOString(),
        accuracy: 0,
        scores: []
      },
      {
        gameName: '색상 인식',
        totalPlayed: 0,
        bestScore: 0,
        averageScore: 0,
        lastPlayed: new Date().toISOString(),
        accuracy: 0,
        scores: []
      },
      {
        gameName: 'Kiro 퍼즐',
        totalPlayed: 0,
        bestScore: 0,
        averageScore: 0,
        lastPlayed: new Date().toISOString(),
        accuracy: 0,
        scores: []
      }
    ];
    
    localStorage.setItem(`gameStats_${userId}`, JSON.stringify(initialStats));
    return initialStats;
  }
  
  return existingStats;
};