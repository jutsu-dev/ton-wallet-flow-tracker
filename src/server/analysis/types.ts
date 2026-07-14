import type { AccountSummary, DataSource, WalletAction } from '@/domain/types';
import type { NodeKind } from '@/domain/graph';

export interface NodeLabelDto {
  labelType: string;
  title: string;
  note: string | null;
}

export interface GraphNodeDto {
  address: string; // canonical raw
  bounceable: string;
  short: string;
  isCenter: boolean;
  kind: NodeKind;
  incoming: number;
  outgoing: number;
  labels: NodeLabelDto[];
}

export interface GraphEdgeDto {
  id: string;
  from: string;
  to: string;
  assetType: string;
  label: string;
  count: number;
  hasFailed: boolean;
  hasSuccess: boolean;
}

export interface NormalizedAddressDto {
  raw: string;
  bounceable: string;
  nonBounceable: string;
  workchain: number;
}

export interface AnalysisResult {
  input: string;
  address: NormalizedAddressDto | null;
  account: AccountSummary | null;
  actions: WalletAction[];
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  source: DataSource;
  incomplete: boolean;
  warnings: string[];
  truncated: boolean;
  checkId: string | null;
  demo: boolean;
}

export interface ExpansionResult {
  center: string;
  nodes: GraphNodeDto[];
  edges: GraphEdgeDto[];
  actions: WalletAction[];
  source: DataSource;
  incomplete: boolean;
  warnings: string[];
  truncated: boolean;
}
