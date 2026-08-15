// ── 디자인 토큰 (TokTokTok Deep Indigo Design System - #3E4C7D) ──

export const colors = {
  // 딥 인디고 시그니처 Primary (#3E4C7D)
  primary: '#3E4C7D',            // Deep Indigo Signature Main
  primaryContainer: '#5C6B9C',   // Soft Medium Indigo Accent
  onPrimary: '#ffffff',
  onPrimaryContainer: '#1E2540',
  inversePrimary: '#B3C1E6',
  primaryFixed: '#EBF0F7',
  primaryFixedDim: '#8A99C7',

  // 서브 인디고 슬레이트
  secondary: '#2E3A66',
  secondaryContainer: '#DFE5F2',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#12172B',

  tertiary: '#4E5D92',
  tertiaryContainer: '#C2CEE8',
  onTertiary: '#ffffff',

  // 딥 인디고 인핸스드 캔버스 배경 (#F6F8FB)
  background: '#F6F8FB',
  onBackground: '#1E2540',
  surface: '#ffffff',
  onSurface: '#1E2540',
  surfaceDim: '#EBF0F7',
  surfaceBright: '#ffffff',

  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#F1F4FA',
  surfaceContainer: '#EBF0F7',
  surfaceContainerHigh: '#DFE5F2',
  surfaceContainerHighest: '#C2CEE8',

  onSurfaceVariant: '#475569',
  surfaceVariant: '#E2E7F0',
  outline: '#64748B',
  outlineVariant: '#CBD5E1',

  inverseSurface: '#1E2540',
  inverseOnSurface: '#F1F5F9',

  error: '#DC2626',
  onError: '#ffffff',
  errorContainer: '#FEE2E2',
  onErrorContainer: '#7F1D1D',
  
  // 시맨틱 컬러
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3E4C7D',
};

export const fontFamily = {
  pretendard: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
};

export const typography = {
  headlineLg:       { fontFamily: fontFamily.pretendard, fontSize: 40, lineHeight: 52, fontWeight: '700', letterSpacing: -0.4 },
  headlineLgMobile: { fontFamily: fontFamily.pretendard, fontSize: 32, lineHeight: 42, fontWeight: '700' },
  headlineMd:       { fontFamily: fontFamily.pretendard, fontSize: 26, lineHeight: 36, fontWeight: '700' },
  bodyLg:           { fontFamily: fontFamily.pretendard, fontSize: 20, lineHeight: 30, fontWeight: '400' },
  bodyMd:           { fontFamily: fontFamily.pretendard, fontSize: 17, lineHeight: 26, fontWeight: '400' },
  labelLg:          { fontFamily: fontFamily.pretendard, fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: 0.36 },
  labelMd:          { fontFamily: fontFamily.pretendard, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  captionLg:        { fontFamily: fontFamily.pretendard, fontSize: 14, lineHeight: 20, fontWeight: '500' },
  captionMd:        { fontFamily: fontFamily.pretendard, fontSize: 13, lineHeight: 18, fontWeight: '500' },
};

export const spacing = {
  base: 8,
  touchMin: 48,
  gutterDesktop: 32,
  marginMobile: 20,
  stackSm: 12,
  stackMd: 24,
  stackLg: 48,
};

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  card: 32,
  full: 9999,
};

export const shadow = {
  sm: {
    shadowColor: '#3E4C7D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#3E4C7D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#3E4C7D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
};
