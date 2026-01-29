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
sam deploy
```

## Notes
- Update `infra/samconfig.toml` if you want a different region/stack name.
- After deploy, subscribe guardian email to the SNS topic in the AWS Console.
- Set `BEDROCK_MODEL_ID` and `MOCK_LLM=false` in Lambda environment variables to enable Bedrock.
```
