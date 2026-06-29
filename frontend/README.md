# ResQ Frontend

Next.js dashboard for the ResQ disaster coordination API — styled with **DashStack** (admin layout, Nunito Sans, sidebar) and **Cyclone Ready** (emergency alerts, severity UI, crisis prep panels).

## Setup

```bash
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL to your deployed API (include /prod stage)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API mapping

| Screen | Endpoint |
|--------|----------|
| Login | `POST /auth/login` |
| Register | `POST /auth/register` |
| Dashboard stats | `GET /incident/{district}`, `GET /resource/{district}` |
| Incidents list | `GET /incident/{district}` |
| Incident detail | `GET /incident/{district}/{id}` |
| Assign | `PATCH /incident/{district}/{id}/assign` |
| Resolve | `PATCH /incident/{district}/{id}/resolve` |
| Evidence upload | `POST /incident/{district}/{id}/evidence` → S3 PUT |
| Report incident | `POST /incident/report` |
| Resources list | `GET /resource/{district}` |
| Register resource | `POST /resource/register` |
| Update status | `PATCH /resource/{district}/{id}/status` |

## Roles

Navigation adapts by JWT role: `citizen`, `responder`, `admin`, `coordinator`.

## Design

- **DashStack**: sidebar nav, stat cards, rounded cards, `#4318FF` primary, `#F4F7FE` background
- **Cyclone Ready**: alert banners, severity selector, crisis prep auth panel, emergency color palette
