import { useState } from 'react';
import Layout from './Layout';
import Button from './ui/Button';
import Input from './ui/Input';
import { api } from '@/lib/api';

interface AuthPageProps {
  onLogin: (userInfo: { 
    name: string; 
    id: string;
    age?: number;
    gender?: string;
    guardianEmail?: string;
    userId?: string;
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
  }) => void;
}

interface LoginData {
  id: string;
  password: string;
}

interface SignupData {
  id: string;
  password: string;
  name: string;
  gender: string;
  guardianEmail: string;
  guardianPin: string;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [loginData, setLoginData] = useState<LoginData>({
    id: '',
    password: ''
  });
  const [signupData, setSignupData] = useState<SignupData>({
    id: '',
    password: '',
    name: '',
    gender: '',
    guardianEmail: '',
    guardianPin: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setSignupData({
      ...signupData,
      [e.target.name]: e.target.value
    });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.id || !loginData.password) {
      alert('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const data = await api.login({
        username: loginData.id,
        password: loginData.password
      });
      onLogin({ 
        name: data.display_name || loginData.id, 
        id: loginData.id,
        userId: data.user_id,
        gender: data.gender,
        guardianEmail: data.guardian_email,
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: data.refresh_token
      });
    } catch (err) {
      alert('로그인에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupData.id || !signupData.password || !signupData.name || !signupData.gender || !signupData.guardianEmail || !signupData.guardianPin) {
      alert('모든 정보를 입력해주세요.');
      return;
    }
    if (signupData.password.length < 6) {
      alert('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (signupData.guardianPin.length !== 4 || !/^\d{4}$/.test(signupData.guardianPin)) {
      alert('보호자 PIN은 4자리 숫자여야 합니다.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await api.signup({
        username: signupData.id,
        password: signupData.password,
        display_name: signupData.name,
        guardian_email: signupData.guardianEmail,
        pin: signupData.guardianPin,
        gender: signupData.gender
      });
      alert('회원가입이 완료되었습니다!');
      setActiveTab('login');
    } catch (err: any) {
      if (err?.message === 'password_too_short') {
        alert('비밀번호는 최소 6자 이상이어야 합니다.');
      } else if (err?.message === 'user_exists') {
        alert('이미 존재하는 아이디입니다.');
      } else {
        alert('회원가입에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const HeartIcon = () => (
    <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M16 6C13 6 10.5 8 10.5 11C10.5 14 16 22 16 22S21.5 14 21.5 11C21.5 8 19 6 16 6Z" fill="white"/>
      </svg>
    </div>
  );

  return (
    <Layout>
      <div className="p-8">
        {/* 로고 및 타이틀 */}
        <div className="text-center mb-10">
          <HeartIcon />
          <h1 className="text-3xl font-bold text-gray-800 mb-3">똑똑똑</h1>
          <p className="text-gray-600 leading-relaxed">
            매일 당신과 함께하는<br />건강한 일상
          </p>
        </div>

        {/* 탭 버튼 */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
          <button
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'login'
                ? 'bg-white text-gray-700 shadow-sm'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('login')}
          >
            로그인
          </button>
          <button
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'signup'
                ? 'bg-white text-gray-700 shadow-sm'
                : 'text-gray-500'
            }`}
            onClick={() => setActiveTab('signup')}
          >
            회원가입
          </button>
        </div>

        {/* 폼 */}
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <Input
              type="text"
              name="id"
              placeholder="아이디"
              value={loginData.id}
              onChange={handleLoginChange}
            />
            <Input
              type="password"
              name="password"
              placeholder="비밀번호"
              value={loginData.password}
              onChange={handleLoginChange}
            />
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              로그인
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <Input
              type="text"
              name="id"
              placeholder="아이디"
              value={signupData.id}
              onChange={handleSignupChange}
            />
            <Input
              type="password"
              name="password"
              placeholder="비밀번호"
              value={signupData.password}
              onChange={handleSignupChange}
            />
            <Input
              type="text"
              name="name"
              placeholder="성함"
              value={signupData.name}
              onChange={handleSignupChange}
            />
            <select
              name="gender"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={signupData.gender}
              onChange={handleSignupChange}
            >
              <option value="">성별 선택</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
            <Input
              type="email"
              name="guardianEmail"
              placeholder="보호자 이메일"
              value={signupData.guardianEmail}
              onChange={handleSignupChange}
            />
            <Input
              type="password"
              name="guardianPin"
              placeholder="보호자 PIN (4자리 숫자)"
              maxLength={4}
              value={signupData.guardianPin}
              onChange={handleSignupChange}
            />
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              회원가입
            </Button>
          </form>
        )}

        {/* 하단 링크 */}
        <div className="flex justify-between mt-8 pt-6 text-sm border-t border-gray-100">
          <button
            className="text-gray-500 hover:text-blue-500 transition-colors"
            onClick={() => alert('아이디/비밀번호 찾기 기능은 데모용입니다.')}
          >
            아이디/비밀번호 찾기
          </button>
          <button
            className="text-gray-500 hover:text-blue-500 transition-colors"
            onClick={() => setActiveTab('signup')}
          >
            회원가입
          </button>
        </div>
      </div>
    </Layout>
  );
}
