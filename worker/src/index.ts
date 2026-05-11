/**
 * Cloudflare Worker: Live QR Code SaaS backend
 *
 * Auth:       GET /auth/login, GET /auth/callback, GET /auth/me, POST /auth/logout
 * API:        GET|POST /api/codes, GET|PUT|DELETE /api/codes/:id, POST /api/upload
 * Public:     GET /c/:slug, GET /api/images/:key
 */

import { nanoid } from 'nanoid';

export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ALLOWED_ORIGINS: string;
  SESSION_SECRET: string;
  SESSION_TTL?: string;
  DB: D1Database;
  UPLOADS: R2Bucket;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
}

interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  picture: string;
  iat: number;
  exp: number;
}

interface CodeRow {
  id: string;
  slug: string;
  user_id: string;
  title: string;
  description: string | null;
  type: string;
  target: string;
  visit_count: number;
  created_at: number;
  updated_at: number;
}

const COOKIE_NAME = 'qr_session';
const STATE_COOKIE = 'qr_oauth_state';
const DEFAULT_TTL = 60 * 60 * 24 * 7;
const MAX_CODES_PER_USER = 20;
const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS' && (pathname.startsWith('/auth/') || pathname.startsWith('/api/'))) {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    try {
      // Auth
      if (pathname === '/auth/login') return handleLogin(request, env);
      if (pathname === '/auth/callback') return handleCallback(request, env);
      if (pathname === '/auth/me') return handleMe(request, env);
      if (pathname === '/auth/logout') return handleLogout(request, env);

      // /c/:slug — fall through to SPA fallback below

      // Public: live page data — GET /api/codes/slug/:slug (no auth required)
      const liveApi = pathname.match(/^\/api\/codes\/slug\/([a-zA-Z0-9_-]+)$/);
      if (liveApi && request.method === 'GET') return handleLivePage(request, env, liveApi[1]);

      // Public: image proxy
      if (pathname.startsWith('/api/images/')) {
        return handleImageProxy(request, env, pathname.slice('/api/images/'.length));
      }

      // Protected API
      if (pathname === '/api/codes') {
        if (request.method === 'GET') return requireAuth(request, env, handleListCodes);
        if (request.method === 'POST') return requireAuth(request, env, handleCreateCode);
      }
      if (pathname === '/api/upload' && request.method === 'POST') {
        return requireAuth(request, env, handleUpload);
      }
      const cm = pathname.match(/^\/api\/codes\/([a-zA-Z0-9_-]+)$/);
      if (cm) {
        if (request.method === 'GET')    return requireAuth(request, env, (q, e, s) => handleGetCode(q, e, s, cm[1]));
        if (request.method === 'PUT')    return requireAuth(request, env, (q, e, s) => handleUpdateCode(q, e, s, cm[1]));
        if (request.method === 'DELETE') return requireAuth(request, env, (q, e, s) => handleDeleteCode(q, e, s, cm[1]));
      }
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: 'internal_error', message: String(err) }, 500, request, env);
    }

    if (env.ASSETS) {
      // API/auth routes that fall through here have no handler — return 404 JSON
      if (pathname.startsWith('/api/') || pathname.startsWith('/auth/')) {
        return jsonResponse({ error: 'not_found' }, 404, request, env);
      }
      // For everything else, try static assets; 404s fall back to index.html for SPA routing
      const assetRes = await env.ASSETS.fetch(request);
      if (assetRes.status === 404) {
        return env.ASSETS.fetch(new Request(new URL('/', request.url).toString(), request));
      }
      return assetRes;
    }
    return new Response('Not found', { status: 404 });
  },
};

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

type AuthHandler = (req: Request, env: Env, session: SessionPayload) => Promise<Response>;

async function requireAuth(request: Request, env: Env, handler: AuthHandler): Promise<Response> {
  const session = await readSession(request, env);
  if (!session) return jsonResponse({ error: 'unauthorized' }, 401, request, env);
  await upsertUser(env, session);
  return handler(request, env, session);
}

