# QR Code Auth Worker

Cloudflare Worker that **serves the SPA *and* handles Google OAuth 2.0** for the QR code app.

- Static assets: served via the built-in `[assets]` binding from `../dist/` (Vite build output).
- API routes: `/auth/*` are handled inline (anything else falls through to the SPA).
- Sessions: stateless, HMAC-SHA256-signed, HttpOnly cookie. No KV/D1 required.

## Endpoints

| Method | Path             | Description                                            |
| ------ | ---------------- | ------------------------------------------------------ |
| GET    | `/auth/login`    | Redirects to Google's consent screen.                  |
| GET    | `/auth/callback` | Exchanges the auth code, sets the session cookie.      |
| GET    | `/auth/me`       | Returns the current user, or `401` if not signed in.   |
| POST   | `/auth/logout`   | Clears the session cookie.                             |
| any    | other paths      | Served from the SPA bundle.                            |

## Setup

### 1. Create a Google OAuth Client

In <https://console.cloud.google.com/apis/credentials>:

1. **Create credentials → OAuth client ID** → *Web application*.
2. Add **Authorized redirect URIs**:
   - `http://localhost:8787/auth/callback` (local Worker)
   - `https://qrcode-s.<your-subdomain>.workers.dev/auth/callback` (deployed)
3. Copy the **Client ID** and **Client Secret**.

### 2. Configure Wrangler

From the repo root:

```bash
npm install                    # installs wrangler at the root
npx wrangler login             # one-time, opens the browser
```

Set the public client id in `worker/wrangler.toml` (`GOOGLE_CLIENT_ID`),
then store the secrets:

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.toml
npx wrangler secret put SESSION_SECRET       --config worker/wrangler.toml
```

`SESSION_SECRET` should be any long random string (e.g. `openssl rand -hex 32`).

### 3. Deploy

```bash
npm run deploy           # builds the SPA, then deploys the Worker
# or
npm run deploy:prod      # uses [env.production] from wrangler.toml
```

### 4. Local development

Two options:

**a) Single-Worker (production-like):**

```bash
npm run build
npx wrangler dev --config worker/wrangler.toml --port 8787
# open http://localhost:8787
```

**b) Vite + Worker side-by-side (with HMR):**

```bash
npm run dev:worker       # Worker on :8787 (no static assets needed)
npm run dev              # Vite on :3000, proxies /auth/* to :8787
# open http://localhost:3000
```

For mode (b), keep `ALLOWED_ORIGINS` in `wrangler.toml` as
`http://localhost:3000` so the post-login redirect is permitted.
