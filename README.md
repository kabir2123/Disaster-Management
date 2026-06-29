# ResQ Backend

Serverless disaster-response API built with **Go**, **AWS Lambda**, **API Gateway**, **DynamoDB**, **SNS**, **S3**, and **EventBridge**.

No frontend yet — test with Postman or curl. All services are chosen to stay within the **AWS Free Tier**.

## Features

- JWT auth (`/auth/register`, `/auth/login`)
- Incident reporting, listing, assign, resolve
- Resource registration and status updates
- S3 presigned URLs for evidence upload
- Auto-escalation after 30 minutes (EventBridge + Lambda)
- Severity-5 SNS alerts
- SMS ingest webhook (`POST /sms/ingest`)

## Free Tier Notes

| Service | Free tier usage |
|---------|-----------------|
| Lambda | 1M requests/month |
| API Gateway REST API | 1M requests/month (12 months) |
| DynamoDB | 25 GB storage, on-demand pricing |
| SNS | Email notifications (subscribe your email to the topic) |
| S3 | 5 GB storage |
| EventBridge | Scheduled rules are free |

SMS via SNS is **not** free — the SMS ingest endpoint stores incidents from a JSON webhook; wire a real SMS provider later if needed.

## Prerequisites

- Go 1.22+
- AWS CLI configured (`aws configure`)
- AWS SAM CLI (`brew install aws-sam-cli`)

## Deploy to AWS

```bash
make tidy
make sam-build
make sam-deploy
```

After deploy:

1. Copy the `ApiUrl` from stack outputs — REST API URLs include the stage: `...amazonaws.com/prod`
2. Update Postman `baseUrl` to that URL (with `/prod`, no trailing slash)
3. Subscribe your email to the `AlertsTopicArn` SNS topic (AWS Console → SNS → Create subscription → Email)

Set a strong JWT secret on deploy (SAM will prompt for `JWTSecret`).

## Local Development

Local mode runs without Lambda. You still need AWS credentials for DynamoDB/S3/SNS, or point tables at deployed stack resources:

```bash
export JWT_SECRET=dev-secret
export USERS_TABLE=resq-users
export INCIDENTS_TABLE=resq-incidents
export RESOURCES_TABLE=resq-resources
export EVIDENCE_BUCKET=your-bucket-name
export SNS_TOPIC_ARN=arn:aws:sns:...

make local-api
```

API: `http://localhost:8080`

Import `postman/ResQ.postman_collection.json` into Postman.

## API Endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/health` | No |
| POST | `/auth/register` | No |
| POST | `/auth/login` | No |
| POST | `/incident/report` | Yes |
| GET | `/incident/{district}` | Yes |
| GET | `/incident/{district}/{id}` | Yes |
| PATCH | `/incident/{district}/{id}/assign` | Admin |
| PATCH | `/incident/{district}/{id}/resolve` | Admin, Responder |
| POST | `/incident/{district}/{id}/evidence` | Yes |
| POST | `/resource/register` | Admin, Coordinator |
| GET | `/resource/{district}` | Yes |
| PATCH | `/resource/{district}/{id}/status` | Admin, Coordinator |
| POST | `/sms/ingest` | No (webhook) |

## Roles

`citizen`, `responder`, `admin`, `coordinator`

## Project Layout

```
cmd/api/          Main HTTP API
cmd/escalation/   Scheduled escalation job
cmd/sms/          SMS ingest webhook
internal/         Auth, handlers, store, notifications
template.yaml     AWS SAM infrastructure
postman/          API collection
```

## Next Steps

- Push to GitHub and add AWS secrets for auto-deploy (see below)
- Run `./scripts/smoke-test.sh <ApiUrl>` after deploy
- **Frontend:** `cd frontend && cp .env.local.example .env.local` — set `NEXT_PUBLIC_API_URL` to your deployed API URL (with `/prod`), then `npm run dev`

## CI/CD (GitHub Actions)

**CI** runs on every push/PR: `go test`, Lambda builds, `sam validate`, `sam build`.

**Deploy** runs on push to `main` (or manually via Actions → Deploy → Run workflow).

Add these GitHub repository secrets:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `JWT_SECRET` | Strong random string for JWT signing |

Optional repository variable: `AWS_REGION` (defaults to `us-east-1`).

For local one-time deploy without CI:

```bash
cp samconfig.toml.example samconfig.toml
# edit JWT secret in samconfig.toml
make sam-build
sam deploy
```

## Smoke Test

After deploy or with local API running:

```bash
./scripts/smoke-test.sh http://localhost:8080
# or
./scripts/smoke-test.sh https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com
```
