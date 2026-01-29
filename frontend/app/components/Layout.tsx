import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  showMobileFrame?: boolean;
  isGuardianMode?: boolean;
  isUserMode?: boolean;
}

export default function Layout({ children, showMobileFrame = true, isGuardianMode = false, isUserMode = false }: LayoutProps) {
  if (!showMobileFrame) {
    // 웹 버전 - 전체 화면 사용
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {children}
        </div>
      </div>
    );
  }

  // 통일된 앱 컨테이너 - 더 큰 크기
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-[562px] bg-white rounded-3xl shadow-2xl overflow-hidden h-[95vh] max-h-[900px] flex flex-col ${
        isGuardianMode 
          ? 'border-2 border-green-500 shadow-green-200' 
          : isUserMode
          ? 'border-2 border-blue-500 shadow-blue-200'
          : 'border border-gray-200'
      }`}>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}