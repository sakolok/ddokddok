// AWS Serverless API Gateway Client for 똑똑똑 (TokTokTok)
const DEFAULT_API_BASE_URL = 'https://vwjc2p1w4e.execute-api.ap-northeast-2.amazonaws.com/dev';
let authToken = null;

export const setAuthToken = (token) => {
  authToken = token;
};

export const clearAuthToken = () => {
  authToken = null;
};

async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${DEFAULT_API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && data.message ? data.message : `HTTP_${response.status}`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  signup: (payload) =>
    apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: async (payload) => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (response.id_token || response.access_token) {
      setAuthToken(response.id_token || response.access_token);
    }
    return response;
  },

  guardianVerify: (user_id, pin) =>
    apiFetch('/auth/guardian/verify', {
      method: 'POST',
      body: JSON.stringify({ user_id, pin }),
    }),

  startSession: (user_id, welcome_text) =>
    apiFetch('/start', {
      method: 'POST',
      body: JSON.stringify({ user_id, consent: true, welcome_text }),
    }),

  transcribeStreamUrl: (user_id, session_id) =>
    apiFetch('/transcribe/stream-url', {
      method: 'POST',
      body: JSON.stringify({ user_id, session_id }),
    }),

  turn: (session_id, user_id, final_transcript) =>
    apiFetch('/turn', {
      method: 'POST',
      body: JSON.stringify({ session_id, user_id, final_transcript }),
    }),

  endSession: (session_id) =>
    apiFetch('/session/end', {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    }),

  listSessions: (user_id) =>
    apiFetch(`/sessions?user_id=${encodeURIComponent(user_id)}`, {
      method: 'GET',
    }),

  getSession: (session_id) =>
    apiFetch(`/sessions/${encodeURIComponent(session_id)}`, {
      method: 'GET',
    }),

  selfAssessment: (user_id, answers, assessment_date) =>
    apiFetch('/self-assessment', {
      method: 'POST',
      body: JSON.stringify({ user_id, answers, assessment_date }),
    }),

  logActivity: (payload) =>
    apiFetch('/activity/log', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  weeklyActivity: (user_id) =>
    apiFetch(`/activity/weekly?user_id=${encodeURIComponent(user_id)}`, {
      method: 'GET',
    }),
};

export default api;
