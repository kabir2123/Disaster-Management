# ResQ Project Overview

## What This Project Is

ResQ is a backend API for disaster response coordination. It lets citizens, responders, coordinators, and administrators report incidents, track incidents by district, manage response resources, upload evidence through S3 presigned URLs, and trigger alerts for critical incidents.

The project is designed as an AWS free-tier-friendly serverless backend, but it can also run as a normal HTTP server for local development and Docker-based testing.

## Core Capabilities

- User registration and login with JWT authentication.
- Role-based access for `citizen`, `responder`, `admin`, and `coordinator` users.
- Incident reporting with severity, location, description, district, status, assignment, and resolution flow.
- District-scoped incident listing and lookup.
- Resource registration and operational status updates.
- Evidence upload URL generation using S3 presigned URLs.
- Severity-5 notification publishing through SNS.
- Scheduled escalation logic for unresolved incidents.
- SMS webhook ingestion for creating incidents from external SMS providers.

## Architecture

The application is organized as a small Go service with AWS integrations behind internal packages.

```text
Client / Postman / curl
        |
        v
HTTP API or API Gateway
        |
        v
cmd/api
        |
        v
internal/handler
        |
        +--> internal/auth        JWT and password hashing
        +--> internal/middleware  request authentication and role checks
        +--> internal/store       DynamoDB persistence
        +--> internal/storage     S3 presigned upload URLs
        +--> internal/notify      SNS notifications
        +--> internal/models      shared domain models
```

There are three executable entry points:

- `cmd/api`: Main HTTP API. Runs as AWS Lambda behind API Gateway or as a local HTTP server when `AWS_LAMBDA_FUNCTION_NAME` is not set.
- `cmd/escalation`: Scheduled escalation worker for stale unresolved incidents.
- `cmd/sms`: SMS ingest webhook handler.

## Runtime Modes

### AWS Serverless Mode

The `template.yaml` file defines the AWS SAM stack:

- API Gateway exposes the REST API.
- Lambda runs the API, escalation worker, and SMS webhook.
- DynamoDB stores users, incidents, and resources.
- S3 stores incident evidence.
- SNS sends critical incident alerts.
- EventBridge invokes the escalation function on a schedule.

### Local Go Mode

The API can run directly with:

```bash
make local-api
```

The local process still expects AWS configuration for DynamoDB, S3, and SNS unless those calls are replaced or pointed to deployed resources.

### Docker Mode

The project now includes:

- `Dockerfile`: Builds a small Linux container image for the Go API.
- `frontend/Dockerfile`: Builds the Next.js dashboard as a standalone production server.
- `docker-compose.yml`: Runs DynamoDB Local privately, initializes tables, runs the API on host port `8088`, and runs the frontend on host port `3008`.
- `.dockerignore`: Keeps build context small and excludes local artifacts and secrets.

Docker mode uses DynamoDB Local for users, incidents, and resources. It is available inside the Compose network at `resq-dynamodb:8000` and on the host at `localhost:8008` for inspection with the AWS CLI. The API container uses dummy local AWS credentials for signing DynamoDB Local requests.

## Docker Usage

Start the full app:

```bash
docker compose up -d --build
```

For active development, use the dev override so source files are mounted into the containers:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

