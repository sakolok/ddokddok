# Elder Voice Companion - API 스키마 (프론트 연동)

Base URL (dev)
```
https://vwjc2p1w4e.execute-api.ap-northeast-2.amazonaws.com/dev
```

Common
- Content-Type: application/json
- `/auth/signup`, `/auth/login` 외 사용자 데이터 API는 `Authorization: Bearer <id_token>` 필요
- 모든 타임스탬프는 ISO-8601 (UTC)
- CORS 활성화

---

## POST /auth/signup
회원가입 (시니어/보호자 구분).

Request
```json
{
  "username": "senior_username",
  "password": "plain_password",
  "display_name": "홍길동",
  "guardian_email": "guardian@example.com",
  "pin": "1234",
  "gender": "남|여|기타"
}
```

Notes
- 로그인은 `username + password`로 통일합니다.
- 보호자 모드는 로그인 후 PIN 인증으로 진입합니다.
- 가입 시 `guardian_email`을 저장하고 SNS 구독을 1회 생성합니다.

Response 200
```json
{
  "role": "senior",
  "user_id": "user_..."
}
```

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_required_fields"} | {"message":"pin_must_be_4_digits"}
- 409: {"message":"user_exists"}

---

## POST /auth/login
로그인. username + password.

Request
```json
{
  "username": "senior_username",
  "password": "plain_password"
}
```

Response 200
```json
{
  "role": "senior",
  "access_token": "jwt",
  "id_token": "jwt",
  "refresh_token": "jwt",
  "expires_in": 3600,
  "user_id": "user_..."
}
```

Notes
- 보호자 모드는 `/auth/guardian/verify` 성공 후 진입합니다.

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_required_fields"}
- 401: {"message":"invalid_credentials"}

---

## POST /auth/guardian/verify
보호자 모드 진입용 PIN 검증.

Request
```json
{
  "user_id": "user_...",
  "pin": "1234"
}
```

Response 200
```json
{
  "ok": true
}
```

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_required_fields"} | {"message":"pin_must_be_4_digits"} | {"message":"pin_not_set"}
- 401: {"message":"invalid_pin"}
- 404: {"message":"not_found"}

---

## POST /start
세션 생성. (회원가입된 user_id가 있으면 해당 사용자로 세션 생성)

Request
```json
{
  "user_id": "user_...",
  "display_name": "홍길동",
  "guardian_email": "guardian@example.com",
  "consent": true
}
```

Notes
- 회원가입 이후에는 `user_id`만 전달해도 됩니다.

Response 200
```json
{
  "user_id": "user_...",
  "session_id": "session_...",
  "welcome_text": "안녕하세요 홍길동님! 오늘 기분은 어떠신가요? 편하게 이야기해주세요.",
  "audio": {
    "s3_key": "polly/....mp3",
    "url": "https://...presigned-url..."
  }
}
```

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_required_fields"}

---

## POST /transcribe
브라우저 Web Speech API가 실패하거나 지원되지 않는 경우, 녹음 파일을 AWS Transcribe로 변환합니다.

Request
```json
{
  "user_id": "user_...",
  "session_id": "session_...",
  "content_type": "audio/webm",
  "audio_base64": "base64-encoded-audio"
}
```

Response 200
```json
{
  "transcript": "오늘은 산책을 다녀왔어요.",
  "job_name": "elder-voice-...",
  "language_code": "ko-KR"
}
```

Notes
- `/transcribe`는 Cognito 인증이 필요합니다.
- 입력 음성은 S3 `transcribe-input/`, 결과 JSON은 `transcribe-output/`에 저장되고 Lifecycle로 1일 후 만료됩니다.
- API Gateway 응답 시간 한계 때문에 짧은 음성 녹음에 맞춘 batch Transcribe fallback입니다. 장시간/실시간 대화는 Transcribe Streaming 구조가 필요합니다.

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_required_fields"} | {"message":"invalid_audio_base64"}
- 413: {"message":"audio_too_large"}
- 415: {"message":"unsupported_audio_type"}
- 502: {"message":"transcribe_failed"}
- 504: {"message":"transcribe_timeout"}

---

## POST /transcribe/stream-url
실시간 음성 인식을 위해 AWS Transcribe Streaming WebSocket presigned URL을 발급합니다.

Request
```json
{
  "user_id": "user_...",
  "session_id": "session_..."
}
```

Response 200
```json
{
  "url": "wss://transcribestreaming.ap-northeast-2.amazonaws.com:8443/stream-transcription-websocket?...",
  "language_code": "ko-KR",
  "media_encoding": "pcm",
  "sample_rate": 16000,
  "expires_in": 300
}
```

