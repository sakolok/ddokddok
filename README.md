# 똑똑똑

> AWS 서버리스 기반 시니어 음성 AI 케어 플랫폼

똑똑똑은 시니어 사용자가 음성으로 일상과 감정 상태를 기록하고, 보호자가 대화/활동 신호를 확인할 수 있도록 설계한 AWS 서버리스 기반 음성 AI 케어 플랫폼입니다.

## Tech Stack

**Frontend**

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)

**Backend / AI**

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS%20Lambda-FF9900?style=for-the-badge)
![API Gateway](https://img.shields.io/badge/API%20Gateway-FF4F8B?style=for-the-badge)
![Amazon Bedrock](https://img.shields.io/badge/Amazon%20Bedrock-232F3E?style=for-the-badge)
![Bedrock Knowledge Bases](https://img.shields.io/badge/Bedrock%20Knowledge%20Bases-232F3E?style=for-the-badge)
![Amazon Polly](https://img.shields.io/badge/Amazon%20Polly-146EB4?style=for-the-badge)
![Amazon Transcribe](https://img.shields.io/badge/Amazon%20Transcribe-146EB4?style=for-the-badge)

**AWS Cloud**

![Amazon Cognito](https://img.shields.io/badge/Amazon%20Cognito-DD344C?style=for-the-badge)
![DynamoDB](https://img.shields.io/badge/DynamoDB-4053D6?style=for-the-badge)
![Amazon S3](https://img.shields.io/badge/Amazon%20S3-569A31?style=for-the-badge)
![Amazon SQS](https://img.shields.io/badge/Amazon%20SQS-FF4F8B?style=for-the-badge)
![Amazon SNS](https://img.shields.io/badge/Amazon%20SNS-FF4F8B?style=for-the-badge)
![CloudWatch](https://img.shields.io/badge/CloudWatch-FF4F8B?style=for-the-badge)
![AWS SAM](https://img.shields.io/badge/AWS%20SAM-232F3E?style=for-the-badge)

## Architecture

![똑똑똑 AWS 서버리스 아키텍처](docs/assets/ddokddok-architecture.png)

1. 사용자는 React/Vite PWA에서 Cognito 기반 로그인 또는 회원가입을 수행합니다.
2. 프론트엔드는 API Gateway REST API를 통해 세션, 대화, 음성 처리, 활동 기록 API를 호출합니다.
3. 실시간 음성 입력 시 Lambda가 Transcribe Streaming용 presigned WebSocket URL을 발급합니다.
4. 브라우저는 Amazon Transcribe Streaming에 직접 연결해 음성을 텍스트로 변환합니다.
5. /turn Lambda는 최근 대화와 KDSQ 정책을 구성하고, 필요한 경우 Bedrock Knowledge Base를 조회한 뒤 Amazon Bedrock을 호출합니다.
6. Bedrock 응답은 Amazon Polly로 음성 합성되며 결과 파일은 S3에 저장되고 presigned URL로 반환됩니다.
7. 대화, KDSQ 응답, 자가 문진, 활동 데이터는 DynamoDB에 저장됩니다.
8. 세션 종료 시 /session/end가 분석 요청을 SQS에 전달합니다.
9. Analysis Lambda는 최근 7일 KDSQ 응답을 집계해 세션 분석 결과를 저장하고, 기준 충족 시 SNS로 보호자에게 알립니다.

## Engineering Decisions

### 1. 실시간 요청과 비동기 분석 워크로드 분리

**Problem**

음성 대화 응답과 세션 분석, 보호자 알림을 하나의 동기 요청에서 처리하면 분석 작업이나 외부 서비스 지연이 사용자 대화 응답까지 영향을 줄 수 있습니다.

실시간 대화와 세션 종료 후 분석은 처리 시간과 실패 특성이 다르기 때문에 서로 다른 실행 경로가 필요했습니다.

**Solution**

- 실시간 대화는 API Gateway → `/turn` Lambda에서 처리합니다.
- 세션 종료 후 분석은 `/session/end`가 SQS에 작업을 전달하고, 별도의 Analysis Lambda가 소비합니다.
- Analysis Lambda는 최근 7일 KDSQ 응답을 집계해 결과를 저장하고, 설정된 기준을 충족하면 SNS로 보호자 알림을 전송합니다.
- 분석 실패는 SQS 재시도와 DLQ로 처리합니다. 메시지는 최대 3회 수신 후 DLQ로 이동하며, DLQ에 메시지가 쌓이면 CloudWatch Alarm이 감지합니다.

```text
[실시간 대화]
Client → API Gateway → Turn Lambda ─┬─ Bedrock
                                    └─ Polly

[세션 종료 후 분석]
/session/end → SQS → Analysis Lambda ─┬─ KDSQ 응답 집계
                                      └─ SNS (보호자 알림)

[분석 실패 처리]
SQS → Analysis Lambda ─┬─ 성공 → 분석 결과 저장
                       └─ 실패 → 재시도 → 3회 수신 후 DLQ → CloudWatch Alarm
```

**Result**

실시간 대화와 세션 후 분석을 서로 다른 실행 경로로 분리했습니다.

분석 메시지는 최대 3회 수신 후 DLQ로 이동하도록 설정하고, DLQ에 메시지가 발생하면 CloudWatch Alarm이 감지하도록 구성했습니다.

이를 통해 분석 실패를 대화 응답 경로와 분리하고, 후처리 실패를 별도로 확인할 수 있는 운영 경로를 마련했습니다.

### 2. Transcribe Streaming 직접 연결 구조

**Problem**

실시간 음성을 Lambda가 직접 중계하도록 설계할 경우 Lambda가 지속적인 오디오 데이터 전달 경로에 포함됩니다.

이 구조에서는 Lambda가 실제 음성 처리와 무관한 스트리밍 중계 역할까지 담당하게 되므로, 서버리스 컴퓨팅과 음성 Streaming 서비스의 책임을 분리할 필요가 있었습니다.

**Solution**

Lambda는 음성 데이터를 중계하지 않고, Transcribe Streaming에 접속하기 위한 **presigned WebSocket URL 발급**만 담당하도록 역할을 제한했습니다. 클라이언트는 발급받은 URL로 Transcribe Streaming에 직접 연결해 음성 chunk를 전송합니다.

```text
1) Client ──(presigned URL 요청)──▶ Lambda ──(URL 발급)──▶ Client
2) Client ══(WebSocket 직접 연결 · 음성 chunk 전송)══▶ Amazon Transcribe Streaming
```

실시간 Streaming 경로와 별도로, S3 기반 `/transcribe` 음성 처리 API(batch fallback)도 구현해 두었습니다.


**Result**

Cognito 인증과 사용자 접근 확인을 거친 요청에만 Transcribe Streaming 접속 URL을 발급했습니다. 브라우저가 해당 URL로 Transcribe에 직접 연결해 음성 데이터를 전송하므로 Lambda는 스트리밍 중계 경로에 포함되지 않습니다. 이를 통해 Lambda는 짧은 URL 발급 요청을 처리하고, 지속적인 음성 스트림은 Transcribe가 담당하도록 책임을 분리했습니다.

### 3. 장애 구간 관측과 IaC 기반 배포 구조 구축

**Problem**

음성 AI 서비스는 Lambda뿐 아니라 Transcribe, Bedrock, Knowledge Base, Polly, SQS 등 여러 AWS Managed Service를 연결하기 때문에 장애 발생 지점이 분산됩니다.

단순히 Lambda 성공 여부만 확인해서는 음성 인식, AI 호출, 음성 합성, 비동기 처리 중 어느 구간에서 문제가 발생했는지 구분하기 어렵습니다.

또한 여러 AWS 리소스를 수동으로 구성할 경우 동일한 환경을 다시 구축하거나 설정 변경을 추적하기 어렵습니다.

**Solution**

CloudWatch Custom Metric, Alarm, Dashboard를 이용해 주요 처리 단계를 구분해 관측할 수 있도록 구성했습니다.

Transcribe Streaming URL 발급
Polly 음성 합성 실패 및 fallback
Bedrock 호출 및 fallback
Knowledge Base 조회 성공 / 빈 결과 / 실패
SQS 및 DLQ 상태
Lambda 실행 상태

Polly는 특정 엔진에서 음성 합성이 실패할 경우 다음 엔진을 시도하도록 fallback 경로를 구성했습니다.

Generative
    │
  failure
    ▼
 Neural
    │
  failure
    ▼
Standard

또한 주요 AWS 인프라는 AWS SAM 템플릿으로 코드화했습니다.

API Gateway
Lambda
Cognito
DynamoDB
S3
SQS / DLQ
SNS
Bedrock Knowledge Base
S3 Vectors
CloudWatch Alarm / Dashboard

**Result**

서비스별 지표와 CloudWatch Dashboard를 구성해 음성 인식, AI 호출, 음성 합성, 비동기 분석 중 어느 구간에서 문제가 발생했는지 구분할 수 있는 관측 구조​를 마련했습니다.

또한 주요 AWS 리소스를 SAM으로 관리해 인프라 구성을 코드로 유지하고, 동일한 서버리스 환경을 다시 배포할 수 있도록 구성했습니다.


## AI & Application Design
Selective RAG with Bedrock Knowledge Base

모든 대화에 RAG를 적용하는 대신, 사실 기반 응답이 필요한 요청에서만 Bedrock Knowledge Base를 조회하도록 구성했습니다.

Knowledge Base가 사용되는 주요 영역은 다음과 같습니다.

KDSQ 관련 설명
자가 문진 안내
보호자 알림 기준
서비스 사용 안내

KB 문서는 S3 care-guides/에 저장하고, S3 Vectors 기반 Knowledge Base와 Titan Embeddings를 이용해 검색하도록 구성했습니다.

일반적인 정서 대화는 기존 대화 정책을 우선하고, 예약 시간이나 가족 연락 여부처럼 시스템이 확인할 수 없는 정보는 Bedrock 호출 전에 guard rule을 적용해 확인할 수 없는 사실에 대한 임의 답변 위험을 줄였습니다.

Context-aware KDSQ Flow

KDSQ 질문이 일반 설문처럼 반복되지 않도록 서버 측에서 다음 조건을 관리했습니다.

최소 대화 턴
질문 간격
하루 질문 제한
최근 사용 질문 제외
대화 맥락에 따른 질문 선택
감정 호소 또는 가족 걱정 상황에서 질문 연기

수집된 KDSQ 응답은 세션 종료 후 최근 7일 기준으로 집계해 분석 결과와 보호자 알림 판단에 활용하도록 구성했습니다.

## Data Model

| 테이블 / 저장소 | 역할 |
|---|---|
| `UsersTable` | 사용자 프로필, 보호자 이메일, Cognito username, 보호자 PIN 정보 저장 |
| `SessionsTable` | 대화 세션, KDSQ 진행 상태, 분석 상태 저장 |
| `TurnsTable` | 사용자 발화와 AI 응답, 응답 태그, timestamp 저장 |
| `KdsqResponsesTable` | 대화 중 수집된 KDSQ 기반 응답과 질문 유형 저장 |
| `SelfAssessmentsTable` | 자가 문진 응답, 점수, 7일 평균, 알림 여부 저장 |
| `ActivityTable` | 채팅/게임 활동 시간, 점수, 게임 유형 저장 |
| `S3 polly/` | Polly 음성 합성 결과 저장, 7일 lifecycle 적용 |
| `S3 transcribe-input/`, `transcribe-output/` | Transcribe batch fallback 입력/결과 저장, 1일 lifecycle 적용 |
| `S3 care-guides/` | Knowledge Base 원본 문서 저장 |
| `S3 Vectors` | Bedrock Knowledge Base 검색용 vector bucket/index 저장 |

## 주요 기능

- 시니어/보호자 계정 흐름과 보호자 PIN 검증
- 음성 기반 AI 대화, STT/TTS 연동, 텍스트 fallback 입력
- KDSQ 기반 질문 삽입과 진단 표현 방지 정책
- Bedrock Knowledge Base 기반 KDSQ/서비스 안내 응답 보강
- 카드 매칭, 숫자 기억, 빠른 계산, 색상 인식, Kiro 퍼즐 두뇌 게임
- 보호자 대시보드에서 주간 대화/게임 활동, KDSQ 신호, 우려 예시 확인
- 자가 문진 점수와 보호자 알림 기준 관리
- CloudWatch 기반 Lambda/AI/음성 처리 관측성

## Local Development

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd infra
sam build
sam deploy --profile noin-dev --region ap-northeast-2
```

기본 API URL은 [frontend/lib/api.ts](frontend/lib/api.ts)의 `DEFAULT_API_BASE_URL` 또는 `VITE_API_BASE_URL` 환경 변수로 조정합니다.

## Quality Check

```bash
cd frontend
npm run build

cd ..
python3 -m compileall -q backend

cd infra
sam validate --lint
```

## Deployment

백엔드는 AWS SAM으로 배포합니다.

```bash
cd infra
sam build
sam deploy --profile noin-dev --region ap-northeast-2
```

프론트엔드는 정적 빌드 산출물을 AWS Amplify Hosting 또는 정적 호스팅 환경에 연결해 배포합니다.

```bash
cd frontend
npm run build
```

`BedrockModelId`, `BedrockInvokeResourceArn`, `OpsAlertEmail` 등 배포 파라미터는 [infra/template.yaml](infra/template.yaml)과 [infra/README.md](infra/README.md)를 기준으로 조정합니다.

## Team

<table>
  <tbody>
    <tr>
      <td><strong>강옥일</strong><br/>AWS Architecture / Full-stack<br/>AWS 서버리스 아키텍처 설계, SAM 인프라 구성, Lambda API 구현, Bedrock/Polly/Transcribe 연동, 프론트엔드 음성 대화 흐름 통합</td>
    </tr>
  </tbody>
</table>
