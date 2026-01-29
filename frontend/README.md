# 똑똑똑 - PWA 앱

AI 챗봇과 두뇌 훈련 게임이 있는 마음 건강 관리 Progressive Web App입니다.

## 🚀 주요 기능

### 📱 PWA (Progressive Web App)
- **앱 설치**: 홈 화면에 추가하여 네이티브 앱처럼 사용
- **오프라인 지원**: Service Worker를 통한 캐시 기능
- **모바일 최적화**: 터치 인터페이스 및 반응형 디자인
- **푸시 알림**: 브라우저 알림 지원 (선택사항)

### 🔐 인증 시스템
- **로그인**: 아이디/비밀번호
- **회원가입**: 아이디, 비밀번호, 성함, 나이, 성별, 가족자 대표번호

### 🤖 AI 챗봇
- **AWS Bedrock** 기반 AI 대화 (데모 모드)
- **음성 인식** (STT): 말로 메시지 입력
- **음성 합성** (TTS): AI 응답을 음성으로 듣기
- **실시간 채팅**: 부드러운 대화 경험

### 🧠 두뇌 훈련 게임 (5종)
- **카드 매칭**: 같은 그림 찾기
- **숫자 기억**: 순서대로 기억하기
- **빠른 계산**: 두뇌 활성화
- **색상 인식**: 우뇌 자극 훈련
- **Kiro 퍼즐**: 4x4 조각 맞추기

### 🎨 UI/UX 특징
- **통일된 디자인**: 파란색-보라색 그라데이션 테마
- **반응형**: 모바일/태블릿/데스크톱 지원
- **접근성**: 글씨 크기 조절 기능
- **부드러운 애니메이션**: 자연스러운 전환 효과

## 📱 앱 설치 방법

### Android (Chrome)
1. 웹사이트 접속
2. 주소창 옆 "설치" 버튼 클릭
3. 또는 메뉴 → "홈 화면에 추가"

### iOS (Safari)
1. 웹사이트 접속
2. 공유 버튼 (⬆️) 탭
3. "홈 화면에 추가" 선택

### Desktop (Chrome/Edge)
1. 웹사이트 접속
2. 주소창 옆 설치 아이콘 클릭
3. "설치" 버튼 클릭

## 🛠️ 개발 환경

### 기술 스택
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PWA**: Service Worker + Web App Manifest

### 로컬 개발
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 프리뷰 (빌드된 앱 테스트)
npm run preview
```

### PWA 빌드
```bash
# PWA 빌드 (아이콘 생성 포함)
npm run build:pwa

# 로컬에서 PWA 테스트
npm run serve
```

## 🌐 배포

### Vercel 배포
```bash
npm run deploy
```

### 기타 플랫폼
- **Netlify**: `dist` 폴더 업로드
- **GitHub Pages**: GitHub Actions 사용
- **Firebase Hosting**: `firebase deploy`

## 📁 프로젝트 구조

```
├── app/
│   ├── components/
│   │   ├── AuthPage.tsx      # 로그인/회원가입
│   │   ├── HomePage.tsx      # 홈 화면
│   │   ├── ChatbotPage.tsx   # AI 챗봇
│   │   ├── GameMenu.tsx      # 게임 메뉴
│   │   ├── Layout.tsx        # 공통 레이아웃
│   │   ├── InstallPrompt.tsx # PWA 설치 프롬프트
│   │   └── ui/               # UI 컴포넌트
│   └── App.tsx               # 메인 앱
├── public/
│   ├── manifest.json         # PWA 매니페스트
│   ├── sw.js                 # Service Worker
│   └── icon-*.png            # 앱 아이콘들
├── styles/
│   ├── index.css             # 메인 스타일
│   ├── mobile.css            # 모바일 최적화
│   └── theme.css             # 테마 설정
└── scripts/
    └── generate-icons.js     # 아이콘 생성 스크립트
```

## 🔧 설정 파일

### PWA 매니페스트 (`public/manifest.json`)
- 앱 이름, 아이콘, 테마 색상 등 설정
- 설치 가능한 웹앱으로 만드는 핵심 파일

### Service Worker (`public/sw.js`)
- 오프라인 캐싱
- 백그라운드 동기화
- 푸시 알림 처리

## 🚀 성능 최적화

- **코드 분할**: Vendor와 UI 라이브러리 분리
- **이미지 최적화**: WebP 형식 지원
- **캐싱 전략**: Service Worker를 통한 효율적 캐싱
- **번들 최적화**: Tree shaking 및 압축

## 📱 모바일 최적화

- **터치 인터페이스**: 터치 피드백 및 제스처 지원
- **뷰포트 최적화**: Safe area 대응
- **키보드 대응**: 모바일 키보드 호환성
- **성능**: 60fps 부드러운 애니메이션

## 🔒 보안

- **HTTPS 필수**: PWA는 HTTPS에서만 동작
- **CSP 헤더**: Content Security Policy 적용
- **데이터 보호**: 로컬 스토리지 암호화 고려

## 📞 지원

문의사항이나 버그 리포트는 GitHub Issues를 통해 제출해주세요.

---

**똑똑똑**으로 매일 건강한 마음을 유지하세요! 💙💜