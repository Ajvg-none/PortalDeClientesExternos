/**
 * Cliente HTTP del frontend (capa core).
 * - Base /api (el proxy Vite en dev redirige al backend).
 * - Adjunta el token guardado en localStorage (Bearer).
 * - Ante un 401, limpia la sesion y redirige al login.
 * - La sesion persiste token + usuario (REM-2026-09): tras recargar la SPA el
 *   usuario se restaura desde storage y no se fuerza un logout.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TOKEN_KEY = 'portal_token';
const USER_KEY = 'portal_user';

/** Serializa params de consulta (REM-cleanup 2026-09/F3): evita repetir el
 *  armado de URLSearchParams en cada feature. */
export function qs(params?: Record<string, string>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.set(k, v);
  }
  const out = search.toString();
  return out ? `?${out}` : '';
}

export const session = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  setUser(user: unknown): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser<T>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const auth = token ?? session.getToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && path !== '/auth/login') {
    session.clear();
    window.location.assign('/login');
    throw new ApiError(401, 'UNAUTHORIZED', 'Sesion expirada');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (payload as { code?: string })?.code ?? 'ERROR',
      (payload as { message?: string })?.message ?? 'Error de la API',
      (payload as { errors?: unknown })?.errors,
    );
  }
  return payload as T;
}

export const http = {
  get: <T>(path: string, token?: string) => request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: unknown, token?: string) => request<T>('POST', path, body, token),
  patch: <T>(path: string, body?: unknown, token?: string) => request<T>('PATCH', path, body, token),
};

/**
 * Descarga autenticada (REM-2026-09/RF-34): un <a>/window.open no adjunta el
 * JWT, asi que el endpoint protegido responde 401. Se usa fetch con el header
 * Authorization y se dispara la descarga desde un Blob.
 */
export async function httpDownload(path: string, filename: string, token?: string): Promise<void> {
  const auth = token ?? session.getToken();
  const headers: Record<string, string> = {};
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const res = await fetch(`/api${path}`, { headers });
  if (!res.ok) {
    throw new ApiError(res.status, 'ERROR', `No se pudo descargar el archivo (HTTP ${res.status})`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
