# ERP Coding Standards

These standards define how code should be written, reviewed, and maintained in this ERP workspace. They apply to both apps:

- `erp-backend/`: NestJS, Prisma, Supabase Auth
- `erp-frontend/`: Vite, React, TypeScript, Tailwind, shadcn-style shared UI

The goal is simple: keep the code predictable, tenant-safe, testable, and easy for the next developer to understand.

## Core Principles

- Prefer clear, boring code over clever code.
- Keep changes scoped to the feature or bug being worked on.
- Follow the existing folder structure before creating new patterns.
- Make business rules explicit in services and tests.
- Treat tenant isolation, auth, inventory quantities, order state, and money fields as high-risk areas.
- Do not hide failures. Return useful errors and test expected failure paths.
- Avoid unrelated refactors in feature or bugfix work.

## TypeScript Standards

- Use TypeScript types for all public function inputs and return values where practical.
- Avoid `any` in production code. If it is unavoidable, keep it local and explain why with a short comment.
- Prefer domain-specific types and enums over loose strings.
- Use `unknown` instead of `any` when handling external or untrusted data.
- Avoid non-null assertions unless the value is guaranteed by an earlier guard.
- Keep DTOs, API types, and UI types aligned instead of duplicating incompatible shapes.
- Prefer early returns for invalid states over deeply nested conditionals.

## Backend Standards

Backend code lives in `erp-backend/src/`.

### NestJS Structure

- Keep controllers thin. Controllers should handle routing, decorators, request DTOs, and response status only.
- Put business logic in services.
- Put reusable cross-cutting logic in `common/`.
- Keep module dependencies explicit with `imports`, `providers`, and `exports`.
- Export a service from a module only when another module actually needs it.
- Avoid circular module dependencies. If one appears, reconsider the domain boundary before using `forwardRef`.

### Dependency Injection

- Use NestJS dependency injection for services, guards, strategies, and shared infrastructure.
- Do not instantiate injectable services manually in production code.
- Use `ConfigService` for environment configuration. Do not read `process.env` directly outside configuration/bootstrap helpers.
- If a service depends on another service, the owning module must import the module that exports that dependency.

Example:

```ts
@Module({
  imports: [NotificationsModule],
  providers: [PurchaseService],
  exports: [PurchaseService],
})
export class PurchaseModule {}
```

### Prisma And Database Access

- Access the database through `PrismaService`.
- Keep Prisma queries inside backend services or dedicated data helpers.
- Always include `tenantId` in tenant-scoped reads and writes.
- Use transactions when a workflow updates multiple related records.
- For inventory, orders, and purchases, update stock and lifecycle state atomically where possible.
- Prefer `Decimal`-safe handling for money fields. Do not use floating point arithmetic for financial calculations.
- Add migrations for schema changes. Do not rely on manual database edits.
- Keep seed data deterministic and safe for local development.

### Auth, Roles, And Tenancy

- Every protected endpoint must respect the authenticated user's tenant and roles.
- Platform admin behavior must be explicit and tested separately from tenant admin behavior.
- A tenant user must not be able to read or modify another tenant's data.
- Preserve safeguards around the last tenant admin.
- Do not expose Supabase service role keys, database URLs, or seed passwords in logs, API responses, or committed files.

### Errors

- Use NestJS exceptions such as `BadRequestException`, `ForbiddenException`, `UnauthorizedException`, and `NotFoundException`.
- Error messages should be useful but should not leak secrets or internal database details.
- Validate business-rule failures before writing data when practical.
- For optimistic concurrency, use the existing `assertUnchangedSinceLoaded` helper where updates depend on stale UI data.

### DTOs And Validation

- Use DTO classes for request bodies.
- Add `class-validator` decorators to validate API input.
- Keep Swagger decorators in sync with DTO behavior.
- Prefer enums for lifecycle states and role values.
- Validate IDs, quantities, statuses, and required relationships before performing writes.

## Frontend Standards

Frontend code lives in `erp-frontend/src/`.

### React Structure

