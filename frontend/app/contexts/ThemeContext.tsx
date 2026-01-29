import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'user' | 'guardian';
export type ThemeMode = 'user' | 'guardian';

interface ThemeContextType {
  currentRole: UserRole | null;
  themeMode: ThemeMode;
  setRole: (role: UserRole | null) => void;
  getThemeClasses: () => {
    primary: string;
    secondary: string;
    accent: string;
    gradient: string;
    hover: string;
    focus: string;
    background: string;
    card: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  
  const themeMode: ThemeMode = currentRole || 'user';

  const setRole = (role: UserRole | null) => {
    setCurrentRole(role);
  };

  const getThemeClasses = () => {
    // 역할이 선택되지 않았을 때는 기본 테두리
    if (!currentRole) {
      return {
        primary: 'text-gray-600',
        secondary: 'text-gray-500',
        accent: 'text-gray-600',
        gradient: 'bg-gradient-to-r from-gray-500 to-gray-600',
        hover: 'hover:bg-gray-50 hover:text-gray-700',
        focus: 'focus:border-gray-500 focus:ring-gray-500',
        background: 'bg-gray-50',
        card: 'bg-white border-gray-200',
        border: 'border-gray-300',
        borderLight: 'border-gray-200',
        accent_bg: 'bg-gray-100',
        indicator: 'bg-gray-500',
        shadow: 'shadow-gray-200/50',
        ring: 'ring-gray-200'
      };
    }
    
    if (themeMode === 'guardian') {
      return {
        primary: 'text-green-600',
        secondary: 'text-green-500',
        accent: 'text-emerald-600',
        gradient: 'bg-gradient-to-r from-green-500 to-emerald-600',
        hover: 'hover:bg-green-50 hover:text-green-700',
        focus: 'focus:border-green-500 focus:ring-green-500',
        background: 'bg-gray-50',
        card: 'bg-white border-green-200',
        border: 'border-green-500',
        borderLight: 'border-green-200',
        accent_bg: 'bg-green-100',
        indicator: 'bg-green-500',
        shadow: 'shadow-green-200/50',
        ring: 'ring-green-200'
      };
    } else {
      return {
        primary: 'text-blue-600',
        secondary: 'text-blue-500',
        accent: 'text-purple-600',
        gradient: 'bg-gradient-to-r from-blue-500 to-purple-600',
        hover: 'hover:bg-blue-50 hover:text-blue-700',
        focus: 'focus:border-blue-500 focus:ring-blue-500',
        background: 'bg-gray-50',
        card: 'bg-white border-blue-200',
        border: 'border-blue-500',
        borderLight: 'border-blue-200',
        accent_bg: 'bg-blue-100',
        indicator: 'bg-blue-500',
        shadow: 'shadow-blue-200/50',
        ring: 'ring-blue-200'
      };
    }
  };

  return (
    <ThemeContext.Provider value={{
      currentRole,
      themeMode,
      setRole,
      getThemeClasses
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}