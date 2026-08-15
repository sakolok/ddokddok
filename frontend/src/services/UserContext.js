import React, { createContext, useContext, useState } from 'react';

// 초기 목업 유저 데이터
const INITIAL_USERS = [
  {
    email: 'jhh8889',
    name: '홍길동',
    password: 'password123!',
    role: 'user',
    phone: '010-1234-5678',
  },
  {
    email: 'jhh8889@naver.com',
    name: '홍길동',
    password: 'password123!',
    role: 'user',
    phone: '010-1234-5678',
  },
  {
    email: 'guardian@toktok.com',
    name: '김보호',
    password: 'password123!',
    role: 'guardian',
    phone: '010-9876-5432',
  }
];

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState(INITIAL_USERS[0]);

  // 회원가입
  const registerUser = (userData) => {
    const { email, name, password, phone, role = 'user' } = userData;
    const cleanEmail = email.trim();
    
    const existingIdx = users.findIndex(
      u => u.email.toLowerCase() === cleanEmail.toLowerCase()
    );

    const newUser = {
      email: cleanEmail,
      name: name.trim(),
      password: password || '',
      phone: phone || '',
      role,
    };

    if (existingIdx >= 0) {
      const updated = [...users];
      updated[existingIdx] = { ...updated[existingIdx], ...newUser };
      setUsers(updated);
    } else {
      setUsers(prev => [...prev, newUser]);
    }

    setCurrentUser(newUser);
    return newUser;
  };

  // 로그인 처리
  const loginUser = (userId, role = 'user') => {
    if (!userId) return currentUser;

    const cleanId = userId.trim().toLowerCase();
    const found = users.find(
      u => u.email.toLowerCase() === cleanId || 
           u.email.split('@')[0].toLowerCase() === cleanId
    );

    if (found) {
      setCurrentUser(found);
      return found;
    }

    const fallbackUser = {
      email: cleanId,
      name: userId,
      role,
    };
    setCurrentUser(fallbackUser);
    return fallbackUser;
  };

  // 로그아웃
  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        users,
        registerUser,
        loginUser,
        logout,
        setCurrentUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
