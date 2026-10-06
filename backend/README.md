# Pulse Backend — Django + DRF + PostgreSQL

API-first backend for Pulse, built on **Clean Architecture** with Django 5.2, Django REST Framework, PostgreSQL and JWT authentication. This phase ships the **Authentication & Onboarding** slice: signup → login → workspace creation → member invitations → role-based access.

```
Presentation  →  DRF serializers + thin views        (apps/<app>/presentation)
      ↓
Application   →  use cases + repository protocols    (apps/<app>/application)
      ↓
Domain        →  pure business rules, no framework  (apps/<app>/domain*)
      ↓
Infrastructure→  ORM models, repositories, hashing   (apps/<app>/infrastructure)
```

## Project setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows  (source .venv/bin/activate on POSIX)
pip install -r requirements-dev.txt

copy .env.example .env            # then fill DJANGO_SECRET_KEY etc.
```

### Database setup (PostgreSQL)

```bash
# any PostgreSQL 14+ works; for a disposable local server:
docker run -d --name pulse-pg -e POSTGRES_PASSWORD=pulse -e POSTGRES_DB=pulse -p 5432:5432 postgres:16
```

Point `DATABASE_URL` in `.env` at it (`postgres://postgres:pulse@localhost:5432/pulse`).

### Migrations & server

```bash
python manage.py migrate
python manage.py runserver            # http://localhost:8000
```

### Running tests & lint

```bash
pytest                    # 55 tests: auth, workspaces, invitations, RBAC matrix
ruff check .              # lint (line-length 100, pyflakes+isort+bugbear+django)
mypy apps config          # type check (django-stubs plugin)
```

## Environment variables

See [`.env.example`](.env.example). Nothing secret is ever committed. Key variables:

| Variable                | Purpose                                        |
| ----------------------- | ---------------------------------------------- |
| `DJANGO_SECRET_KEY`     | Required in production (fails fast if missing) |
| `DATABASE_URL`          | `postgres://…` (also accepts `sqlite://`)      |
| `CORS_ALLOWED_ORIGINS`  | Next.js origin(s), comma-separated             |
| `JWT_ACCESS_MINUTES`    | Access token TTL (default 15)                  |
| `JWT_REFRESH_DAYS`      | Refresh token TTL (default 7)                  |
| `THROTTLE_AUTH`         | Rate limit for auth endpoints (default 30/min) |
| `INVITATION_TTL_DAYS`   | Invitation expiry (default 7)                  |

## API documentation

- **Swagger UI:** `/api/docs`
- **OpenAPI schema:** `/api/schema`

All endpoints are documented; 2xx schemas are post-processed to reflect the response envelope.

## Endpoints (Phase 2)

| Method | Path                                        | Auth | Notes                                        |
| ------ | ------------------------------------------- | ---- | -------------------------------------------- |
| POST   | `/api/v1/auth/signup`                       | –    | 201, returns JWT pair, sets refresh cookie   |
| POST   | `/api/v1/auth/login`                        | –    | 200, generic 401 on any credential failure   |
| POST   | `/api/v1/auth/refresh`                      | –    | Rotation + blacklist; cookie **or** body     |
| POST   | `/api/v1/auth/logout`                       | –    | 204, blacklists refresh, clears cookie       |
| GET    | `/api/v1/auth/me`                           | JWT  | Current user                                 |
| POST   | `/api/v1/workspaces`                        | JWT  | Atomic: workspace + OWNER membership         |
| GET    | `/api/v1/workspaces`                        | JWT  | Caller's workspaces with role                |
| GET    | `/api/v1/workspaces/:id`                    | JWT  | Member-only; others get **404** (IDOR-safe)  |
| POST   | `/api/v1/workspaces/:id/invitations`        | JWT  | OWNER/ADMIN only                             |
| GET    | `/api/v1/workspaces/:id/invitations`        | JWT  | OWNER/ADMIN only; **no tokens in list**      |
| DELETE | `/api/v1/workspaces/:id/invitations/:iid`   | JWT  | Revoke — OWNER/ADMIN only                    |
| POST   | `/api/v1/invitations/:token/accept`         | JWT  | Email must match; atomic membership creation |

## Response envelope

Every response follows one shape, so the Next.js client never guesses:

```jsonc
// success
{ "data": { … }, "message": "Workspace created." }        // 2xx (message optional)
// error
{ "error": { "code": "EMAIL_ALREADY_EXISTS", "message": "…", "fields": null } }
```

Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `FORBIDDEN`, `NOT_FOUND`, `EMAIL_ALREADY_EXISTS`, `MEMBER_ALREADY_EXISTS`, `INVITATION_ALREADY_PENDING`, `INVITATION_NOT_PENDING`, `INVITATION_EXPIRED`, `INVITATION_EMAIL_MISMATCH`, `RATE_LIMITED`, `INTERNAL_ERROR`. Logical conflicts use **409**.

## Architecture

### Layer rules

