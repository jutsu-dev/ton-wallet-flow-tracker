'use client';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const escaped = name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : '';
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': readCookie('twft_csrf'),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code =
      data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : 'error';
    throw new ApiError(code, res.status);
  }
  return data as T;
}

export const apiPost = <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body);
export const apiDelete = <T>(path: string): Promise<T> => request<T>('DELETE', path);
