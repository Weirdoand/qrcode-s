export interface Code {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  type: string;
  target: string;
  visit_count: number;
  created_at: number;
  updated_at: number;
}

interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText })) as { error?: string; message?: string };
    const err = new Error(data.message ?? data.error ?? 'request_failed') as ApiError;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return res.json() as Promise<T>;
}

export const api = {
  listCodes: () =>
    apiFetch<{ codes: Code[] }>('/api/codes').then(r => r.codes),

  createCode: (body: { title: string; description?: string; type: string; target: string }) =>
    apiFetch<{ code: Code }>('/api/codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.code),

  getCode: (id: string) =>
    apiFetch<{ code: Code }>(`/api/codes/${id}`).then(r => r.code),

  updateCode: (id: string, body: { title: string; description?: string; target: string }) =>
    apiFetch<{ code: Code }>(`/api/codes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.code),

  deleteCode: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/codes/${id}`, { method: 'DELETE' }),

  uploadImage: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiFetch<{ url: string; key: string }>('/api/upload', { method: 'POST', body: fd });
  },

  getLiveCode: (slug: string) =>
    apiFetch<{ code: Code }>(`/c/${slug}`).then(r => r.code),
};

export function liveUrl(slug: string): string {
  return `${window.location.origin}/c/${slug}`;
}

export function qrImageUrl(livePageUrl: string, size = 512): string {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(livePageUrl)}&size=${size}x${size}&margin=4&ecc=Q&format=png`;
}

export function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