- **presentation** may import application (never infrastructure directly except to wire the container in `build_container()`-style factory functions inside the view module).
- **application** imports only domain + `Protocol` ports (`UserRepository`, `PasswordHasher`, `WorkspaceRepository`, `InvitationRepository`, `TransactionBoundary`). Zero Django ORM imports.
- **domain** is pure Python (`normalize_email`, `WorkspaceRole` + RBAC policy, invitation status rules). Unit-testable without Django.
- **infrastructure** holds ORM models, Django implementations of every port, and the atomicity mechanics (`@transaction.atomic`, partial unique constraints).

Business authorization lives in the application/domain layers (`can_manage_members`, membership lookups that raise `NotFoundError` for non-members), so it is enforced **server-side regardless of what the frontend renders**.

### Authentication strategy — JWT + HttpOnly refresh cookie

Chosen: **JWT (SimpleJWT) with rotation, plus an HttpOnly refresh cookie scoped to `/api/v1/auth/`.**

- Why JWT over session auth: the Next.js frontend is a separate origin; stateless Bearer access tokens (15 min) keep the API simple and horizontally scalable.
- Why the cookie in addition: a refresh token stored in `localStorage` is XSS-exfiltratable in an SPA. The refresh token therefore *also* rides in an `HttpOnly` + `SameSite=Lax` + `Secure` (in production) cookie limited to the auth path — the browser can refresh silently while JS can never read the token. Body tokens are still accepted (explicit body wins over the implicit cookie) so non-browser clients work unchanged.
- Rotation: every refresh retires the presented token (`BLACKLIST_AFTER_ROTATION`), so replay of a stolen refresh fails with `401 INVALID_REFRESH_TOKEN`.
- CSRF: the JWT flow is not cookie-authenticated for state-changing calls (Bearer header), so DRF's csrf-exempt APIViews are safe; the cookie alone can only hit `refresh`/`logout`, where the worst-case abuse is rotating or voiding the victim's own session (no data access, no cross-site read possible). Revisit if session auth is ever added.

### Authorization strategy

Roles: `OWNER > ADMIN > MEMBER` (`apps/workspaces/domain.py`).

| Action                    | OWNER | ADMIN | MEMBER |
| ------------------------- | ----- | ----- | ------ |
| Access workspace          | ✓     | ✓     | ✓      |
| Invite members            | ✓     | ✓     | ✗      |
| List/revoke invitations   | ✓     | ✓     | ✗      |
| (Phase 3+) manage settings| ✓     | ✗     | ✗      |

Non-members get `404` — identical to a missing resource — so identifiers cannot be probed (IDOR protection).

## Django convention vs Clean Architecture — pragmatic calls

1. **The Django `User` model doubles as the domain object.** Duplicating it as a pure dataclass plus a mapper would be ceremony without behavior; the seam that matters (application ↔ infrastructure) is the repository Protocol. Domain rules that *do* exist (email normalization) are pure functions.
2. **`models.py` re-exports `infrastructure/models.py`.** Django's autodiscovery expects an app-root `models` module; keeping real models in `infrastructure/` preserves the layering while satisfying Django.
3. **Transactions via a port, not imports.** `AcceptInvitation` depends on a `TransactionBoundary` Protocol; Django's `atomic()` is injected by infrastructure. Atomicity of workspace+membership lives inside the repository method (one aggregate, one transaction).
4. **Expired invitations are materialized on touch** — an accept attempt against an expired invitation flips it to `EXPIRED` *outside* the rolled-back transaction, matching the status machine (`PENDING → ACCEPTED | REVOKED`, lazy `EXPIRED`).
5. **No Django admin/sessions.** API-first; auth is JWT-only, so those apps are not installed.
6. **Duplicate email on signup → 409.** A conscious trade-off: it reveals account existence at signup, but login is strictly generic (`INVALID_CREDENTIALS`) and the onboarding UX requires a precise message. Revisit with email verification in a later phase.
7. **Invitation token returned at creation only.** There is no email delivery yet, so the inviter must be able to share the accept link; the list endpoint deliberately omits tokens.

## Security checklist

- Password hashing: Django's PBKDF2 (never stores raw); policy via `AUTH_PASSWORD_VALIDATORS` (min length 8, common-password, numeric-only).
- JWT: short-lived access, rotating refresh, blacklist on rotation, `USER_ID_CLAIM` validated against the DB on refresh.
- HttpOnly/SameSite/Secure refresh cookie, path-scoped.
- CORS: explicit allow-list from env, credentials enabled only for those origins.
- Rate limiting: scoped throttle on all auth endpoints (`THROTTLE_AUTH`), disabled under tests.
- No user enumeration on login; IDOR-safe workspace/invitation access; non-invitable `OWNER` role; one PENDING invitation per (workspace, email) via a partial unique index; secrets only via env vars.

## Next.js integration contract

The frontend flow maps 1:1:

```text
/signup      → POST /api/v1/auth/signup            → store access, cookie set
/onboarding  → POST /api/v1/workspaces             → workspace + OWNER membership
             → POST /api/v1/workspaces/:id/invitations  (share the returned token link)
/overview    → GET  /api/v1/auth/me + /api/v1/workspaces
```

Consume `/api/schema` (OpenAPI 3) for typed clients. `CORS_ALLOWED_ORIGINS` must include the app origin.
