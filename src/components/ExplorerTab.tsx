"use client";

import { useState } from "react";
import { CATALOG, cardBySlug } from "@/data/catalog";
import { RUNNERS } from "@/lib/runners";
import type { QueryResponse } from "@/lib/types";
import { InputForm } from "./InputForm";
import { ResultView } from "./ResultView";
import { ComplexityTag } from "./MethodPanel";

export function ExplorerTab({ datasetId }: { datasetId: string }) {
  const [slug, setSlug] = useState(CATALOG[0].slug);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const card = cardBySlug(slug)!;

  function setSelected(next: string) {
    setSlug(next);
    setValues({});
    setResult(null);
    setError(null);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await RUNNERS[slug](datasetId, values);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al ejecutar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Laboratorio libre</h2>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Usa esta sección después de revisar el mapa y las preguntas guiadas.
          Aquí puedes cambiar parámetros rápidamente y comparar respuestas sin
          salir de la misma pantalla.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <label className="block">
          <span className="text-xs font-medium text-muted">Pregunta / algoritmo</span>
          <select
            value={slug}
            onChange={(e) => setSelected(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {CATALOG.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.businessQuestion}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-medium">{card.investigated.name}</span>
          <ComplexityTag value={card.investigated.bigO} tone="good" />
        </div>

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
          {busy ? "Ejecutando…" : "Ejecutar en vivo →"}
        </button>

        {error && (
          <p className="mt-4 text-sm text-danger border border-danger/30 bg-danger/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      {result && <ResultView result={result} />}
    </div>
  );
}
