# Elder Voice Companion Backend (SAM)

## Prerequisites
- AWS CLI configured
- AWS SAM CLI installed

## Build
```
cd infra
sam build
```

## Deploy
```
cd infra
sam deploy --profile noin-dev --region ap-northeast-2
```

## Notes
- Update `infra/samconfig.toml` if you want a different region/stack name.
- Bedrock runtime model is controlled by the `BedrockModelId` parameter.
- Protected user APIs use the Cognito authorizer; the frontend sends the login `id_token`.
- Optional ops email: deploy with `--parameter-overrides Stage=dev OpsAlertEmail=you@example.com` to create alarm/budget email subscriptions.
