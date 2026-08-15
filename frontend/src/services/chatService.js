import { Platform } from 'react-native';

const STORAGE_KEY = '@toktoktok_real_chat_logs';
let inMemoryChatLogs = [];
const listeners = new Set();

export const getRealChatLogs = () => {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error('Error reading chat logs from localStorage:', e);
    }
  }
  return inMemoryChatLogs;
};

export const saveRealChatLog = (userMessage, aiResponse) => {
  if (!userMessage) return;

  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? '오후' : '오전';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const timeStr = `오늘 ${ampm} ${formattedHours}:${formattedMinutes}`;

  const newLog = {
    id: Date.now().toString(),
    date: timeStr,
    title: userMessage.length > 20 ? userMessage.substring(0, 20) + '...' : userMessage,
    summary: `"${userMessage}"`,
    aiResponse: aiResponse || '똑똑이와 즐거운 대화를 나누셨습니다.',
    mood: '기분 맑음 😊',
    moodBg: '#DCFCE7',
    moodColor: '#166534',
    topic: '음성대화',
    timestamp: Date.now(),
  };

  let currentLogs = getRealChatLogs();
  currentLogs = [newLog, ...currentLogs];
  inMemoryChatLogs = currentLogs;

  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentLogs));
    } catch (e) {
      console.error('Error saving chat logs to localStorage:', e);
    }
  }

  listeners.forEach(fn => fn(currentLogs));
  return newLog;
};

export const subscribeChatLogs = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const clearRealChatLogs = () => {
  inMemoryChatLogs = [];
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing chat logs from localStorage:', e);
    }
  }
  listeners.forEach(fn => fn([]));
};