- Put route-level screens in `features/<domain>/pages/`.
- Put reusable layout in `shared/layout/`.
- Put reusable UI primitives in `shared/ui/`.
- Put shared API clients, formatting helpers, and small utilities in `shared/lib/`.
- Put shared domain types in `shared/types/`.
- Keep feature pages focused on orchestration and UI composition.

### Components

- Prefer existing shared UI components before creating new ones.
- Keep components small enough that their state and behavior are easy to follow.
- Extract repeated domain UI only after it appears in more than one place or is clearly reusable.
- Use controlled form state for complex forms.
- Show loading, empty, error, and success states for data-driven screens.
- Avoid hardcoded repeated status styling. Use shared status helpers/components where available.

### API Usage

- Route backend calls through the shared API helpers in `src/shared/lib/`.
- Do not scatter raw `fetch` calls across feature pages unless there is a clear reason.
- Keep Supabase browser auth concerns in shared auth/provider code.
- Handle unauthorized and tenant-status failures consistently.
- Keep frontend request and response types aligned with backend DTOs and returned shapes.

### UI And Styling

- Use Tailwind utilities consistently with the existing design system.
- Keep ERP screens dense, readable, and business-focused.
- Avoid decorative UI that reduces clarity.
- Ensure tables, forms, dialogs, and buttons work on mobile and desktop.
- Text must not overflow buttons, cards, table cells, or navigation items.
- Use semantic buttons, labels, and accessible form controls.
- Use icons for common actions where the app already does so.

## Testing Standards

### Backend Tests

- Add unit tests for service-level business rules.
- Add tests for permissions, tenant boundaries, invalid transitions, and edge cases.
- Mock Prisma with the same shape used by the real code.
- When a service calls `prisma.user.count`, the mock should expose `prisma.user.count`, not only a top-level `count`.
- Assert that writes do not happen when validation fails.
- For transactional workflows, test both the success path and the failure path that should rollback or prevent follow-up writes.

### Frontend Tests

- Add tests for important user workflows, form validation, and conditional rendering.
- Prefer tests that assert visible behavior over implementation details.
- Mock API boundaries rather than deeply mocking component internals.
- Cover empty, loading, error, and permission-limited states for important pages.

## Code Review Checklist

Before merging or considering work complete, check:

- Does the code follow the existing folder and module boundaries?
- Are tenant-scoped queries filtered by `tenantId`?
- Are role and platform-admin paths explicit?
- Are business rules tested?
- Are dependency injection and module imports correct?
- Are errors helpful and safe?
- Are DTOs validated?
- Are money, quantity, inventory, and lifecycle changes handled carefully?
- Does the frontend show loading, empty, and error states?
- Do lint, typecheck, tests, and build pass where relevant?

## Required Verification

Run the relevant checks before shipping changes.

Backend:

```bash
cd erp-backend
npm run lint
npm run typecheck
npm test
npm run build
```

Frontend:

```bash
cd erp-frontend
npm run lint
npm run typecheck
npm test
npm run build
```

For small changes, run the narrowest useful test first, then run the broader checks before merging.

## Git And Commit Standards

- Keep commits focused on one logical change.
- Do not commit `.env`, `.env.local`, secrets, database dumps with sensitive data, or generated build output.
- Do not rewrite or revert someone else's unrelated changes.
- Use clear commit messages that describe the behavior change.
- Include migrations with schema changes.
- Include tests with business-rule changes.

## Adding New Features

When adding a feature:

1. Place it in the closest existing domain folder.
2. Define or update DTOs and types first.
3. Implement backend service logic with tenant and role checks.
4. Add tests for success, permission failure, validation failure, and edge cases.
5. Add frontend screens using shared UI and shared API helpers.
6. Verify lint, typecheck, tests, and build.

## High-Risk Areas

Use extra care when editing:

- Auth and role management
- Tenant scoping
- Supabase admin calls
- Prisma migrations
- Inventory reservations and stock movement
- Order and purchase lifecycle transitions
- Money and quantity calculations
- Global guards and interceptors
- Shared API clients and auth providers

These areas should usually include tests for both the expected path and the failure path.

