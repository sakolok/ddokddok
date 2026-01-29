import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { api } from '@/lib/api';

export interface ActivitySession {
  id: string;
  type: 'chat' | 'game';
  gameType?: 'memory' | 'sequence' | 'math' | 'color' | 'kiro';
  startTime: Date;
  endTime?: Date;
  duration?: number; // 분 단위
  score?: number;
  details?: any;
}

export interface DiagnosisResult {
  date: Date;
  score: number;
  answers: number[];
}

export interface ActivityData {
  sessions: ActivitySession[];
  diagnosisResults: DiagnosisResult[];
}

interface ActivityContextType {
  activityData: ActivityData;
  setUserId: (userId?: string) => void;
  startSession: (type: 'chat' | 'game', gameType?: string) => string;
  endSession: (sessionId: string, score?: number, details?: any) => void;
  addDiagnosisResult: (score: number, answers: number[]) => void;
  getWeeklyStats: () => {
    totalChatSessions: number;
    totalGameSessions: number;
    totalTime: number;
    avgDailyTime: number;
    gameStats: Record<string, { played: number; avgScore: number; bestScore: number }>;
    dailyActivities: Array<{
      date: string;
      chatSessions: number;
      gamesSessions: number;
      totalTime: number;
      diagnosisScore?: number;
    }>;
    latestDiagnosis?: DiagnosisResult;
    recentDiagnosisResults: DiagnosisResult[];
  };
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export function ActivityProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(userId);
  const [activityData, setActivityData] = useState<ActivityData>({
    sessions: [],
    diagnosisResults: []
  });

  useEffect(() => {
    setCurrentUserId(userId);
  }, [userId]);

  const startSession = (type: 'chat' | 'game', gameType?: string): string => {
    const sessionId = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newSession: ActivitySession = {
      id: sessionId,
      type,
      gameType: gameType as any,
      startTime: new Date()
    };

    setActivityData(prev => ({
      ...prev,
      sessions: [...prev.sessions, newSession]
    }));

    return sessionId;
  };

  const endSession = (sessionId: string, score?: number, details?: any) => {
    let payload: any = null;
    setActivityData(prev => ({
      ...prev,
      sessions: prev.sessions.map(session => {
        if (session.id === sessionId) {
          const endTime = new Date();
          const duration = Math.round((endTime.getTime() - session.startTime.getTime()) / (1000 * 60));
          payload = {
            user_id: currentUserId,
            type: session.type,
            start_ts: session.startTime.toISOString(),
            end_ts: endTime.toISOString(),
            duration_min: duration,
            game_type: session.gameType,
            score
          };
          return {
            ...session,
            endTime,
            duration,
            score,
            details
          };
        }
        return session;
      })
    }));
    if (payload && currentUserId) {
      api.logActivity(payload).catch(() => {});
    }
  };

  const addDiagnosisResult = (score: number, answers: number[]) => {
    const newResult: DiagnosisResult = {
      date: new Date(),
      score,
      answers
    };

    setActivityData(prev => ({
      ...prev,
      diagnosisResults: [...prev.diagnosisResults, newResult]
    }));
  };

  const getWeeklyStats = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // 최근 7일간의 세션 필터링
    const recentSessions = activityData.sessions.filter(session => 
      session.startTime >= weekAgo && session.endTime
    );

    const totalChatSessions = recentSessions.filter(s => s.type === 'chat').length;
    const totalGameSessions = recentSessions.filter(s => s.type === 'game').length;
    const totalTime = recentSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const avgDailyTime = Math.round(totalTime / 7);

    // 게임별 통계
    const gameStats: Record<string, { played: number; avgScore: number; bestScore: number }> = {};
    const gameTypes = ['memory', 'sequence', 'math', 'color', 'kiro'];
    
    gameTypes.forEach(gameType => {
      const gameSessions = recentSessions.filter(s => s.type === 'game' && s.gameType === gameType);
      const scores = gameSessions.map(s => s.score || 0).filter(score => score > 0);
      
      gameStats[gameType] = {
        played: gameSessions.length,
        avgScore: scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0,
        bestScore: scores.length > 0 ? Math.max(...scores) : 0
      };
    });

    // 일별 활동 데이터
    const dailyActivities = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySessions = recentSessions.filter(session => {
        const sessionDate = session.startTime.toISOString().split('T')[0];
        return sessionDate === dateStr;
      });

      const chatSessions = daySessions.filter(s => s.type === 'chat').length;
      const gamesSessions = daySessions.filter(s => s.type === 'game').length;
      const dayTotalTime = daySessions.reduce((sum, session) => sum + (session.duration || 0), 0);

      // 해당 날짜의 진단 결과 찾기
      const dayDiagnosis = activityData.diagnosisResults.find(result => {
        const resultDate = result.date.toISOString().split('T')[0];
        return resultDate === dateStr;
      });

      dailyActivities.push({
        date: dateStr,
        chatSessions,
        gamesSessions,
        totalTime: dayTotalTime,
        diagnosisScore: dayDiagnosis?.score
      });
    }

    // 최근 진단 결과
    const latestDiagnosis = activityData.diagnosisResults.length > 0 
      ? activityData.diagnosisResults[activityData.diagnosisResults.length - 1]
      : undefined;

    // 최근 7일간의 진단 결과들
    const recentDiagnosisResults = activityData.diagnosisResults.filter(result => 
      result.date >= weekAgo
    ).sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      totalChatSessions,
      totalGameSessions,
      totalTime,
      avgDailyTime,
      gameStats,
      dailyActivities,
      latestDiagnosis,
      recentDiagnosisResults
    };
  };

  return (
    <ActivityContext.Provider value={{
      activityData,
      setUserId: setCurrentUserId,
      startSession,
      endSession,
      addDiagnosisResult,
      getWeeklyStats
    }}>
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}
