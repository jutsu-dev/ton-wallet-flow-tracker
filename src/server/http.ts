import 'server-only';
import { NextResponse } from 'next/server';
import { verifyCsrf } from '@/server/auth/web';
import type { AnalysisErrorCode } from '@/server/analysis/service';

export function jsonError(code: string, status: number): NextResponse {
  return NextResponse.json({ error: code }, { status });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Returns a 403 response if CSRF/origin checks fail, otherwise null. */
export async function requireCsrf(request: Request): Promise<NextResponse | null> {
  const ok = await verifyCsrf(request);
  return ok ? null : jsonError('csrf', 403);
}

export function analysisStatus(code: AnalysisErrorCode): number {
  switch (code) {
    case 'rate_limited':
      return 429;
    case 'invalid_address':
    case 'dns_unresolved':
      return 400;
    case 'not_found':
      return 404;
    case 'provider_unavailable':
      return 502;
    default:
      return 500;
  }
}
