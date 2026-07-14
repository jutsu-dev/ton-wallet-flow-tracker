import 'server-only';
import type { AccountSummary, DataSource, WalletAction } from '@/domain/types';
import type { Env } from '@/lib/env';
import { getEnv } from '@/lib/env';
import { getProvider } from '@/server/providers';
import { ProviderError } from '@/server/providers/types';
import { prisma } from '@/server/db';
import { rateLimit } from '@/server/rate-limit';
import { recordAudit } from '@/server/audit';
import { normalizeAddress } from '@/lib/ton/address';
import { isTonDomain, normalizeTonDomain } from '@/lib/ton/dns';
import { collectNodeAddresses } from '@/domain/graph';
import { buildGraphDto } from './graph-builder';
import { getDemoAnalysis, getDemoExpansion } from '@/server/demo/fixtures';
import type { AnalysisResult, ExpansionResult, NodeLabelDto, NormalizedAddressDto } from './types';
import type { PublicUser } from '@/server/auth/service';

export type AnalysisErrorCode =
  | 'invalid_address'
  | 'dns_unresolved'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'not_found'
  | 'internal';

export class AnalysisError extends Error {
  constructor(
    public readonly code: AnalysisErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'AnalysisError';
  }
}

function mapProviderError(err: unknown): AnalysisError {
  if (err instanceof ProviderError) {
    switch (err.kind) {
      case 'rate_limited':
        return new AnalysisError('rate_limited');
      case 'not_found':
        return new AnalysisError('not_found');
      case 'bad_request':
        return new AnalysisError('invalid_address');
      default:
        return new AnalysisError('provider_unavailable');
    }
  }
  return new AnalysisError('internal');
}

