"use client";

import { useState } from "react";
import Link from "next/link";
import { cardBySlug, GRAPH_LABELS, type AlgoCard } from "@/data/catalog";
import { RUNNERS } from "@/lib/runners";
import type { QueryResponse } from "@/lib/types";
import { InputForm } from "./InputForm";
import { ResultView } from "./ResultView";
import { MethodPanel } from "./MethodPanel";
import { AlgoVisualizer } from "./AlgoVisualizer";
import { ComplexityChart } from "./ComplexityChart";

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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al ejecutar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Link
        href={`/dataset/${datasetId}`}
        className="text-sm text-muted hover:text-foreground"
      >
        ← Galería
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{card.title}</h1>
          <p className="mt-1 text-muted">{card.businessQuestion}</p>
        </div>
        <span className="text-xs mono text-muted border border-border rounded-lg px-3 py-1.5">
          {GRAPH_LABELS[card.graph]}
        </span>
      </div>

      {/* Antes vs Ahora + Big-O */}
      <section className="mt-6">
        <MethodPanel card={card} />
      </section>

      {/* Curvas de complejidad (cuando hay baseline) */}
      {card.baseline && (
        <section className="mt-4">
          <ComplexityChart
            investigated={{
              label: card.investigated.name,
              bigO: card.investigated.bigO,
            }}
            baseline={{ label: card.baseline.name, bigO: card.baseline.bigO }}
          />
        </section>
      )}

      {/* Ejecutar en vivo */}
      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold text-lg">Ejecutar en vivo</h2>
        <p className="text-sm text-muted">
          El cálculo lo realiza el backend sobre los datos reales del dataset.
        </p>
        <div className="mt-4">
          <InputForm
            fields={card.inputs}
            values={values}
            onChange={(name, value) =>
              setValues((prev) => ({ ...prev, [name]: value }))
            }
          />
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="mt-4 rounded-lg bg-accent px-5 py-2.5 font-semibold text-[#0b1020] disabled:opacity-40 hover:brightness-110 transition"
        >
          {busy ? "Ejecutando…" : "Ejecutar →"}
        </button>
        {error && (
          <p className="mt-4 text-sm text-danger border border-danger/30 bg-danger/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </section>

      {/* Visualización animada */}
      {result && result.ok && (
        <AlgoVisualizer
          datasetId={datasetId}
          slug={card.slug}
          values={ranValues}
          result={result}
        />
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
