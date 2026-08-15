// ── 사용자 정보 레가시 브릿지 ──
import { useUser } from './UserContext';

const legacyUsers = [
  {
    email: 'jhh8889',
    name: '홍길동',
    password: 'password123!',
    role: 'user',
  },
  {
    email: 'jhh8889@naver.com',
    name: '홍길동',
    password: 'password123!',
    role: 'user',
  },
  {
    email: 'guardian@toktok.com',
    name: '김보호',
    password: 'password123!',
    role: 'guardian',
  }
];

let legacyCurrentUser = legacyUsers[0];

export function registerUser(userData) {
  const { email, name, password, phone, role = 'user' } = userData;
  const newUser = {
    email: email.trim(),
    name: name.trim(),
    password: password || '',
    phone: phone || '',
    role,
  };
  legacyCurrentUser = newUser;
  return newUser;
}

export function getUserName(userId) {
  if (!userId) return legacyCurrentUser?.name || '어르신';
  const cleanId = userId.trim().toLowerCase();
  const found = legacyUsers.find(
    u => u.email.toLowerCase() === cleanId || 
         u.email.split('@')[0].toLowerCase() === cleanId
  );
  if (found) return found.name;
  return userId;
}

export function setCurrentUser(user) {
  legacyCurrentUser = user;
}

export function getCurrentUser() {
  return legacyCurrentUser;
}
