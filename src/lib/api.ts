export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const BASE = '/api';

async function parseResponse(res: Response): Promise<any> {
  const text = await res.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text.slice(0, 300) };
    }
  }
  if (!res.ok) {
    throw new ApiError(res.status, data?.error || `Request failed (${res.status})`, data?.code);
  }
  return data;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Requested-With', 'beautyzone');
  if (options.body && !(options.body instanceof Blob) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: 'same-origin',
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(0, 'Network error. Please check your connection and try again.');
  }
  return parseResponse(res) as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: async (file: File, kind: 'logo' | 'cover' | 'gallery' | 'staff'): Promise<{ url: string }> => {
    if (!file.type.startsWith('image/')) {
      throw new ApiError(400, 'Please choose an image file.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new ApiError(400, 'Images must be 5 MB or smaller.');
    }
    return request<{ url: string }>(`/salon/uploads?kind=${encodeURIComponent(kind)}`, {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': file.type },
    });
  },
};

export const errorMessage = (err: unknown) =>
  err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Something went wrong.';
