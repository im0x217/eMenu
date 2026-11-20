---
name: releasing-emenu
description: Executes the e-Menu pre-release build, WCAG audit, test suite, service worker cache bump, non-3000 read-only HTTP smoke test, and Render deployment workflow. Use when preparing a release, verifying builds, bumping public/sw.js CACHE_NAME, running smoke tests, or auditing Render e-menu-secrets config.
---

# Releasing e-Menu

End-to-end verification and deployment pipeline for **e-Menu** (`render.yaml` + Node/Express `server.js` + Vite SPA built to `public/app/`).

**Critical Render Deploy Constraint:** `render.yaml` sets `buildCommand: npm install` and `startCommand: node server.js`. Render does not build Vite on deploy, so `npm run build` must run locally and compiled `public/app/` + `public/sw.js` assets must be committed before pushing `main`.

## When to use this skill
- Preparing any frontend, token, or backend release for production
- Running the ordered verification gates before committing or pushing
- Bumping `CACHE_NAME` in `public/sw.js` for PWA cache invalidation
- Running a safe read-only HTTP smoke test without disturbing port `3000`
- Auditing environment variables in Render's `e-menu-secrets` group

## Ordered Verification Pipeline

Run these exact steps in sequence (PowerShell 5.1 does not support `&&`; execute line by line or check `$LASTEXITCODE`):

1. **Compile Design Tokens:**
   ```powershell
   npm run tokens:build
   ```
   Regenerates `frontend/src/tokens/tokens.css` and `frontend/src/tokens/tokens.js` from `frontend/src/tokens/tokens.json`. Confirm zero cyclic CSS self-references.

2. **Run UX & WCAG 2.1 Audit:**
   ```powershell
   npm run ux:audit
   ```
   Executes `scripts/ux-audit.js` across `frontend/src/components/` and `frontend/src/views/`. Must exit `0` with `0` Errors and `0` Warnings.

3. **Run Backend Syntax & Unit Tests:**
   ```powershell
   node --check server.js
   npm test
   ```
   Runs `node --test tests/*.test.js` cleanly with zero live database mutations.

4. **Build Production Vite Bundle:**
   ```powershell
   npm run build
   ```
   Executes `npm run tokens:build` and `npm run build --prefix frontend`, outputting the production SPA (`base: '/app/'`) into `public/app/`.

5. **Bump Service Worker Cache (`public/sw.js`):**
   - Inspect line 1 of `public/sw.js` (`const CACHE_NAME = 'emenu-cache-vNNN';`).
   - Increment `vNNN` by `+1` whenever `public/app/`, HTML shells, icons, manifests, or frontend behavior changed so PWA clients evict stale caches.

6. **Read-Only Live HTTP Smoke Test (Non-3000 Port):**
   Boot `server.js` on an isolated non-3000 port (e.g., `3006`) so any existing local dev instance on `3000` stays undisturbed, run `GET`-only checks, then stop the process:
   ```powershell
   $env:PORT = '3006'
   $proc = Start-Process -FilePath 'node' -ArgumentList 'server.js' -PassThru -NoNewWindow
   Start-Sleep -Seconds 3
   Invoke-WebRequest -UseBasicParsing 'http://localhost:3006/api/health' | Select-Object StatusCode, Content
   Invoke-WebRequest -UseBasicParsing 'http://localhost:3006/api/ready' | Select-Object StatusCode, Content
   Invoke-WebRequest -UseBasicParsing 'http://localhost:3006/app/' | Select-Object StatusCode
   Invoke-WebRequest -UseBasicParsing 'http://localhost:3006/api/products?shop=shop1' | Select-Object StatusCode
   Stop-Process -Id $proc.Id -Force
   Remove-Item Env:PORT
   ```
   - Never run `POST`, `PUT`, `PATCH`, or `DELETE` during smoke tests against live MongoDB (`emenu`, `emenu2`) or PocketBase.
   - Verify `200` on `/api/health`, `200` (connected) or expected `503` (if no live DB env) on `/api/ready`, and `200` HTML on `/app/`.

7. **Commit & Push to Main:**
   - Review `git status` and `git diff` (confirm `.env`, CSVs, and `EmenuBackup` artifacts are excluded).
   - Commit verified source + `public/app/` + `public/sw.js`, then push only when authorized for release:
     ```powershell
     git add <verified-files>
     git commit -m "chore(release): verify build and bump sw cache"
     git push origin main
     ```

## Render & `e-menu-secrets` Checklist

Matches `render.yaml` (`service: e-menu`, `env: node`, `startCommand: node server.js`, `fromGroup: e-menu-secrets`) and `.env.example`:

- **Required at Boot:** `MONGO_URI`
- **Admin & Auth Security:**
  - `ADMIN_USER`
  - `ADMIN_PASS` (must not remain `'1234'` in production)
  - `ADMIN_SESSION_SECRET` (set strong random secret; `STRICT_CONFIG` defaults `'false'` for backwards compatibility — set `'true'` once all secrets are populated)
  - `BULK_CODE`, `CUSTOMER_TOKEN_TTL_DAYS` (`30`), `ENABLE_DEBUG_ROUTES` (`false` in production), `PUBLIC_STAFF_SELECTOR`
- **AWS S3 & CDN:** `AWS_REGION` (`us-east-1`), `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET` (`e-menu-products`), `AWS_CLOUDFRONT_DOMAIN`
- **Integrations & Runtime:** `POCKETBASE_URL` (`https://crystal-crocodile.pikapod.net`), `PORT` (managed by Render; local default `3000`), `BACKUP_DIR`

## Release Execution Checklist

- [ ] `npm run tokens:build` completed cleanly
- [ ] `npm run ux:audit` passed (`0` Errors, `0` Warnings)
- [ ] `node --check server.js` and `npm test` passed
- [ ] `npm run build` updated `public/app/`
- [ ] `CACHE_NAME` incremented by `+1` in `public/sw.js` line 1
- [ ] Read-only HTTP smoke test passed on non-3000 port (`3006`) and temporary server stopped
- [ ] `git status` clean of `.env` or scratch artifacts; Render `e-menu-secrets` checklist verified
- [ ] Committed cleanly (and `git push origin main` run only when ready to deploy)