async function upsertUser(env: Env, s: SessionPayload): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, picture, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture`,
  ).bind(s.sub, s.email, s.name, s.picture, Math.floor(Date.now() / 1000)).run();
}

// ---------------------------------------------------------------------------
// API handlers
// ---------------------------------------------------------------------------

async function handleListCodes(request: Request, env: Env, session: SessionPayload): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, title, description, type, target, visit_count, created_at, updated_at
     FROM codes WHERE user_id = ? ORDER BY created_at DESC`,
  ).bind(session.sub).all<CodeRow>();
  return jsonResponse({ codes: results }, 200, request, env);
}

async function handleCreateCode(request: Request, env: Env, session: SessionPayload): Promise<Response> {
  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM codes WHERE user_id = ?`,
  ).bind(session.sub).first<{ count: number }>();
  if ((countRow?.count ?? 0) >= MAX_CODES_PER_USER) {
    return jsonResponse({ error: 'limit_exceeded', message: `Max ${MAX_CODES_PER_USER} codes per account` }, 429, request, env);
  }

  let body: { title?: string; description?: string; type?: string; target?: string };
  try { body = await request.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400, request, env); }

  const { title, description, type = 'image', target } = body;
  if (!title?.trim()) return jsonResponse({ error: 'title_required' }, 400, request, env);
  if (!target?.trim()) return jsonResponse({ error: 'target_required' }, 400, request, env);

  const id = nanoid(10);
  const slug = nanoid(8);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO codes (id, slug, user_id, title, description, type, target, visit_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).bind(id, slug, session.sub, title.trim(), description?.trim() ?? null, type, target.trim(), now, now).run();

  const code = await env.DB.prepare(`SELECT * FROM codes WHERE id = ?`).bind(id).first<CodeRow>();
  return jsonResponse({ code }, 201, request, env);
}

async function handleGetCode(request: Request, env: Env, session: SessionPayload, id: string): Promise<Response> {
  const code = await env.DB.prepare(
    `SELECT * FROM codes WHERE id = ? AND user_id = ?`,
  ).bind(id, session.sub).first<CodeRow>();
  if (!code) return jsonResponse({ error: 'not_found' }, 404, request, env);
  return jsonResponse({ code }, 200, request, env);
}

async function handleUpdateCode(request: Request, env: Env, session: SessionPayload, id: string): Promise<Response> {
  const existing = await env.DB.prepare(
    `SELECT id FROM codes WHERE id = ? AND user_id = ?`,
  ).bind(id, session.sub).first<{ id: string }>();
  if (!existing) return jsonResponse({ error: 'not_found' }, 404, request, env);

  let body: { title?: string; description?: string; target?: string };
  try { body = await request.json(); } catch { return jsonResponse({ error: 'invalid_json' }, 400, request, env); }

  const { title, description, target } = body;
  if (!title?.trim()) return jsonResponse({ error: 'title_required' }, 400, request, env);
  if (!target?.trim()) return jsonResponse({ error: 'target_required' }, 400, request, env);

  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    `UPDATE codes SET title = ?, description = ?, target = ?, updated_at = ? WHERE id = ?`,
  ).bind(title.trim(), description?.trim() ?? null, target.trim(), now, id).run();

  const code = await env.DB.prepare(`SELECT * FROM codes WHERE id = ?`).bind(id).first<CodeRow>();
  return jsonResponse({ code }, 200, request, env);
}

async function handleDeleteCode(request: Request, env: Env, session: SessionPayload, id: string): Promise<Response> {
  const existing = await env.DB.prepare(
    `SELECT id, target, type FROM codes WHERE id = ? AND user_id = ?`,
  ).bind(id, session.sub).first<{ id: string; target: string; type: string }>();
  if (!existing) return jsonResponse({ error: 'not_found' }, 404, request, env);

  if (existing.type === 'image' && existing.target.includes('/api/images/')) {
    const key = existing.target.split('/api/images/')[1];
    if (key) await env.UPLOADS.delete(key).catch(() => {});
  }

  await env.DB.prepare(`DELETE FROM codes WHERE id = ?`).bind(id).run();
  return jsonResponse({ ok: true }, 200, request, env);
}

async function handleUpload(request: Request, env: Env, session: SessionPayload): Promise<Response> {
  if (!request.headers.get('Content-Type')?.includes('multipart/form-data')) {
    return jsonResponse({ error: 'multipart_required' }, 400, request, env);
  }

  let formData: FormData;
  try { formData = await request.formData(); } catch { return jsonResponse({ error: 'invalid_form_data' }, 400, request, env); }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) return jsonResponse({ error: 'file_required' }, 400, request, env);
  if (!ALLOWED_MIME.includes(file.type)) return jsonResponse({ error: 'invalid_file_type', allowed: ALLOWED_MIME }, 400, request, env);
  if (file.size > MAX_UPLOAD_SIZE) return jsonResponse({ error: 'file_too_large', maxMB: 5 }, 400, request, env);

  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const key = `uploads/${session.sub}/${nanoid(16)}.${ext}`;
  await env.UPLOADS.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });

  const imageUrl = `${new URL(request.url).origin}/api/images/${key}`;
  return jsonResponse({ url: imageUrl, key }, 201, request, env);
}

// ---------------------------------------------------------------------------
// Public handlers
// ---------------------------------------------------------------------------

async function handleLivePage(request: Request, env: Env, slug: string): Promise<Response> {
  const code = await env.DB.prepare(
    `SELECT id, slug, title, description, type, target, visit_count FROM codes WHERE slug = ?`,
  ).bind(slug).first<CodeRow>();

  if (!code) {
    return jsonResponse({ error: 'not_found' }, 404, request, env);
  }

  env.DB.prepare(`UPDATE codes SET visit_count = visit_count + 1 WHERE slug = ?`).bind(slug).run().catch(() => {});

  return jsonResponse({ code }, 200, request, env);
}

async function handleImageProxy(request: Request, env: Env, key: string): Promise<Response> {
  if (!key || key.includes('..')) return new Response('Not found', { status: 404 });
  const object = await env.UPLOADS.get(key);
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', object.httpEtag);
  return new Response(object.body, { headers });
}

// ---------------------------------------------------------------------------
// Auth route handlers
// ---------------------------------------------------------------------------

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get('return_to') || getDefaultReturnTo(request, env);
  const stateNonce = randomToken(24);
  const statePayload = `${stateNonce}|${returnTo}`;
  const signedState = await sign(statePayload, env.SESSION_SECRET);
  const state = `${b64urlEncode(new TextEncoder().encode(statePayload))}.${signedState}`;
  const redirectUri = `${url.origin}/auth/callback`;
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('access_type', 'online');
  authUrl.searchParams.set('prompt', 'select_account');
  const headers = new Headers({ Location: authUrl.toString() });
  headers.append('Set-Cookie', buildCookie(STATE_COOKIE, stateNonce, { maxAge: 600, httpOnly: true, secure: isHttps(url), sameSite: 'Lax' }));
  return new Response(null, { status: 302, headers });
}

async function handleCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');
  if (errorParam) return new Response(`OAuth error: ${errorParam}`, { status: 400 });
  if (!code || !stateParam) return new Response('Missing code or state', { status: 400 });
  const [payloadB64, signature] = stateParam.split('.');
  if (!payloadB64 || !signature) return new Response('Bad state', { status: 400 });
  const payloadBytes = b64urlDecode(payloadB64);
  const payloadStr = new TextDecoder().decode(payloadBytes);
  const expectedSig = await sign(payloadStr, env.SESSION_SECRET);
  if (!timingSafeEqual(expectedSig, signature)) return new Response('Invalid state signature', { status: 400 });
  const [stateNonce, returnTo] = payloadStr.split('|');
  const cookies = parseCookies(request.headers.get('Cookie'));
  if (!stateNonce || cookies[STATE_COOKIE] !== stateNonce) return new Response('State mismatch', { status: 400 });
  const redirectUri = `${url.origin}/auth/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  if (!tokenRes.ok) { const txt = await tokenRes.text(); console.error('Token exchange failed:', txt); return new Response('Token exchange failed', { status: 502 }); }
  const tokens = (await tokenRes.json()) as { id_token?: string };
  if (!tokens.id_token) return new Response('No id_token', { status: 502 });
  const idClaims = decodeJwtClaims(tokens.id_token);
  if (idClaims.aud !== env.GOOGLE_CLIENT_ID) return new Response('Bad audience', { status: 400 });
  if (idClaims.iss !== 'https://accounts.google.com' && idClaims.iss !== 'accounts.google.com') return new Response('Bad issuer', { status: 400 });
  const now = Math.floor(Date.now() / 1000);
  if (typeof idClaims.exp !== 'number' || idClaims.exp < now) return new Response('Expired id_token', { status: 400 });
  const ttl = Number(env.SESSION_TTL) || DEFAULT_TTL;
  const session: SessionPayload = { sub: String(idClaims.sub), email: String(idClaims.email ?? ''), name: String(idClaims.name ?? idClaims.email ?? ''), picture: String(idClaims.picture ?? ''), iat: now, exp: now + ttl };
  const sessionCookie = await encodeSession(session, env.SESSION_SECRET);
  const safeReturnTo = sanitizeReturnTo(returnTo, env, request);
  const headers = new Headers({ Location: safeReturnTo });
  headers.append('Set-Cookie', buildCookie(COOKIE_NAME, sessionCookie, { maxAge: ttl, httpOnly: true, secure: isHttps(url), sameSite: 'Lax', path: '/' }));
  headers.append('Set-Cookie', buildCookie(STATE_COOKIE, '', { maxAge: 0, httpOnly: true, secure: isHttps(url), sameSite: 'Lax' }));
  return new Response(null, { status: 302, headers });
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const session = await readSession(request, env);
  if (!session) return jsonResponse({ user: null }, 401, request, env);
  return jsonResponse({ user: { id: session.sub, email: session.email, name: session.name, picture: session.picture } }, 200, request, env);
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const headers = corsHeaders(request, env);
  headers.append('Set-Cookie', buildCookie(COOKIE_NAME, '', { maxAge: 0, httpOnly: true, secure: isHttps(url), sameSite: 'Lax', path: '/' }));
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

async function encodeSession(payload: SessionPayload, secret: string): Promise<string> {
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

async function decodeSession(token: string, secret: string): Promise<SessionPayload | null> {
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  if (!timingSafeEqual(await sign(payloadB64, secret), sig)) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64))) as SessionPayload;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}