function analysisLimit(user: PublicUser, env: Env): number {
  return user.role === 'OWNER'
    ? env.MEMBER_ANALYSES_PER_WINDOW * 3
    : env.MEMBER_ANALYSES_PER_WINDOW;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

async function resolveInputAddress(input: string): Promise<NormalizedAddressDto> {
  if (isTonDomain(input)) {
    const domain = normalizeTonDomain(input);
    if (!domain) throw new AnalysisError('invalid_address');
    let result;
    try {
      result = await getProvider().resolveDns(domain);
    } catch (err) {
      throw mapProviderError(err);
    }
    const normalized = result.data ? normalizeAddress(result.data.address) : null;
    if (!normalized) throw new AnalysisError('dns_unresolved');
    return normalized;
  }
  const normalized = normalizeAddress(input);
  if (!normalized) throw new AnalysisError('invalid_address');
  return normalized;
}

async function labelsForAddresses(rawAddresses: string[]): Promise<Map<string, NodeLabelDto[]>> {
  const map = new Map<string, NodeLabelDto[]>();
  if (rawAddresses.length === 0) return map;
  const wallets = await prisma.wallet.findMany({
    where: { canonicalAddress: { in: rawAddresses } },
    include: { labels: { orderBy: { createdAt: 'desc' } } },
  });
  for (const wallet of wallets) {
    map.set(
      wallet.canonicalAddress,
      wallet.labels.map((label) => ({ labelType: label.labelType, title: label.title, note: label.note })),
    );
  }
  return map;
}

export async function analyzeWallet(
  input: { address: string; limit: number; depth: number },
  user: PublicUser,
): Promise<AnalysisResult> {
  const env = getEnv();
  if (env.DEMO_MODE) return getDemoAnalysis();

  const rl = rateLimit(
    `analyze:${user.id}`,
    analysisLimit(user, env),
    env.MEMBER_ANALYSIS_WINDOW_MINUTES * 60_000,
  );
  if (!rl.allowed) throw new AnalysisError('rate_limited');

  const addr = await resolveInputAddress(input.address);
  const limit = Math.min(input.limit, env.MAX_SOURCE_EVENTS);
  const depth = Math.min(input.depth, env.MAX_EXPANSION_DEPTH);
  const provider = getProvider();

  const warnings: string[] = [];
  let incomplete = false;
  let source: DataSource = 'tonapi';

  let account: AccountSummary | null = null;
  try {
    const accountResult = await provider.getAccount(addr.raw);
    account = accountResult.data;
    source = accountResult.source;
    incomplete = incomplete || accountResult.incomplete;
    warnings.push(...accountResult.warnings);
  } catch {
    warnings.push('Не удалось загрузить сведения об аккаунте.');
  }

  let actions: WalletAction[] = [];
  try {
    const eventsResult = await provider.getAccountEvents(addr.raw, { limit });
    actions = eventsResult.data.actions;
    source = eventsResult.source;
    incomplete = incomplete || eventsResult.incomplete;
    warnings.push(...eventsResult.warnings);
  } catch (err) {
    throw mapProviderError(err);
  }

  let checkId: string | null = null;
  try {
    const wallet = await prisma.wallet.upsert({
      where: { canonicalAddress: addr.raw },
      create: {
        canonicalAddress: addr.raw,
        bounceableAddress: addr.bounceable,
        nonBounceableAddress: addr.nonBounceable,
        firstSeenAt: new Date(),
        lastCheckedAt: new Date(),
      },
      update: {
        lastCheckedAt: new Date(),
        bounceableAddress: addr.bounceable,
        nonBounceableAddress: addr.nonBounceable,
      },
    });
    const check = await prisma.walletCheck.create({
      data: {
        walletId: wallet.id,
        requestedByUserId: user.id,
        requestedLimit: limit,
        requestedDepth: depth,
        status: incomplete ? 'PARTIAL' : 'SUCCESS',
        dataSource: source,
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
    checkId = check.id;
    await recordAudit({
      userId: user.id,
      action: 'wallet_analyzed',
      resourceType: 'wallet',
      resourceId: wallet.id,
      metadata: { limit, depth, source },
    });
  } catch {
    // Persistence failure must not break the analysis response.
  }

  const labelsByAddress = await labelsForAddresses(collectNodeAddresses(actions, addr.raw)).catch(
    () => new Map<string, NodeLabelDto[]>(),
  );
  const graph = buildGraphDto(actions, {
    centerRaw: addr.raw,
    maxNodes: env.MAX_GRAPH_NODES,
    maxEdges: env.MAX_GRAPH_EDGES,
    labelsByAddress,
  });

  return {
    input: input.address,
    address: addr,
    account,
    actions,
    nodes: graph.nodes,
    edges: graph.edges,
    source,
    incomplete,
    warnings: dedupe(warnings),
    truncated: graph.truncated,
    checkId,
    demo: false,
  };
}

export async function expandNode(
  input: { address: string; limit: number },
  user: PublicUser,
): Promise<ExpansionResult> {
  const env = getEnv();
  if (env.DEMO_MODE) {
    const normalized = normalizeAddress(input.address);
    return getDemoExpansion(normalized?.raw ?? input.address);
  }

  const rl = rateLimit(
    `expand:${user.id}`,
    analysisLimit(user, env) * 3,
    env.MEMBER_ANALYSIS_WINDOW_MINUTES * 60_000,
  );
  if (!rl.allowed) throw new AnalysisError('rate_limited');

  const normalized = normalizeAddress(input.address);
  if (!normalized) throw new AnalysisError('invalid_address');
  const limit = Math.min(input.limit, env.MAX_SOURCE_EVENTS);

  let eventsResult;
  try {
    eventsResult = await getProvider().getAccountEvents(normalized.raw, { limit });
  } catch (err) {
    throw mapProviderError(err);
  }

  const labelsByAddress = await labelsForAddresses(
    collectNodeAddresses(eventsResult.data.actions, normalized.raw),
  ).catch(() => new Map<string, NodeLabelDto[]>());
  const graph = buildGraphDto(eventsResult.data.actions, {
    centerRaw: normalized.raw,
    maxNodes: env.MAX_GRAPH_NODES,
    maxEdges: env.MAX_GRAPH_EDGES,
    labelsByAddress,
  });

  return {
    center: normalized.raw,
    nodes: graph.nodes,
    edges: graph.edges,
    actions: eventsResult.data.actions,
    source: eventsResult.source,
    incomplete: eventsResult.incomplete,
    warnings: dedupe(eventsResult.warnings),
    truncated: graph.truncated,
  };
}
