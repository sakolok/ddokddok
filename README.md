# 똑똑똑

> AWS 서버리스 기반 시니어 음성 AI 케어 플랫폼

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=111111)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Mobile_App-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![AWS SAM](https://img.shields.io/badge/AWS_SAM-Serverless-FF9900?style=for-the-badge)

똑똑똑은 시니어 사용자가 음성으로 일상과 감정을 기록하고, 보호자가 대화/활동 신호를 확인할 수 있는 케어 보조 서비스입니다. React PWA 프론트엔드와 AWS SAM 기반 서버리스 백엔드를 분리하고, API Gateway, Lambda, DynamoDB, S3, SQS, SNS, Cognito, Bedrock, Polly, Transcribe를 조합해 음성 대화부터 보호자 알림까지 연결했습니다.

의료 진단 서비스가 아니라, 대화와 활동 데이터를 기반으로 보호자가 참고할 수 있는 정서/인지 신호를 정리하는 포트폴리오 프로젝트입니다.

## 핵심 기능

- 시니어/보호자 계정 흐름: Cognito 인증, 보호자 PIN 검증, 보호자 대시보드 진입
- 음성 대화: Transcribe Streaming 기반 음성 입력, Bedrock 응답 생성, Polly 음성 합성, S3 presigned URL 반환
- 인지 신호 기록: 대화 중 KDSQ 기반 질문을 자연스럽게 삽입하고 DynamoDB에 응답/태그 저장
- 활동 분석: 채팅과 두뇌 게임 활동을 집계해 주간 요약, KDSQ 신호, 게임 통계를 제공
- 비동기 알림: 세션 종료 후 SQS 분석 큐를 통해 Lambda 분석을 실행하고 SNS로 보호자 알림 발송
- 운영 관점: CloudWatch metric/alarm/dashboard, S3 lifecycle, optional budget alert 설정 포함

## 아키텍처

![똑똑똑 AWS 서버리스 아키텍처](docs/assets/ddokddok-architecture.png)

### 처리 흐름

1. 사용자는 React/Vite PWA에 접속하고 Cognito 기반 로그인 또는 회원가입을 수행합니다.
2. 프론트엔드는 API Gateway REST API를 통해 인증, 세션, 대화, 음성 인식, 활동 기록 API를 호출합니다.
3. `/turn` Lambda는 최근 대화와 KDSQ 정책을 바탕으로 Bedrock을 호출하고, 응답을 Polly로 합성한 뒤 S3 presigned URL을 반환합니다.
4. 음성 입력은 브라우저가 Transcribe Streaming WebSocket에 직접 연결하도록 Lambda가 presigned URL을 발급합니다.
5. 대화, KDSQ 응답, 자가 문진, 활동 로그는 DynamoDB 테이블에 분리 저장됩니다.
6. `/session/end`는 분석 요청을 SQS에 넣고, 분석 Lambda가 대화/KDSQ/활동 데이터를 요약해 필요 시 SNS로 보호자에게 알립니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, PWA Service Worker |
| Backend | Python 3.14, AWS Lambda, API Gateway REST API |
| AI/Voice | Amazon Bedrock, Amazon Polly, Amazon Transcribe Streaming |
| Data | DynamoDB, S3 presigned URL, S3 lifecycle policy |
| Auth | Amazon Cognito User Pool, API Gateway Cognito Authorizer |
| Async/Notify | SQS, SNS |
| IaC/Ops | AWS SAM, CloudFormation, CloudWatch metrics/alarms/dashboard |

## API 개요

| API | 역할 |
| --- | --- |
| `POST /auth/signup` | 시니어 계정 생성, 보호자 이메일/SNS 구독 연결 |
| `POST /auth/login` | Cognito 로그인 및 JWT 반환 |
| `POST /auth/guardian/verify` | 보호자 모드 진입 PIN 검증 |
| `POST /start` | 대화 세션 생성 및 환영 음성 반환 |
| `POST /transcribe` | 짧은 녹음 파일의 batch Transcribe fallback |
| `POST /transcribe/stream-url` | Transcribe Streaming WebSocket presigned URL 발급 |
| `POST /turn` | 사용자 발화 처리, Bedrock 응답 생성, Polly 음성 반환 |
| `POST /session/end` | 세션 종료 및 비동기 분석 큐 적재 |
| `GET /activity/weekly` | 보호자 대시보드용 주간 활동/KDSQ 요약 |

상세 스키마는 [docs/api.md](docs/api.md)를 참고합니다.

## 클라우드 엔지니어링 포인트

- AWS SAM 템플릿으로 API, Lambda, DynamoDB, Cognito, S3, SQS, SNS, CloudWatch 리소스를 코드화했습니다.
- API Gateway Cognito Authorizer와 Lambda IAM policy를 분리해 인증 경계와 서비스 호출 권한을 명확히 했습니다.
- 대화 응답 경로와 세션 분석 경로를 분리해, 사용자 응답 지연을 줄이고 분석/알림은 SQS 기반 비동기로 처리했습니다.
- Polly/Transcribe 오디오 객체는 S3 prefix별 lifecycle rule로 보관 기간을 제한했습니다.
- Bedrock/Polly/Transcribe/SQS/Lambda 지표를 CloudWatch alarm/dashboard로 묶어 운영 관찰 가능성을 확보했습니다.

## 로컬 실행

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd infra
sam build
sam deploy --profile noin-dev --region ap-northeast-2
```

`BedrockModelId`, `BedrockInvokeResourceArn`, `OpsAlertEmail` 등 배포 파라미터는 [infra/template.yaml](infra/template.yaml)과 [infra/README.md](infra/README.md)를 기준으로 조정합니다.

## 프로젝트 구조

```text
.
├── backend/        # Python Lambda handlers and shared AWS helpers
├── docs/           # API docs and architecture assets
├── frontend/       # React/Vite PWA client
├── infra/          # AWS SAM/CloudFormation template
└── scripts/        # migration and maintenance scripts
```

## 저장소 정리

프로젝트와 무관한 AI agent workspace 파일이 섞이지 않도록 `.gitignore`에 `AGENTS.md`, `CLAUDE.md`, `.codex/`, `.claude/`, `.cursor/`, `.aider*`, `.windsurf/` 패턴을 추가했습니다.
