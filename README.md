# ERP Workspace Structure

This workspace is organized as two apps:

- `erp-frontend/`: Vite + React client
- `erp-backend/`: NestJS + Prisma API

Project coding standards live in [CODING_STANDARDS.md](CODING_STANDARDS.md). Use that document as the baseline for code reviews, new features, tests, and dependency/module decisions.

Git setup:

- The workspace root is now the single active git repository.
- The old child repos were archived locally as `erp-frontend/.git-archive/` and `erp-backend/.git-archive/`.

## Frontend map

`erp-frontend/src/`

- `app/`: app bootstrap, providers, top-level pages
- `features/`: domain-focused screens grouped by business area
- `shared/`: reusable UI, layout, hooks, types, data, and utilities
- `test/`: frontend test setup and specs

## Backend map

`erp-backend/src/`

- `auth/`: authentication, guards, decorators, JWT strategy
- `customers/`, `suppliers/`, `warehouses/`: registry-style modules
- `modules/`: transaction and inventory domains

`erp-backend/src/modules/`

- `inventory/`: stock movement logic
- `orders/`: outbound order flow
- `products/`: product catalog APIs and imports
- `purchases/`: procurement flow

## Supporting backend folders

- `erp-backend/prisma/`: Prisma schema, migrations, seed, and DB helpers
- `erp-backend/csv dump/`: import source files

This layout is intended to separate app bootstrapping, business features, and shared utilities so each area has a clear home.

## Local Setup

### What you need

- Node.js 20+ and npm
- A Supabase project for auth and Postgres
- A backend `.env` in `erp-backend/`
- A frontend `.env.local` in `erp-frontend/` when browser auth is enabled

### Backend env

Create `erp-backend/.env` with:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_AUDIENCE=authenticated
SUPABASE_JWT_SECRET=only-needed-for-hs256-projects
SEED_ADMIN_PASSWORD=choose-a-real-password
SEED_ADMIN_EMAIL=admin@erp.com
SEED_ADMIN_NAME=System Admin
CORS_ORIGINS=http://localhost:8080
FRONTEND_SITE_URL=http://localhost:8080
CORS_ALLOW_NGROK=true
PORT=3000
HOST=0.0.0.0
```

Notes:

- Keep `DATABASE_URL` on the Supabase pooler for normal app traffic.
- Keep `DIRECT_URL` on the direct Postgres connection for Prisma migrations.
- `SUPABASE_JWT_SECRET` is only needed if your Supabase project still uses HS256 tokens.
- `SEED_ADMIN_PASSWORD` is required by default. For local-only bootstrap, you can opt into the development fallback with `SEED_ALLOW_INSECURE_DEFAULTS=true`.
- `FRONTEND_SITE_URL` is used by backend-generated invite links. Set it to your frontend ngrok URL when demoing remotely.
- `CORS_ALLOW_NGROK=true` keeps ngrok frontend origins accepted during demos.

### Frontend env

Create `erp-frontend/.env.local` with:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SITE_URL=http://localhost:8080
VITE_DEV_HOST=0.0.0.0
VITE_DEV_PORT=8080
```

Notes:

- `VITE_API_BASE_URL` should point to the Nest API.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required for browser sign-in, password reset, and session handling.
- `VITE_SITE_URL` is used for auth redirect URLs such as password reset.
- For ngrok demos, set `VITE_ALLOWED_HOSTS` to your frontend ngrok hostname or temporarily set `VITE_ALLOW_ALL_HOSTS=true`.
- If hot reload does not reconnect through ngrok, set `VITE_HMR_HOST`, `VITE_HMR_PROTOCOL=wss`, and `VITE_HMR_CLIENT_PORT=443`.

## Local Startup Flow

1. Install dependencies in both apps.

```bash
cd erp-backend && npm install
cd ../erp-frontend && npm install
```

2. Run backend migrations from `erp-backend/`.

```bash
npm run prisma:migrate:dev
```

3. Seed the default tenant and admin user from `erp-backend/`.

```bash
npx prisma db seed
```

4. Start the backend from `erp-backend/`.

```bash
npm run start:dev
```

5. Start the frontend from `erp-frontend/`.

```bash
npm run dev
```

6. Open the apps.

- Frontend: `http://localhost:8080`
- Backend Swagger: `http://localhost:3000/api`

## Demoing With ngrok

1. Start the backend and frontend locally.

```bash
cd erp-backend && npm run start:dev
cd ../erp-frontend && npm run dev
```

2. Create two ngrok tunnels in separate terminals.

```bash
ngrok http 3000
ngrok http 8080
```

3. Copy the generated HTTPS URLs and update your local env files.

Backend `erp-backend/.env`:

```env
FRONTEND_SITE_URL=https://your-frontend-subdomain.ngrok-free.app
CORS_ORIGINS=http://localhost:8080,https://your-frontend-subdomain.ngrok-free.app
CORS_ALLOW_NGROK=true
```

Frontend `erp-frontend/.env.local`:

```env
VITE_API_BASE_URL=/api-proxy
VITE_SITE_URL=https://your-frontend-subdomain.ngrok-free.app
VITE_ALLOWED_HOSTS=your-frontend-subdomain.ngrok-free.app
VITE_API_PROXY_PREFIX=/api-proxy
VITE_API_PROXY_TARGET=http://127.0.0.1:3000
VITE_HMR_HOST=your-frontend-subdomain.ngrok-free.app
VITE_HMR_PROTOCOL=wss
VITE_HMR_CLIENT_PORT=443
```

4. Restart both dev servers after changing env values.

5. Open the frontend ngrok URL on the device you want to demo on.

Notes:

- If you only need a quick read-only demo and do not care about hot reload on the remote device, you can skip the `VITE_HMR_*` settings.
- Using `VITE_API_BASE_URL=/api-proxy` lets the frontend ngrok tunnel relay API traffic to your local backend, so you do not need a second backend ngrok URL for development demos.
- If you rotate ngrok URLs often, `VITE_ALLOW_ALL_HOSTS=true` is more convenient than updating `VITE_ALLOWED_HOSTS` every time, but it is less strict and should stay dev-only.
- Password reset links and tenant invite links will use `VITE_SITE_URL` on the frontend and `FRONTEND_SITE_URL` on the backend, so keep those pointed at the same public frontend URL during the demo.

## Auth And Seed Handoff Notes

- Supabase Auth is the active identity provider.
- The seed flow creates or reuses the default tenant, ensures role records exist, creates the Supabase auth user, and upserts the matching ERP app user.
- If you need the seed to recreate the Supabase auth account, set `SEED_RECREATE_SUPABASE_AUTH=true`.
- If the frontend says Supabase is not configured, check `erp-frontend/.env.local` first.
- If the backend rejects tokens, verify `SUPABASE_URL`, `SUPABASE_JWT_AUDIENCE`, and, when relevant, `SUPABASE_JWT_SECRET`.
