import { NextResponse } from 'next/server';
import { expandSchema } from '@/lib/validation';
import { expandNode, AnalysisError } from '@/server/analysis/service';
import { getCurrentUser } from '@/server/auth/web';
import { analysisStatus, jsonError, readJson, requireCsrf } from '@/server/http';
import { logger } from '@/lib/log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const csrf = await requireCsrf(request);
  if (csrf) return csrf;
  const user = await getCurrentUser();
  if (!user) return jsonError('unauthorized', 401);

  const parsed = expandSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError('invalid_input', 400);

  try {
    const result = await expandNode(parsed.data, user);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AnalysisError) return jsonError(err.code, analysisStatus(err.code));
    logger.error('expand failed', { route: 'expand' });
    return jsonError('internal', 500);
  }
}
