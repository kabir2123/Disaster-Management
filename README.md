# ResQ — disaster response incident console

ResQ is a tool for coordinating a local emergency. Citizens report incidents
(flooding, landslides, fires, people stranded); responders, coordinators, and a
district admin triage them, assign teams, track relief resources, and resolve
the reports. It is built as an operations console — dense and fast to read on a
phone in bad light — not a marketing dashboard.

The backend is a Go service that runs on AWS Lambda (or as a plain HTTP server
locally). The frontend is a Next.js app. Everything is scoped to a *district*,
so a coordinator only ever sees their own area.

<!-- Screenshots: drop board.png / map.png into docs/ and link them here. -->

## Who uses it

| Role | What they do |
| --- | --- |
| **Citizen** | Files a report (severity, location, optional GPS pin and photo) and tracks it |
| **Responder** | Works the reports assigned to them; resolves them |
| **Admin** | Sees the whole district board; assigns a responder to each report |
| **Coordinator** | Manages relief resources (boats, shelters, vehicles, supplies) |

## How it works

1. A citizen files a report. It lands on the district board immediately, sorted
   worst-first (escalated, then by severity, then most recent).
2. A severity-5 report broadcasts an alert to responders (SNS). Any report left
   unresolved past 30 minutes is auto-escalated by a scheduled job.
3. An admin assigns a responder. The responder resolves it, optionally attaching
   photos (uploaded straight to S3 via presigned URLs).
4. Coordinators keep the resource inventory current so it can be dispatched.

## Run it locally

You need Docker, and Go 1.23+ to load the demo data.

**1. Start the stack** (DynamoDB, the API, and the frontend, all in containers):

```bash
docker compose up -d --build
```

**2. Load ~200 realistic demo incidents** (real Kerala/Karnataka places, mixed
severities, some with no photo or missing fields — so the UI is exercised
against messy data, not a clean demo):

```bash
DYNAMODB_ENDPOINT_URL=http://localhost:8008 \
AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local AWS_DEFAULT_REGION=us-east-1 \
go run ./cmd/seed
```

**3. Open the app** at http://localhost:3008 and sign in.

### Demo logins

Password for all accounts is `demo1234`.

| Login | Role | What you'll see |
| --- | --- | --- |
| `admin@ernakulam.test` | Admin | The full board (~150 reports); assign and resolve. Start here. |
| `coord@ernakulam.test` | Coordinator | Relief resources + read-only incidents |
| `responder@ernakulam.test` | Responder | Only the reports assigned to that responder |
| `citizen@ernakulam.test` | Citizen | File and track reports |
| `admin@kodagu.test` | Admin | A second district |

On the Incidents page, switch to **Map** to see reports plotted by location, or
**Locate me** to centre on your own position.

<details>
<summary>Running without Docker (Go + Node directly)</summary>

```bash
# 1. DynamoDB Local + tables
docker compose up -d resq-dynamodb resq-dynamodb-init

# 2. Seed (same command as above)
DYNAMODB_ENDPOINT_URL=http://localhost:8008 AWS_ACCESS_KEY_ID=local \
AWS_SECRET_ACCESS_KEY=local AWS_DEFAULT_REGION=us-east-1 go run ./cmd/seed

# 3. API on :8090
PORT=8090 DYNAMODB_ENDPOINT_URL=http://localhost:8008 AWS_ACCESS_KEY_ID=local \
AWS_SECRET_ACCESS_KEY=local AWS_DEFAULT_REGION=us-east-1 JWT_SECRET=dev-secret \
EVIDENCE_STORAGE_MODE=local go run ./cmd/api

# 4. Frontend on :3000
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://127.0.0.1:8090
npm install && npm run dev
```

In this mode S3 and SNS aren't used: evidence is kept locally and critical
alerts are logged instead of published.

</details>

## Design decisions worth knowing

A few choices that were deliberate rather than incidental:

- **Colour means one thing: severity.** The interface is otherwise achromatic
  (slate on near-black). Red only ever means a critical incident — never a
  button, a link, or an error. If red showed up in three places, a coordinator
  scanning at 3am would stop trusting it. Each incident's severity shows as a
  coloured rail on the leading edge of its row — the only colour on the board.
- **An outage is not "no incidents."** If the API fails, the board says so and
  offers a retry, rather than silently rendering an empty list — which in an
  emergency tool would be genuinely dangerous.
- **The data is intentionally messy.** The seed includes very long reports,
  missing photos (~30%), unknown reporters, and reports with no GPS — because
  software that only looks good on clean data isn't finished.
- **Graceful degradation for location.** Roughly 12% of seeded reports have no
  coordinates (denied GPS); the map is honest about it ("133 of 150 pinned")
  instead of pretending everything is plotted.

## Architecture

```
Browser (Next.js)
      │  JSON over HTTPS, JWT per request
      ▼
API Gateway ──▶ Lambda (cmd/api) ──▶ internal/handler
                                        ├─ internal/auth      JWT + password hashing
                                        ├─ internal/store     DynamoDB
                                        ├─ internal/storage   S3 presigned uploads
                                        └─ internal/notify     SNS alerts

cmd/escalation   scheduled by EventBridge — escalates stale reports
cmd/sms          webhook that turns inbound SMS into incidents
cmd/seed         loads demo data through the same store the API uses
```

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, IBM Plex
  Sans/Mono (via `next/font`), Leaflet for the map.
- **Backend:** Go 1.23, standard-library `net/http`, AWS SDK v2.
- **AWS:** Lambda, API Gateway, DynamoDB, S3, SNS, EventBridge, packaged with SAM.
- **Local:** Docker Compose with DynamoDB Local.

## API reference

Routes are district-scoped and require a JWT unless noted.

| Method | Path | Access |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Public |
| POST | `/incident/report` | Citizen, Admin, Responder |
| GET | `/incident/{district}` | Any signed-in role |
| GET | `/incident/{district}/{id}` | Any signed-in role |
| PATCH | `/incident/{district}/{id}/assign` | Admin |
| PATCH | `/incident/{district}/{id}/resolve` | Admin, Responder |
| POST | `/incident/{district}/{id}/evidence` | Citizen, Admin, Responder |
| GET | `/responders/{district}` | Admin |
| POST | `/resource/register` | Coordinator |
| GET | `/resource/{district}` | Coordinator, Responder |
| PATCH | `/resource/{district}/{id}/status` | Coordinator |

## Repository layout

```
cmd/api/          HTTP API (Lambda or local server)
cmd/escalation/   Scheduled escalation job
cmd/sms/          Inbound-SMS webhook
cmd/seed/         Demo data generator
internal/         auth, handler, middleware, store, storage, notify, models
frontend/         Next.js app
template.yaml     AWS SAM infrastructure
docker-compose.yml
```

## Deploying to AWS

The stack is defined in `template.yaml` and deploys with SAM:

```bash
make sam-build
make sam-deploy      # prompts for a JWT secret
```

After deploy, point the frontend's `NEXT_PUBLIC_API_URL` at the API Gateway URL
(including the `/prod` stage). CI (GitHub Actions) runs `go test`, builds the
Lambdas, and validates the SAM template on every push.

## Possible next steps

Deliberately left as a roadmap rather than half-built:

- **Live board** — push new reports to every coordinator via API Gateway
  WebSockets + DynamoDB Streams, instead of fetching on load.
- **Resource dispatch** — link a resource to an incident in one atomic
  cross-table write, closing the coordination loop.
- **Incident timeline** — an append-only history of who did what, when.
