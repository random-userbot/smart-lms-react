# Smart LMS Free-Tier Deployment (Frontend + Backend)

This guide is optimized for low-cost/free deployment with current code and minimal changes.

## Recommended Free-Tier Stack

- Frontend: Cloudflare Pages or Netlify (free static hosting)
- Backend API: Render Web Service free tier (or Koyeb free tier)
- Postgres DB: Neon free tier
- File storage (for lecture videos/materials): Cloudinary free tier

Notes:
- Free plans and limits change often. Verify current quotas before finalizing.
- Do not rely on local disk for uploads on free dynos/instances.

## Why This Stack Works Here

- Frontend is Vite static build.
- Backend is FastAPI and can run with `uvicorn`.
- Postgres already supported via async SQLAlchemy.
- Cloudinary credentials are already supported by backend config.

## Pre-Deploy Backend Checklist

Set these backend env vars in your provider:

- `APP_ENV=production`
- `DEBUG_MODE=false`
- `FRONTEND_URL=<your frontend URL>`
- `APP_TRUSTED_ORIGINS=<comma-separated origins, include frontend URL>`
- `ALLOW_ALL_CORS_IN_DEV=false`
- `JWT_SECRET_KEY=<long random secret>`
- `DATABASE_URL=<neon asyncpg url>`
- `DATABASE_URL_SYNC=<neon psycopg url>`
- `GROQ_API_KEY=<optional, for AI quiz/tutor features>`
- `CLOUDINARY_CLOUD_NAME=<required if you use media uploads>`
- `CLOUDINARY_API_KEY=<required if you use media uploads>`
- `CLOUDINARY_API_SECRET=<required if you use media uploads>`

Optional startup controls:
- `AUTO_CREATE_TABLES=true` (set `false` if you fully switch to Alembic migrations)
- `AUTO_CREATE_INDEXES=true`
- `REQUIRE_SECURE_JWT_IN_PROD=true`

## Backend Deploy (Render Free Tier)

1. Create a new Web Service from repo.
2. Root directory: `smartlms-backend`
3. Build command:
   - `pip install -r requirements.txt`
4. Start command:
   - `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add all env vars listed above.
6. Deploy and test health endpoint:
   - `/api/health`

## Frontend Deploy (Cloudflare Pages or Netlify)

1. Create static site from repo.
2. Root directory: `smartlms-frontend`
3. Build command:
   - `npm ci && npm run build`
4. Publish directory:
   - `dist`
5. Set env var:
   - `VITE_API_URL=<your backend public URL>`
6. Redeploy.

## Free-Tier Bottleneck Mitigation

- Keep API instance warm if provider sleeps aggressively.
- Use Neon pooled connection string if available.
- Avoid very large uploads on free plans.
- Store uploaded media in Cloudinary, not local disk.
- Keep TensorFlow-heavy endpoints optional unless needed.

## Known Hotspots To Monitor First

- `/api/analytics/*` endpoints (CPU-heavy Python aggregation)
- `/api/admin/teachers` and `/api/admin/teacher/{id}` at scale
- AI endpoints using Groq/network latency
- Startup cold boot when heavy ML dependencies are present

## Quick Smoke Test After Deployment

1. Open frontend and log in.
2. Course list loads.
3. Lecture opens and quiz submission works.
4. Messaging and analytics endpoints return data.
5. Upload media path works (Cloudinary) or is disabled intentionally.

## If You Need Even Cheaper

- Frontend: always keep on static free host.
- Backend: use free tier only for API + DB and move ML training/inference jobs off the web service.
- For strict free usage, disable non-critical AI features behind env flags until needed.
