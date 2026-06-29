"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { cardBySlug, GRAPH_LABELS, type AlgoCard } from "@/data/catalog";
import { RUNNERS } from "@/lib/runners";
import type { QueryResponse } from "@/lib/types";
import type { AnimTrace } from "@/lib/algorithms";
import { nodeType, shortLabel, NODE_TYPE_COLOR as TYPE_COLOR } from "@/lib/graphData";
import { InputForm } from "./InputForm";
import { ResultView } from "./ResultView";
import { MethodPanel } from "./MethodPanel";
import { AlgoVisualizer } from "./AlgoVisualizer";
import { ComplexityChart } from "./ComplexityChart";

interface NarratorInfo {
  revealed: number;
  total: number;
  expanded: number;
  baselineExpanded?: number;
  currentNode?: string;
  currentLabel?: string;
  currentNodeType?: string;
  side?: "a" | "b";
  ratio?: number;
}

function defaults(card: AlgoCard): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of card.inputs) if (f.default != null) out[f.name] = f.default;
  return out;
}

export function AlgoDetail({
  datasetId,
  slug,
}: {
  datasetId: string;
  slug: string;
}) {
  const card = cardBySlug(slug);
  const [values, setValues] = useState<Record<string, string>>({});
  const [ranValues, setRanValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(true);
  const [narratorInfo, setNarratorInfo] = useState<NarratorInfo | null>(null);

  const handleReveal = useCallback(
    (
      revealed: number,
      total: number,
      currentNode: string | undefined,
      trace: AnimTrace,
      labels: Map<string, string>,
    ) => {
      const currentLabel = currentNode ? shortLabel(currentNode, labels) : undefined;
      const currentNodeType = currentNode ? nodeType(currentNode) : undefined;
      const side = currentNode ? trace.side[currentNode] : undefined;
      const ratio =
        trace.baselineExpanded && trace.expanded > 0
          ? trace.baselineExpanded / trace.expanded
          : undefined;
      setNarratorInfo({
        revealed,
        total,
        expanded: trace.expanded,
        baselineExpanded: trace.baselineExpanded,
        currentNode,
        currentLabel,
        currentNodeType,
        side,
        ratio,
      });
    },
    [],
  );

  if (!card) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-muted">Algoritmo no encontrado.</p>
        <Link href={`/dataset/${datasetId}`} className="text-accent underline">
          ← volver a la galería
        </Link>
      </div>
    );
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const merged = { ...defaults(card!), ...values };
      const res = await RUNNERS[card!.slug](datasetId, merged);
      setRanValues(merged);
      setResult(res);
      setFormOpen(false); // colapsa parámetros al obtener resultado
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al ejecutar");
    } finally {
      setBusy(false);
    }
  }

  const animatable = card.animation === "traversal";

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5">
      {/* Fila superior: volver + badge de grafo */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dataset/${datasetId}`}
          className="text-sm text-muted hover:text-foreground"
        >
          ← Galería
        </Link>
        <span className="ml-auto text-xs mono text-muted border border-border rounded px-2 py-1">
          grafo: {GRAPH_LABELS[card.graph]}
        </span>
      </div>

      {/* Titular CS-first: algoritmo + Big-O. Negocio = subtítulo. */}
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">
              <span className="text-accent">◆</span> {card.investigated.name}
            </h1>
            <span className="mono text-sm font-bold text-accent-2 border border-accent-2/40 bg-accent-2/10 rounded-lg px-3 py-1">
              {card.investigated.bigO}
            </span>
          </div>
          <p className="mt-1.5 text-muted">
            <span className="text-muted/60">Ejemplo:</span> {card.businessQuestion}
          </p>
        </div>

        {/* Toggle de parámetros */}
        <button
          onClick={() => setFormOpen((o) => !o)}
          className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:text-foreground"
        >
          ⚙ Parámetros {formOpen ? "▴" : "▾"}
        </button>
      </div>

      {/* Parámetros (acordeón inline, no columna) */}
      {formOpen && (
        <section className="mt-3 rounded-xl border border-border bg-surface p-4">
          <InputForm
            fields={card.inputs}
            values={values}
            onChange={(name, value) =>
              setValues((prev) => ({ ...prev, [name]: value }))
            }
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={run}
              disabled={busy}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-[#0b1020] disabled:opacity-40 hover:brightness-110 transition"
            >
              {busy ? "Ejecutando…" : "Ejecutar →"}
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </section>
      )}

      {/* GRAFO protagonista (a la izquierda) + narrador en riel derecho */}
      <section className="mt-4">
        {animatable ? (
          result?.ok ? (
            <div className="flex gap-4 items-stretch">
              <div className="flex-1 min-w-0">
                <AlgoVisualizer
                  datasetId={datasetId}
                  slug={card.slug}
                  values={ranValues}
                  result={result}
                  height="76vh"
                  onReveal={handleReveal}
                />
              </div>
              <aside className="hidden lg:block w-72 shrink-0">
                {narratorInfo ? (
                  <NarratorRail info={narratorInfo} />
                ) : (
                  <div className="h-full rounded-xl border border-border bg-surface" />
                )}
              </aside>
            </div>
          ) : (
            <div
              className="rounded-xl border border-border bg-[#0b1020] flex flex-col items-center justify-center gap-3 text-muted"
              style={{ height: "76vh" }}
            >
              <span className="text-4xl opacity-20">◆</span>
              <p className="text-sm">
                {busy
                  ? "Ejecutando…"
                  : "Abre ⚙ Parámetros y ejecuta para ver el grafo animado"}
              </p>
            </div>
          )
        ) : (
          <div className="rounded-xl border border-border bg-surface p-8 text-center">
            <span className="text-3xl opacity-30">◆</span>
            <h3 className="mt-2 font-semibold">Algoritmo estructural</h3>
            <p className="mx-auto mt-1 max-w-xl text-sm text-muted">
              {card.investigated.name} no recorre el grafo paso a paso: calcula
              una propiedad global. Su resultado se ve abajo en la tabla, y la
              estructura de {GRAPH_LABELS[card.graph]} se explora en la pestaña
              «El grafo».
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm">
              {card.investigated.idea}
            </p>
          </div>
        )}
      </section>

      {/* Comparación: método + curva Big-O (ancho completo, sin bug de recharts) */}
      {card.baseline ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <MethodPanel card={card} />
          <ComplexityChart
            investigated={{ label: card.investigated.name, bigO: card.investigated.bigO }}
            baseline={{ label: card.baseline.name, bigO: card.baseline.bigO }}
          />
        </section>
      ) : (
        <section className="mt-6">
          <MethodPanel card={card} />
        </section>
      )}

      {/* Resultado */}
      {result && (
        <section className="mt-6">
          <h2 className="font-semibold text-lg mb-3">Resultado</h2>
          <ResultView result={result} />
        </section>
      )}
    </div>
  );
}

function NarratorRail({ info }: { info: NarratorInfo }) {
  return (
    <div className="h-full rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
      {/* Paso + progreso */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] mono text-muted">PASO</span>
          <span className="mono font-bold text-sm">
            {info.revealed}/{info.total}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(info.revealed / Math.max(info.total, 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Nodo actual */}
      {info.currentNode && (
        <div className="rounded-lg border border-border bg-[#0b1020] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: TYPE_COLOR[info.currentNodeType || "OTHER"] }}
            />
            <span
              className="text-[11px] mono font-bold"
              style={{ color: TYPE_COLOR[info.currentNodeType || "OTHER"] }}
            >
              {info.currentNodeType}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium break-words">{info.currentLabel}</p>
          {info.side && (
            <p className="mt-1 text-[11px] text-muted">
              {info.side === "a" ? "▷ explorando desde el origen" : "◁ explorando desde el destino"}
            </p>
          )}
        </div>
      )}

      {/* Métricas: investigado vs baseline */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-[#0b1020] px-3 py-2">
          <div className="mono font-bold text-accent-2 text-lg">{info.expanded}</div>
          <div className="text-[11px] text-muted">expansiones</div>
        </div>
        {info.baselineExpanded != null && (
          <div className="rounded-lg border border-border bg-[#0b1020] px-3 py-2">
            <div className="mono font-bold text-warn text-lg">{info.baselineExpanded}</div>
            <div className="text-[11px] text-muted">baseline</div>
          </div>
        )}
      </div>

      {info.ratio != null && (
        <div className="rounded-lg border border-accent-2/30 bg-accent-2/10 px-3 py-2 text-center">
          <span className="text-accent-2 font-bold mono">
            {info.ratio.toFixed(2)}× más eficiente
          </span>
        </div>
      )}

      <p className="mt-auto text-[11px] text-muted/70 leading-relaxed">
        El algoritmo investigado expande menos nodos que el baseline para llegar al
        mismo resultado: esa es la ventaja de complejidad, en vivo.
      </p>
    </div>
  );
}
