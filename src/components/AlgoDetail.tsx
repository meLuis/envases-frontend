"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { cardBySlug, type AlgoCard } from "@/data/catalog";
import { RUNNERS } from "@/lib/runners";
import type { QueryResponse } from "@/lib/types";
import type { AnimTrace } from "@/lib/algorithms";
import { nodeType, shortLabel, NODE_TYPE_COLOR as TYPE_COLOR } from "@/lib/graphData";
import { InputForm } from "./InputForm";
import { ResultView } from "./ResultView";
import { MethodPanel, ComplexityPair } from "./MethodPanel";
import { AlgoVisualizer } from "./AlgoVisualizer";
import { ComplexityChart } from "./ComplexityChart";
import { KnapsackViz } from "./KnapsackViz";
import { BellmanFordViz } from "./BellmanFordViz";
import { UnionFindViz } from "./UnionFindViz";

interface NarratorInfo {
  revealed: number;
  total: number;
  currentLabel?: string;
  currentNodeType?: string;
  side?: "a" | "b";
}

function defaults(card: AlgoCard): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of card.inputs) if (f.default != null) out[f.name] = f.default;
  return out;
}

export function AlgoDetail({ datasetId, slug }: { datasetId: string; slug: string }) {
  const card = cardBySlug(slug);
  const [values, setValues] = useState<Record<string, string>>({});
  const [ranValues, setRanValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(true);
  const [narratorInfo, setNarratorInfo] = useState<NarratorInfo | null>(null);
  const [runId, setRunId] = useState(0);

  const handleReveal = useCallback(
    (
      revealed: number,
      total: number,
      currentNode: string | undefined,
      trace: AnimTrace,
      labels: Map<string, string>,
    ) => {
      setNarratorInfo({
        revealed,
        total,
        currentLabel: currentNode ? shortLabel(currentNode, labels) : undefined,
        currentNodeType: currentNode ? nodeType(currentNode) : undefined,
        side: currentNode ? trace.side[currentNode] : undefined,
      });
    },
    [],
  );

  if (!card) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-muted">Algoritmo no encontrado.</p>
        <Link href={`/dataset/${datasetId}`} className="text-accent underline">
          ← volver a los algoritmos
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
      setRunId((n) => n + 1);
      setFormOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al ejecutar");
    } finally {
      setBusy(false);
    }
  }

  const kind = card.animation;
  const ready = result?.ok;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5">
      {/* Cabecera */}
      <Link href={`/dataset/${datasetId}`} className="text-sm text-muted hover:text-foreground">
        ← Algoritmos
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">
            <span className="text-accent">◆</span> {card.businessQuestion}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-muted">
              {card.investigated.name}
            </span>
            <ComplexityPair time={card.investigated.time} space={card.investigated.space} />
          </div>
        </div>

        <button
          onClick={() => setFormOpen((o) => !o)}
          className="shrink-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:text-foreground"
        >
          ⚙ Parámetros {formOpen ? "▴" : "▾"}
        </button>
      </div>

      {/* Parámetros */}
      {formOpen && (
        <section className="mt-3 rounded-xl border border-border bg-surface p-4">
          <InputForm
            fields={card.inputs}
            values={values}
            onChange={(name, value) => setValues((prev) => ({ ...prev, [name]: value }))}
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={run}
              disabled={busy}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-[#0b1020] disabled:opacity-40 hover:brightness-110 transition"
            >
              {busy ? "Ejecutando…" : "Ejecutar paso a paso →"}
            </button>
            {error && <p className="text-sm text-danger">{error}</p>}
          </div>
        </section>
      )}

      {/* Visual paso a paso */}
      <section className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-medium text-muted mono">PASO A PASO</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {!ready ? (
          <Placeholder busy={busy} />
        ) : kind === "traversal" ? (
          <div className="flex gap-4 items-stretch">
            <div className="flex-1 min-w-0">
              <AlgoVisualizer
                datasetId={datasetId}
                slug={card.slug}
                values={ranValues}
                result={result!}
                height="72vh"
                onReveal={handleReveal}
              />
            </div>
            <aside className="hidden lg:block w-64 shrink-0">
              {narratorInfo ? (
                <NarratorRail info={narratorInfo} />
              ) : (
                <div className="h-full rounded-xl border border-border bg-surface" />
              )}
            </aside>
          </div>
        ) : kind === "knapsack" ? (
          <KnapsackViz key={runId} result={result!} budget={Number(ranValues.budget) || 0} height="72vh" />
        ) : kind === "bellman" ? (
          <BellmanFordViz key={runId} result={result!} height="72vh" />
        ) : (
          <UnionFindViz
            key={runId}
            datasetId={datasetId}
            productId={ranValues.productId ?? ""}
            result={result!}
            height="72vh"
          />
        )}
      </section>

      {/* Complejidad: elegido vs ingenuo + curva */}
      {card.baseline ? (
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <MethodPanel card={card} />
          <ComplexityChart
            investigated={{ label: card.investigated.name, time: card.investigated.time }}
            baseline={{ label: card.baseline.name, time: card.baseline.time }}
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

function Placeholder({ busy }: { busy: boolean }) {
  return (
    <div
      className="rounded-xl border border-border bg-[#0b1020] flex flex-col items-center justify-center gap-3 text-muted"
      style={{ height: "72vh" }}
    >
      <span className="text-4xl opacity-20">◆</span>
      <p className="text-sm">
        {busy ? "Ejecutando…" : "Abre ⚙ Parámetros y ejecuta para ver el paso a paso"}
      </p>
    </div>
  );
}

function NarratorRail({ info }: { info: NarratorInfo }) {
  return (
    <div className="h-full rounded-xl border border-border bg-surface p-4 flex flex-col gap-4">
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

      {info.currentLabel && (
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
              {info.side === "a" ? "▷ desde el origen" : "◁ desde el destino"}
            </p>
          )}
        </div>
      )}

      <p className="mt-auto text-[11px] text-muted/70 leading-relaxed">
        El algoritmo visita los nodos uno a uno; sigue el recorrido sobre el grafo.
      </p>
    </div>
  );
}
