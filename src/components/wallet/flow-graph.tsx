'use client';

import '@xyflow/react/dist/style.css';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { cn } from '@/lib/utils';
import { apiPost, ApiError } from '@/lib/client/api';
import { errorMessage, LABEL_TYPE_LABELS } from '@/lib/i18n';
import { Alert, Badge, Button, Spinner } from '@/components/ui';
import { CopyButton } from '@/components/copy-button';
import { tonscanUrl, tonviewerUrl } from '@/lib/explorers';
import type { AnalysisResult, ExpansionResult, GraphEdgeDto, GraphNodeDto } from '@/server/analysis/types';

const HARD_MAX_NODES = 150;
const HARD_MAX_EDGES = 300;
const HARD_MAX_DEPTH = 3;

interface WalletNodeData extends Record<string, unknown> {
  dto: GraphNodeDto;
  depth: number;
}

function kindClass(kind: string, isCenter: boolean): string {
  if (isCenter) return 'border-2 border-foreground bg-foreground text-background';
  switch (kind) {
    case 'own':
      return 'border-2 border-foreground';
    case 'safe':
      return 'border border-foreground';
    case 'suspicious':
      return 'border-2 border-dashed border-foreground';
    case 'service':
      return 'border border-dotted border-foreground';
    case 'exchange':
      return 'border-4 border-double border-foreground';
    case 'marketplace':
      return 'border-2 border-foreground';
    default:
      return 'border border-border';
  }
}

const KIND_TEXT: Record<string, string> = {
  explored: 'проверяемый',
  own: 'мой',
  safe: 'безопасный',
  suspicious: 'подозрительный',
  service: 'сервис',
  exchange: 'биржа',
  marketplace: 'маркетплейс',
  unknown: 'неизвестный',
};

function WalletNode({ data }: NodeProps) {
  const { dto } = data as WalletNodeData;
  return (
    <div className={cn('min-w-[120px] rounded px-2 py-1 text-center text-xs', kindClass(dto.kind, dto.isCenter))}>
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-0 !bg-foreground" />
      <div className="font-mono">{dto.short}</div>
      <div className="text-[10px] opacity-70">{KIND_TEXT[dto.kind] ?? dto.kind}</div>
      {dto.labels[0] ? (
        <div className="text-[10px] opacity-80">{LABEL_TYPE_LABELS[dto.labels[0].labelType] ?? ''}</div>
      ) : null}
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-0 !bg-foreground" />
    </div>
  );
}

const nodeTypes = { wallet: WalletNode };

