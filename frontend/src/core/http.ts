/**
 * Cliente HTTP del frontend (capa core).
 * - Base /api (el proxy Vite en dev redirige al backend).
 * - Adjunta el token guardado en localStorage (Bearer).
 * - Ante un 401, limpia la sesion y redirige al login.
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

export const session = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
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
