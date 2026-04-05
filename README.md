# ERP Workspace Structure

This workspace is organized as two apps:

- `erp-frontend/`: Vite + React client
- `erp-backend/`: NestJS + Prisma API

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