function positionFor(index: number, total: number, radius: number, cx: number, cy: number) {
  if (total <= 1) return { x: cx, y: cy };
  const angle = (index / total) * Math.PI * 2;
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function toFlowNode(dto: GraphNodeDto, depth: number, position: { x: number; y: number }): Node<WalletNodeData> {
  return { id: dto.address, type: 'wallet', position, data: { dto, depth } };
}

function toFlowEdge(dto: GraphEdgeDto): Edge {
  const allFailed = dto.hasFailed && !dto.hasSuccess;
  return {
    id: dto.id,
    source: dto.from,
    target: dto.to,
    label: dto.label,
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: {
      stroke: 'hsl(var(--foreground))',
      strokeWidth: Math.min(4, 1 + Math.log2(dto.count + 1)),
      strokeDasharray: allFailed ? '6 4' : undefined,
    },
    labelStyle: { fontSize: 10 },
    labelBgStyle: { fill: 'hsl(var(--background))' },
  };
}

function initialGraph(result: AnalysisResult): { nodes: Node<WalletNodeData>[]; edges: Edge[] } {
  const others = result.nodes.filter((n) => !n.isCenter);
  const nodes = result.nodes.map((dto) => {
    if (dto.isCenter) return toFlowNode(dto, 0, { x: 0, y: 0 });
    const index = others.indexOf(dto);
    return toFlowNode(dto, 1, positionFor(index, others.length, 300, 0, 0));
  });
  return { nodes, edges: result.edges.map(toFlowEdge) };
}

export function FlowGraph({ result, depth }: { result: AnalysisResult; depth: number }) {
  const seed = useMemo(() => initialGraph(result), [result]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WalletNodeData>>(seed.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(seed.edges);
  const [selectedId, setSelectedId] = useState<string | null>(result.address?.raw ?? null);
  const [visited, setVisited] = useState<Set<string>>(new Set(result.address ? [result.address.raw] : []));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(result.truncated ? 'Схема усечена по лимиту узлов/рёбер.' : null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfRef = useRef<ReactFlowInstance<Node<WalletNodeData>, Edge> | null>(null);

  const maxDepth = Math.min(depth, HARD_MAX_DEPTH);
  const selected = nodes.find((n) => n.id === selectedId)?.data.dto ?? null;
  const selectedDepth = nodes.find((n) => n.id === selectedId)?.data.depth ?? 0;

  const merge = useCallback(
    (expansion: ExpansionResult, parentId: string, parentDepth: number) => {
      setNodes((prev) => {
        const existing = new Map(prev.map((n) => [n.id, n]));
        const parent = existing.get(parentId);
        const cx = parent?.position.x ?? 0;
        const cy = parent?.position.y ?? 0;
        const fresh = expansion.nodes.filter((n) => !existing.has(n.address) && !n.isCenter);
        let added = 0;
        for (const dto of fresh) {
          if (existing.size >= HARD_MAX_NODES) {
            setNotice(`Достигнут предел узлов (${HARD_MAX_NODES}).`);
            break;
          }
          const pos = positionFor(added, Math.max(fresh.length, 1), 180, cx + 120, cy + 120);
          existing.set(dto.address, toFlowNode(dto, parentDepth + 1, pos));
          added += 1;
        }
        return [...existing.values()];
      });
      setEdges((prev) => {
        const ids = new Set(prev.map((e) => e.id));
        const next = [...prev];
        for (const dto of expansion.edges) {
          if (ids.has(dto.id)) continue;
          if (next.length >= HARD_MAX_EDGES) {
            setNotice(`Достигнут предел рёбер (${HARD_MAX_EDGES}).`);
            break;
          }
          next.push(toFlowEdge(dto));
          ids.add(dto.id);
        }
        return next;
      });
    },
    [setNodes, setEdges],
  );

  async function expand(rawAddress: string, nodeDepth: number) {
    if (visited.has(rawAddress)) {
      setNotice('Этот адрес уже раскрыт.');
      return;
    }
    if (nodeDepth >= maxDepth) {
      setNotice(`Достигнут предел глубины (${maxDepth}).`);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const expansion = await apiPost<ExpansionResult>('/api/expand', { address: rawAddress, limit: 25 });
      merge(expansion, rawAddress, nodeDepth);
      setVisited((prev) => new Set(prev).add(rawAddress));
      if (expansion.warnings.length > 0) setNotice(expansion.warnings.join(' '));
    } catch (err) {
      setNotice(errorMessage(err instanceof ApiError ? err.code : 'error'));
    } finally {
      setBusy(false);
    }
  }

  async function exportImage(kind: 'png' | 'svg' | 'square') {
    const el = wrapperRef.current;
    if (!el) return;
    rfRef.current?.fitView({ padding: 0.2 });
    await new Promise((r) => setTimeout(r, 250));
    const options =
      kind === 'square'
        ? { backgroundColor: '#ffffff', width: 2048, height: 2048, canvasWidth: 2048, canvasHeight: 2048 }
        : { backgroundColor: '#ffffff', pixelRatio: 2 };
    const dataUrl = kind === 'svg' ? await toSvg(el, { backgroundColor: '#ffffff' }) : await toPng(el, options);
    const link = document.createElement('a');
    link.download = `ton-flow.${kind === 'svg' ? 'svg' : 'png'}`;
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => exportImage('png')}>
          Экспорт PNG
        </Button>
        <Button variant="secondary" onClick={() => exportImage('svg')}>
          Экспорт SVG
        </Button>
        <Button variant="secondary" onClick={() => exportImage('square')}>
          Квадрат 2048×2048
        </Button>
        <span className="text-xs text-muted-foreground">
          Узлов: {nodes.length}/{HARD_MAX_NODES} · Рёбер: {edges.length}/{HARD_MAX_EDGES}
        </span>
        {busy ? <Spinner /> : null}
      </div>

      {notice ? <Alert>{notice}</Alert> : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div ref={wrapperRef} className="h-[560px] rounded border border-border">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onInit={(instance) => {
              rfRef.current = instance;
              instance.fitView({ padding: 0.2 });
            }}
            fitView
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
          >
            <Background gap={16} />
            <Controls />
          </ReactFlow>
        </div>

        <aside className="flex flex-col gap-2 rounded border border-border p-3 text-sm">
          {selected ? (
            <>
              <div className="flex items-center justify-between">
                <Badge>{KIND_TEXT[selected.kind] ?? selected.kind}</Badge>
                <CopyButton value={selected.bounceable} />
              </div>
              <p className="break-address font-mono text-xs">{selected.bounceable}</p>
              <div className="text-xs text-muted-foreground">
                Входящих: {selected.incoming} · Исходящих: {selected.outgoing}
              </div>
              {selected.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selected.labels.map((label, index) => (
                    <Badge key={index}>
                      {LABEL_TYPE_LABELS[label.labelType] ?? label.labelType}: {label.title}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                <Button
                  onClick={() => expand(selected.address, selectedDepth)}
                  disabled={busy || selected.isCenter || visited.has(selected.address) || selectedDepth >= maxDepth}
                >
                  Раскрыть адрес
                </Button>
                <a href={tonviewerUrl(selected.bounceable)} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                  TON Viewer ↗
                </a>
                <a href={tonscanUrl(selected.bounceable)} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground">
                  Tonscan ↗
                </a>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Выберите узел, чтобы увидеть детали.</p>
          )}
          <p className="mt-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
            Стрелки направлены к получателю. Пунктир — неуспешные операции. Форма рамки кодирует тип
            метки, не только цвет.
          </p>
        </aside>
      </div>
    </div>
  );
}