async function readSession(request: Request, env: Env): Promise<SessionPayload | null> {
  const cookies = parseCookies(request.headers.get('Cookie'));
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  return decodeSession(token, env.SESSION_SECRET);
}

// ---------------------------------------------------------------------------
// Crypto + encoding
// ---------------------------------------------------------------------------

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(sigBuf));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJwtClaims(jwt: string): Record<string, unknown> {
  const [, payload] = jwt.split('.');
  if (!payload) throw new Error('malformed jwt');
  return JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
}

function randomToken(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return b64urlEncode(bytes);
}

// ---------------------------------------------------------------------------
// Cookie + CORS helpers
// ---------------------------------------------------------------------------

interface CookieOptions { maxAge?: number; httpOnly?: boolean; secure?: boolean; sameSite?: 'Strict' | 'Lax' | 'None'; path?: string; }

function buildCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${value}`, `Path=${opts.path ?? '/'}`];
  if (typeof opts.maxAge === 'number') parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join('; ');
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

function isHttps(url: URL): boolean { return url.protocol === 'https:'; }

function getAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
}

function getDefaultReturnTo(request: Request, env: Env): string {
  const allowed = getAllowedOrigins(env);
  return allowed.length > 0 ? allowed[0] : new URL(request.url).origin;
}

function sanitizeReturnTo(returnTo: string, env: Env, request?: Request): string {
  const allowed = getAllowedOrigins(env);
  try {
    const u = new URL(returnTo);
    const origin = `${u.protocol}//${u.host}`;
    if (allowed.includes(origin)) return returnTo;
    if (allowed.length === 0 && request) {
      if (origin === new URL(request.url).origin) return returnTo;
    }
  } catch { /* ignore */ }
  return request ? new URL(request.url).origin : (getAllowedOrigins(env)[0] || '/');
}

function corsHeaders(request: Request, env: Env): Headers {
  const headers = new Headers();
  const origin = request.headers.get('Origin');
  const allowed = getAllowedOrigins(env);
  if (origin && allowed.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  return headers;
}

function jsonResponse(body: unknown, status: number, request: Request, env: Env): Response {
  const headers = corsHeaders(request, env);
  headers.set('Content-Type', 'application/json');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify(body), { status, headers });
}
