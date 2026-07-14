import { NextResponse } from 'next/server';
import { analyzeSchema } from '@/lib/validation';
import { analyzeWallet, AnalysisError } from '@/server/analysis/service';
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

  const parsed = analyzeSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError('invalid_input', 400);

  try {
    const result = await analyzeWallet(parsed.data, user);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AnalysisError) return jsonError(err.code, analysisStatus(err.code));
    logger.error('analyze failed', { route: 'analyze' });
    return jsonError('internal', 500);
  }
}