In dev mode, frontend edits hot-reload through Next.js. Backend edits run from the mounted source; restart only the API service when Go code changes:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml restart resq-api
```

The frontend is available at:

```text
http://localhost:3008
```

The API is available at:

```text
http://localhost:8088
```

Health check:

```bash
curl http://localhost:8088/health
```

Stop only this project container:

```bash
docker compose down
```

The compose file intentionally avoids host ports `3256` and `5173`. Those ports are already used by other running containers on this machine. This project uses host port `8088` for the API and `3008` for the frontend.

## Configuration

Important environment variables:


| Variable              | Purpose                               | Default in Docker Compose         |
| --------------------- | ------------------------------------- | --------------------------------- |
| `PORT`                | Internal HTTP port used by the Go API | `8080`                            |
| `AWS_REGION`          | AWS SDK region                        | `us-east-1`                       |
| `AWS_ACCESS_KEY_ID`   | Local or AWS access key               | `local`                           |
| `AWS_SECRET_ACCESS_KEY` | Local or AWS secret key             | `local`                           |
| `AWS_SDK_LOAD_CONFIG` | Enables shared AWS config loading     | `1`                               |
| `DYNAMODB_ENDPOINT_URL` | DynamoDB endpoint for Docker mode    | `http://resq-dynamodb:8000`       |
| `JWT_SECRET`          | JWT signing secret                    | `dev-secret-change-me`            |
| `USERS_TABLE`         | DynamoDB users table                  | `resq-users`                      |
| `INCIDENTS_TABLE`     | DynamoDB incidents table              | `resq-incidents`                  |
| `RESOURCES_TABLE`     | DynamoDB resources table              | `resq-resources`                  |
| `EVIDENCE_BUCKET`     | S3 bucket for evidence uploads        | `resq-evidence`                   |
| `SNS_TOPIC_ARN`       | SNS topic for critical alerts         | empty, logs notifications instead |
| `NEXT_PUBLIC_API_URL` | Browser-visible API base URL          | `http://localhost:8088`           |


For production-like use, set strong values in your shell or an uncommitted `.env` file before running compose.

If you want the container to use a named AWS profile, add `AWS_PROFILE` to the compose environment or pass AWS access keys through your shell. The compose file does not force a default profile, because a missing profile prevents the API from starting.

## API Surface


| Method  | Path                                 | Auth                                      |
| ------- | ------------------------------------ | ----------------------------------------- |
| `GET`   | `/health`                            | No                                        |
| `POST`  | `/auth/register`                     | No                                        |
| `POST`  | `/auth/login`                        | No                                        |
| `POST`  | `/incident/report`                   | Yes                                       |
| `GET`   | `/incident/{district}`               | Yes                                       |
| `GET`   | `/incident/{district}/{id}`          | Yes                                       |
| `PATCH` | `/incident/{district}/{id}/assign`   | Admin                                     |
| `PATCH` | `/incident/{district}/{id}/resolve`  | Admin, Responder                          |
| `POST`  | `/incident/{district}/{id}/evidence` | Yes                                       |
| `POST`  | `/resource/register`                 | Admin, Coordinator                        |
| `GET`   | `/resource/{district}`               | Yes                                       |
| `PATCH` | `/resource/{district}/{id}/status`   | Admin, Coordinator                        |
| `POST`  | `/sms/ingest`                        | No webhook authentication in this version |


## Tech Stack

- Go 1.23
- Standard library `net/http` router
- AWS Lambda Go runtime
- AWS Lambda Go API Proxy
- AWS SDK for Go v2
- DynamoDB
- S3
- SNS
- EventBridge
- AWS SAM
- Docker and Docker Compose
- DynamoDB Local for Docker development
- Postman collection for manual API testing

## Repository Layout

```text
cmd/api/            Main API executable
cmd/escalation/     Scheduled escalation executable
cmd/sms/            SMS webhook executable
frontend/           Next.js dashboard application
internal/auth/      JWT and password utilities
internal/handler/   HTTP routes and request handlers
internal/middleware/Auth and role middleware
internal/models/    Domain models and constants
internal/notify/    SNS notification adapter
internal/storage/   S3 evidence upload adapter
internal/store/     DynamoDB data access
postman/            Postman collection
scripts/            Smoke test and environment helper scripts
scripts/dynamodb-init.sh Docker-only DynamoDB table initialization
template.yaml       AWS SAM infrastructure definition
Dockerfile          Container image build
frontend/Dockerfile Frontend container image build
docker-compose.yml  Local container orchestration
```

## Notes And Limitations

- The Docker setup containerizes the API and frontend processes and uses DynamoDB Local for app data.
- S3 and SNS are not emulated in Docker. Evidence upload URLs and real SNS publishing still need AWS-compatible services if you enable those flows.
- `SNS_TOPIC_ARN` is optional. If it is empty, critical notification messages are printed instead of published.
