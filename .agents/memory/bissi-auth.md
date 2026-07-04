---
name: Bissi auth pattern
description: How auth works in the Bissi API — password hashing, session store, middleware
---

## Rule
All protected API routes (`/api/dashboard`, `/api/branches`, etc.) are gated by `artifacts/api-server/src/middleware/auth.ts` which reads the `Authorization: Bearer <token>` header and looks up the token in the in-memory `sessions` Map exported from `routes/auth.ts`.

## Why
No bcrypt installed — SHA-256 + static salt used intentionally for simplicity. The middleware was added after the initial build because routes were accidentally exposed unauthenticated.

## How to apply
- New routes must be added **after** `router.use(requireAuth)` in `routes/index.ts` to be protected.
- Auth-exempt routes (login, logout, me) go before it.
- `setAuthTokenGetter(() => localStorage.getItem("auth_token"))` is called in `artifacts/bissi-app/src/App.tsx` once at startup — do not set it in individual page files.
