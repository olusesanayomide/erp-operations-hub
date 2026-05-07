# Manifest Frontend

Frontend application for Manifest, an ERP platform for inventory, procurement, warehouse, and sales operations.

## Render Deployment

- Create a `Static Site` on Render for the frontend.
- Set the root directory to `erp-frontend`.
- Use `npm ci && npm run build` as the build command.
- Use `dist` as the publish directory.
- Set `VITE_API_BASE_URL` to `https://erp-operations-hub.onrender.com`.
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from your Supabase project.
- Set `VITE_SITE_URL` to the final hosted frontend URL after Render assigns it. If it is omitted, browser-based password reset links fall back to the current deployed origin.
- Add a rewrite from `/*` to `/index.html` so React Router routes work on refresh.
