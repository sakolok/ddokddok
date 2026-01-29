const DEFAULT_API_BASE_URL = 'https://8fvbrb5ai3.execute-api.ap-northeast-2.amazonaws.com/dev';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

async function apiFetch<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && data.message) ? data.message : `HTTP_${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export interface SignupPayload {
  username: string;
  password: string;
  display_name: string;
  guardian_email: string;
  pin: string;
  gender: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface LoginResponse {
  role: 'senior';
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  user_id?: string;
  display_name?: string;
  guardian_email?: string;
  gender?: string;
}

export const api = {
  signup: (payload: SignupPayload) =>
    apiFetch<{ role: 'senior'; user_id: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  login: (payload: LoginPayload) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  guardianVerify: (user_id: string, pin: string) =>
    apiFetch<{ ok: boolean }>('/auth/guardian/verify', {
      method: 'POST',
      body: JSON.stringify({ user_id, pin })
    }),
  startSession: (user_id: string) =>
    apiFetch<{ user_id: string; session_id: string }>('/start', {
      method: 'POST',
      body: JSON.stringify({ user_id, consent: true })
    }),
  turn: (session_id: string, user_id: string, final_transcript: string) =>
    apiFetch<{ assistant_text: string; audio?: { url?: string }; tags?: any }>('/turn', {
      method: 'POST',
      body: JSON.stringify({ session_id, user_id, final_transcript })
    }),
  endSession: (session_id: string) =>
    apiFetch<{ message: string }>('/session/end', {
      method: 'POST',
      body: JSON.stringify({ session_id })
    }),
  listSessions: (user_id: string) =>
    apiFetch<{ items: any[] }>(`/sessions?user_id=${encodeURIComponent(user_id)}`, {
      method: 'GET'
    }),
  getSession: (session_id: string) =>
    apiFetch<{ session: any; turns: any[] }>(`/sessions/${encodeURIComponent(session_id)}`, {
      method: 'GET'
    }),
  selfAssessment: (user_id: string, answers: Array<boolean | number>, assessment_date?: string) =>
    apiFetch<{ score: number; avg_7d: number; notified: boolean }>(
      '/self-assessment',
      {
        method: 'POST',
        body: JSON.stringify({ user_id, answers, assessment_date })
      }
    ),
  logActivity: (payload: {
    user_id: string;
    type: 'chat' | 'game';
    start_ts?: string;
    end_ts?: string;
    duration_min?: number;
    game_type?: string;
    score?: number;
  }) =>
    apiFetch<{ ok: boolean }>('/activity/log', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  weeklyActivity: (user_id: string) =>
    apiFetch<{
      summary: string;
      total_chat_sessions: number;
      total_game_sessions: number;
      total_time_min: number;
      avg_daily_time_min: number;
      game_stats: Record<string, { played: number; avgScore: number; bestScore: number }>;
      daily_activities: Array<{ date: string; chatSessions: number; gamesSessions: number; totalTime: number; diagnosisScore?: number }>;
      latest_diagnosis?: { date: string; score: number };
      kdsq_summary?: string;
      kdsq_signals?: Record<string, string>;
      kdsq_score_total?: number;
      kdsq_status_emoji?: string;
      kdsq_notify?: boolean;
      kdsq_responses_count?: number;
      kdsq_concern_examples?: Array<{ question: string; answer: string }>;
      kdsq_responses?: Array<{ question?: string; answer?: string; kdsq_item_id?: string; kdsq_type?: string; timestamp?: string }>;
    }>(`/activity/weekly?user_id=${encodeURIComponent(user_id)}`, {
      method: 'GET'
    })
};
