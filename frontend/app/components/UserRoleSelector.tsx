import { useState } from 'react';
import Layout from './Layout';
import { api } from '@/lib/api';

interface UserRoleSelectorProps {
  userInfo: { 
    name: string; 
    id: string;
    userId?: string;
  };
  onRoleSelect: (role: 'user' | 'guardian') => void;
  onLogout: () => void;
}

export default function UserRoleSelector({ userInfo, onRoleSelect, onLogout }: UserRoleSelectorProps) {
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const toggleFontSize = () => {
    const sizes: ('normal' | 'large')[] = ['normal', 'large'];
    const currentIndex = sizes.indexOf(fontSize);
    const nextIndex = (currentIndex + 1) % sizes.length;
    setFontSize(sizes[nextIndex]);
  };

  const handleGuardianClick = () => {
    setShowPinModal(true);
  };

  const handlePinSubmit = async () => {
    if (!userInfo.userId) {
      alert('사용자 정보가 없습니다. 다시 로그인해주세요.');
      return;
    }
    try {
      await api.guardianVerify(userInfo.userId, pinInput);
      setShowPinModal(false);
      setPinInput('');
      onRoleSelect('guardian');
    } catch (err: any) {
      if (err?.message === 'pin_not_set') {
        alert('보호자 PIN이 설정되지 않았습니다.');
      } else if (err?.message === 'invalid_pin') {
        alert('PIN 번호가 올바르지 않습니다.');
      } else {
        alert('보호자 인증에 실패했습니다.');
      }
      setPinInput('');
    }
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPinInput('');
  };
  const getFontSizeLabel = () => {
    switch(fontSize) {
      case 'normal': return '보통';
      case 'large': return '크게';
      default: return '보통';
    }
  };

  const fontSizeClasses = {
    normal: 'text-base',
    large: 'text-lg'
  };

  const titleSizeClasses = {
    normal: 'text-3xl',
    large: 'text-4xl'
  };

  return (
    <Layout>
      <div className="p-6 h-full flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-start mb-8 border-b border-gray-200 pb-6">
          <div className="flex-1">
            <h1 className={`${titleSizeClasses[fontSize]} font-light text-gray-800 mb-2`}>
              안녕하세요,
            </h1>
            <h2 className={`${titleSizeClasses[fontSize]} font-bold text-gray-800 mb-4`}>
              {userInfo?.name || '사용자'}님
            </h2>
            <p className={`${fontSizeClasses[fontSize]} text-gray-600 mb-2`}>
              어떤 역할로 접속하시겠어요?
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* 뒤로가기 버튼 */}
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M9 3H4C3.44772 3 3 3.44772 3 4V16C3 16.5523 3.44772 17 4 17H9M13 7L17 11M17 11L13 15M17 11H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* 글씨 크기 조절 버튼 */}
            <button
              onClick={toggleFontSize}
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all text-sm font-medium"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <text x="2" y="8" fontSize="6" fill="currentColor">A</text>
                <text x="8" y="12" fontSize="8" fill="currentColor">A</text>
                <text x="13" y="16" fontSize="10" fill="currentColor">A</text>
              </svg>
              <span>{getFontSizeLabel()}</span>
            </button>
          </div>
        </div>

        {/* 역할 선택 카드들 */}
        <div className="flex-1 flex flex-col justify-center space-y-6 max-w-2xl mx-auto w-full">
          {/* 사용자 카드 */}
          <div
            onClick={() => onRoleSelect('user')}
            className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-8 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-6"
          >
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-3xl">👤</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className={`${fontSize === 'large' ? 'text-3xl' : 'text-2xl'} font-bold mb-3`}>
                사용자님
              </h3>
              <p className={`${fontSize === 'large' ? 'text-lg' : fontSizeClasses[fontSize]} opacity-90 mb-2`}>
                AI 챗봇과 대화하고
              </p>
              <p className={`${fontSize === 'large' ? 'text-lg' : fontSizeClasses[fontSize]} opacity-90`}>
                두뇌 훈련 게임을 즐겨보세요
              </p>
            </div>
            <div className="flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* 보호자 카드 */}
          <div
            onClick={handleGuardianClick}
            className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center gap-6"
          >
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-3xl">👥</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className={`${fontSize === 'large' ? 'text-3xl' : 'text-2xl'} font-bold mb-3`}>
                보호자
              </h3>
              <p className={`${fontSize === 'large' ? 'text-lg' : fontSizeClasses[fontSize]} opacity-90 mb-2`}>
                사용자의 활동 통계와
              </p>
              <p className={`${fontSize === 'large' ? 'text-lg' : fontSizeClasses[fontSize]} opacity-90`}>
                건강 상태를 확인하세요
              </p>
            </div>
            <div className="flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 하단 메시지 */}
        <div className="text-center py-6 border-t border-gray-100 mt-6">
          <p className={`${fontSizeClasses[fontSize]} text-gray-500`}>
            역할을 선택해주세요
          </p>
        </div>

        {/* PIN 입력 모달 */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">보호자 인증</h3>
                <p className="text-gray-600">보호자 PIN 번호를 입력해주세요</p>
              </div>
              
              <div className="mb-6">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="4자리 PIN 번호"
                  className="w-full px-4 py-4 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 transition-all"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handlePinCancel}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handlePinSubmit}
                  disabled={pinInput.length !== 4}
                  className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
