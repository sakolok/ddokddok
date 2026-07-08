import { useState, useEffect } from 'react';
import { ActivityProvider, useActivity } from '@/app/contexts/ActivityContext';
import AuthPage from '@/app/components/AuthPage';
import HomePage from '@/app/components/HomePage';
import UserRoleSelector from '@/app/components/UserRoleSelector';
import GuardianDashboard from '@/app/components/GuardianDashboard';
import SettingsPage from '@/app/components/SettingsPage';
import ChatbotPage from '@/app/components/ChatbotPage';
import Dashboard from '@/app/components/Dashboard';
import Layout from '@/app/components/Layout';
import InstallPrompt from '@/app/components/InstallPrompt';
import { GameMenu } from '@/app/components/GameMenu';
import KiroPuzzleGame from '@/app/components/KiroPuzzleGame';
import { MemoryCardGame } from '@/app/components/MemoryCardGame';
import { NumberSequenceGame } from '@/app/components/NumberSequenceGame';
import { MathGame } from '@/app/components/MathGame';
import { ColorGame } from '@/app/components/ColorGame';
import { clearAuthToken } from '@/lib/api';

export type GameType = 'menu' | 'memory' | 'sequence' | 'math' | 'color' | 'kiro';
type PageType = 'auth' | 'roleSelect' | 'home' | 'guardian' | 'settings' | 'chatbot' | 'braingame' | 'dashboard';
type UserRole = 'user' | 'guardian';

interface UserInfo {
  name: string;
  id: string; // username
  userId?: string;
  gender?: string;
  guardianEmail?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
}

function ActivityUserBinder({ userId }: { userId?: string }) {
  const { setUserId } = useActivity();
  useEffect(() => {
    setUserId(userId);
  }, [userId, setUserId]);
  return null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('auth');
  const [currentGame, setCurrentGame] = useState<GameType>('menu');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  // const [userRole, setUserRole] = useState<UserRole | null>(null);


  const handleLogin = (loginUserInfo: UserInfo) => {
    setUserInfo(loginUserInfo);
    setCurrentPage('roleSelect');
  };

  const handleRoleSelect = (role: UserRole) => {
    // setUserRole(role);
    if (role === 'user') {
      setCurrentPage('home');
    } else {
      setCurrentPage('guardian');
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setUserInfo(null);
    // setUserRole(null);
    setCurrentPage('auth');
    setCurrentGame('menu');
  };

  const handleBackToRoleSelect = () => {
    // setUserRole(null);
    setCurrentPage('roleSelect');
  };

  const handleChatbot = () => {
    setCurrentPage('chatbot');
  };

  const handleBrainGame = () => {
    setCurrentPage('braingame');
    setCurrentGame('menu');
  };

  // const handleDashboard = () => {
  //   setCurrentPage('dashboard');
  // };

  const handleSettings = () => {
    setCurrentPage('settings');
  };

  const handleBackToHome = () => {
    setCurrentPage('home');
    setCurrentGame('menu');
  };

  const handleGameSelect = (game: GameType) => {
    setCurrentGame(game);
  };

  const handleBackToGameMenu = () => {
    setCurrentGame('menu');
  };



  return (
    <ActivityProvider userId={userInfo?.userId}>
      <ActivityUserBinder userId={userInfo?.userId} />
      {renderCurrentPage()}
    </ActivityProvider>
  );

  function renderCurrentPage() {
    // 인증 페이지
    if (currentPage === 'auth') {
      return (
        <>
          <AuthPage onLogin={handleLogin} />
          <InstallPrompt />
        </>
      );
    }

    // 역할 선택 페이지
    if (currentPage === 'roleSelect') {
      return (
        <>
          <UserRoleSelector 
            userInfo={userInfo!}
            onRoleSelect={handleRoleSelect}
            onLogout={handleLogout}
          />
          <InstallPrompt />
        </>
      );
    }

    // 보호자 대시보드 페이지
    if (currentPage === 'guardian') {
      return (
        <>
          <GuardianDashboard 
            userInfo={userInfo!}
            onBack={handleBackToRoleSelect}
            onLogout={handleLogout}
          />
          <InstallPrompt />
        </>
      );
    }

    // 설정 페이지
    if (currentPage === 'settings') {
      return (
        <>
          <SettingsPage 
            userInfo={userInfo!}
            onBack={handleBackToHome}
            onLogout={handleLogout}
          />
          <InstallPrompt />
        </>
      );
    }

    // 홈 페이지
    if (currentPage === 'home') {
      return (
        <>
          <HomePage 
            userInfo={userInfo!}
            onBack={handleBackToRoleSelect}
            onChatbot={handleChatbot}
            onBrainGame={handleBrainGame}
            onSettings={handleSettings}
          />
          <InstallPrompt />
        </>
      );
    }

    // 대시보드 페이지
    if (currentPage === 'dashboard') {
      return (
        <Dashboard 
          userInfo={userInfo!}
          onBack={handleBackToHome}
        />
      );
    }

    // 챗봇 페이지
    if (currentPage === 'chatbot') {
      return (
        <ChatbotPage 
          userInfo={userInfo!}
          onBack={handleBackToHome}
        />
      );
    }

    // 두뇌 훈련 게임 페이지
    if (currentPage === 'braingame') {
      return (
        <Layout>
          <div className="h-full flex flex-col">
            {currentGame === 'menu' && (
              <GameMenu 
                onGameSelect={handleGameSelect} 
                userInfo={userInfo || undefined} 
                onBack={handleBackToHome}
              />
            )}
            {currentGame === 'memory' && (
              <MemoryCardGame onBack={handleBackToGameMenu} userInfo={userInfo!} />
            )}
            {currentGame === 'sequence' && (
              <NumberSequenceGame onBack={handleBackToGameMenu} userInfo={userInfo!} />
            )}
            {currentGame === 'math' && (
              <MathGame onBack={handleBackToGameMenu} userInfo={userInfo!} />
            )}
            {currentGame === 'color' && (
              <ColorGame onBack={handleBackToGameMenu} userInfo={userInfo!} />
            )}
            {currentGame === 'kiro' && (
              <KiroPuzzleGame onBack={handleBackToGameMenu} userInfo={userInfo!} />
            )}
          </div>
        </Layout>
      );
    }

    return null;
  }
}
