# ResQ Free-Tier Deployment Guide

This guide deploys the production version of ResQ with:

- Backend: AWS SAM, Lambda, API Gateway, DynamoDB, S3, SNS, EventBridge
- Frontend: Vercel Hobby plan
- Expected cost: free for small personal/demo usage if you stay inside provider limits

Free does not mean unlimited. Add an AWS budget before deploying.

## Free-Tier Assumptions

AWS Lambda includes 1 million requests and 400,000 GB-seconds per month in the free tier. API Gateway includes 1 million REST API calls per month for 12 months for new AWS customers. DynamoDB’s free tier includes 25 RCUs, 25 WCUs, and 25 GB storage per month. Vercel Hobby is free for personal projects and includes limited monthly usage.

Sources:

- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/
- Amazon API Gateway pricing: https://aws.amazon.com/api-gateway/pricing/
- Amazon DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- Amazon S3 pricing: https://aws.amazon.com/s3/pricing/
- Vercel Hobby plan: https://vercel.com/docs/plans/hobby

## Architecture

```text
Browser
  |
  v
Vercel-hosted Next.js frontend
  |
  v
AWS API Gateway REST API
  |
  v
AWS Lambda Go API
  |
  +--> DynamoDB: users, incidents, resources
  +--> S3: evidence uploads
  +--> SNS: critical incident notifications
  +--> EventBridge: scheduled escalation Lambda
```

## Prerequisites

Install:

- Go 1.23+
- Node.js 22+
- AWS CLI
- AWS SAM CLI
- Vercel CLI, or use Vercel’s GitHub import UI

Check tools:

```bash
go version
node --version
aws --version
sam --version
```

Configure AWS:

```bash
aws configure
```

Use a low-cost region such as `us-east-1` unless you have a reason to deploy elsewhere.

## Add AWS Budget Guardrail

Create a small monthly budget before deploying:

1. AWS Console -> Billing and Cost Management -> Budgets
2. Create budget
3. Monthly cost budget
4. Set amount to `1 USD`
5. Add email alerts at 50%, 80%, and 100%

This does not hard-stop AWS usage, but it warns you early.

## Backend Deployment

Set a strong JWT secret:

```bash
export JWT_SECRET="$(openssl rand -base64 32)"
export AWS_REGION="us-east-1"
```

Build and deploy:

```bash
make tidy
sam validate --lint
sam build
sam deploy --guided \
  --parameter-overrides JWTSecret="$JWT_SECRET" \
  --region "$AWS_REGION"
```

Recommended guided deploy answers:

| Prompt | Value |
| --- | --- |
| Stack Name | `resq-prod` |
| AWS Region | `us-east-1` |
| Confirm changes before deploy | `Y` |
| Allow SAM CLI IAM role creation | `Y` |
| Disable rollback | `N` |
| Save arguments to configuration file | `Y` |

After deploy, copy the `ApiUrl` output. It will look like:

```text
https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

Smoke test:

```bash
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/health
```

Expected:

```json
{"status":"ok"}
```

## SNS Alerts

The stack creates an SNS topic for critical incident alerts. To receive email alerts:

1. AWS Console -> SNS -> Topics
2. Open the topic from the `AlertsTopicArn` stack output
3. Create subscription
4. Protocol: `Email`
5. Endpoint: your email address
6. Confirm the subscription from your email inbox

Email notifications are generally the safest free-tier choice. Avoid SMS unless you explicitly accept carrier/SNS SMS costs.

## Evidence Uploads

Production uses S3 presigned PUT URLs. Keep files small to stay free-tier friendly.

Recommended limits:

- Use compressed images
- Keep files under 1-2 MB for demos
- Avoid uploading videos
- Delete old demo evidence from S3 when done

The S3 bucket blocks public access. Evidence uploads are stored privately by key.

## Frontend Deployment On Vercel

The frontend is in `frontend/`.

Option A: Vercel dashboard:

1. Push this repo to GitHub.
2. Go to Vercel -> Add New Project.
3. Import the repository.
4. Set Root Directory to `frontend`.
5. Add environment variable:

```text
NEXT_PUBLIC_API_URL=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

6. Deploy.

Option B: Vercel CLI:

```bash
cd frontend
npm install
npx vercel
```

When prompted, set the project root to the current `frontend` directory. Then add the API URL:

```bash
npx vercel env add NEXT_PUBLIC_API_URL production
```

Paste the API URL with `/prod`, then deploy:

```bash
npx vercel --prod
```

## End-To-End Test

Open the Vercel URL and test:

1. Register a user.
2. Login.
3. Report an incident.
4. Open Incidents.
5. Upload evidence on the incident detail page.
6. Register a resource as an admin/coordinator.

Use district IDs consistently. If you register with `Bangalore`, report/list resources using `Bangalore`.

## Cost-Control Checklist

- Keep Lambda memory at 128 MB.
- Keep DynamoDB provisioned at 1 RCU / 1 WCU per table for demo usage.
- Do not enable DynamoDB point-in-time recovery unless you accept possible cost.
- Do not enable API Gateway caching.
- Do not use SMS alerts.
- Keep evidence files small.
- Do not upload videos.
- Add an AWS budget alert.
- Keep frontend on Vercel Hobby for personal/non-commercial use.

## Updating The Backend

After code changes:

```bash
sam build
sam deploy
```

Then redeploy the frontend only if `NEXT_PUBLIC_API_URL` or frontend code changed.

## Updating The Frontend

With Vercel connected to GitHub, pushing to the deployed branch will redeploy automatically.

Manual CLI deploy:

```bash
cd frontend
npx vercel --prod
```

## Tear Down To Stop AWS Usage

When done:

```bash
sam delete --stack-name resq-prod --region us-east-1
```

Then manually check S3 in the AWS Console. If the evidence bucket still contains objects, empty and delete it.

## Known Free-Tier Caveats

- AWS free tier and credits depend on account age and current AWS terms.
- API Gateway REST API free-tier calls are time-limited for new customers.
- Vercel Hobby is for personal/non-commercial use.
- S3 request/storage/data-transfer usage can become billable if you upload many or large files.
- SNS SMS is not free; use email subscriptions.