Notes
- `/transcribe/stream-url`은 Cognito 인증이 필요합니다.
- 브라우저는 이 URL로 Transcribe Streaming WebSocket에 직접 연결하고, 16kHz PCM 오디오 이벤트를 전송합니다.
- Lambda는 URL 발급만 담당합니다. 오디오 chunk를 Lambda/API Gateway request-response로 보내지 않습니다.
- URL은 짧은 만료 시간을 가지며, 발급 Lambda 역할은 `transcribe:StartStreamTranscriptionWebSocket`만 허용합니다.

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_required_fields"}
- 500: {"message":"transcribe_stream_url_error"}

---

## POST /turn
최종 음성 인식 결과(user turn)를 보내고, assistant 응답 + 오디오를 받습니다.

Request
```json
{
  "session_id": "session_...",
  "user_id": "user_...",
  "final_transcript": "요즘 날씨가 추워서 밖에 잘 못 나가요."
}
```

Response 200
```json
{
  "assistant_text": "요즘 날씨가 추워 밖에 나가기 어려운군요. ...",
  "audio": {
    "s3_key": "polly/....mp3",
    "url": "https://...presigned-url..."
  },
  "tags": {
    "kdsq_item_id": "NONE | orientation | memory | mood | social | daily",
    "risk_hint": "NONE | concern"
  }
}
```

Notes
- `audio.url`은 presigned URL입니다(기본 1시간).
- `kdsq_item_id`는 assistant 발화에 KDSQ 유형 질문이 실제 포함된 경우에만 설정됩니다.

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_required_fields"}
- 500: {"message":"Internal server error"} (CloudWatch 로그 확인)

---

## POST /session/end
세션 종료 및 비동기 분석 작업을 enqueue 합니다.

Request
```json
{
  "session_id": "session_..."
}
```

Response 200
```json
{
  "message": "enqueued"
}
```

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_session_id"}

---

## GET /sessions?user_id=...
사용자 세션 목록 조회(최신순).

Response 200
```json
{
  "items": [
    {
      "session_id": "session_...",
      "user_id": "user_...",
      "start_ts": "2026-01-27T05:13:05.118853+00:00",
      "end_ts": "2026-01-27T06:06:52.745690+00:00",
      "score_total": 75,
      "status_emoji": "🙂",
      "summary": "요약 텍스트",
      "kdsq_injected_count_by_type": {
        "memory": 1,
        "mood": 0
      }
    }
  ]
}
```

Errors
- 400: {"message":"missing_user_id"}

---

## GET /sessions/{session_id}
세션 상세 + 대화 턴 조회.

Response 200
```json
{
  "session": {
    "session_id": "session_...",
    "user_id": "user_...",
    "start_ts": "2026-01-27T05:13:05.118853+00:00",
    "end_ts": "2026-01-27T06:06:52.745690+00:00",
    "score_total": 75,
    "status_emoji": "🙂",
    "summary": "요약 텍스트",
    "kdsq_injected_count_by_type": {}
  },
  "turns": [
    {
      "session_id": "session_...",
      "timestamp": "2026-01-27T05:13:40.000000+00:00",
      "role": "user",
      "text": "요즘 날씨가 추워서 밖에 잘 못 나가요.",
      "tags": { "kdsq_item_id": "NONE" }
    },
    {
      "session_id": "session_...",
      "timestamp": "2026-01-27T05:13:41.000000+00:00",
      "role": "assistant",
      "text": "요즘 날씨가 추워 밖에 나가기 어려운군요. ...",
      "tags": { "kdsq_item_id": "NONE" }
    }
  ]
}
```

Errors
- 400: {"message":"missing_session_id"}
- 404: {"message":"not_found"}

---

## POST /self-assessment
자가문진 점수 저장 및 7일 평균 계산.

Request
```json
{
  "user_id": "user_...",
  "assessment_date": "YYYY-MM-DD",
  "answers": [true, false, true, ...] 
}
```

Notes
- `answers`는 15문항, 맞음(true/1)일 때 점수가 증가합니다.
- `assessment_date`가 없으면 오늘(UTC)로 저장됩니다.
- 최근 7일 중 **응답한 날만** 평균 계산에 포함합니다.
- 7일 평균 점수가 6 이상이면 SNS 알림이 발송됩니다.

Response 200
```json
{
  "user_id": "user_...",
  "assessment_date": "YYYY-MM-DD",
  "score": 8,
  "avg_7d": 6.4,
  "notified": true
}
```

Errors
- 400: {"message":"invalid_json"} | {"message":"missing_required_fields"} | {"message":"answers_must_be_15"}

---

## 응답 태그 레퍼런스
- kdsq_item_id:
  - NONE
  - orientation
  - memory
  - mood
  - social
  - daily
- risk_hint:
  - NONE
  - concern
