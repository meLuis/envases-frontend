"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDataset, getGraphSummary } from "@/lib/apiClient";
import type { DatasetSummary, GraphSummary } from "@/lib/types";
import { CATALOG, GROUP_LABELS, type AlgoCard } from "@/data/catalog";
import { AlgorithmCard } from "./AlgorithmCard";
import { GraphTab } from "./GraphTab";
import { ExplorerTab } from "./ExplorerTab";

type Tab = "galeria" | "grafo" | "explorador";

const TAB_COPY: Record<Tab, { title: string; body: string }> = {
  galeria: {
    title: "2 · Preguntas que resuelven algoritmos",
    body: "Cada tarjeta empieza con una pregunta del negocio, identifica el grafo que usa y muestra qué algoritmo la responde mejor que una solución ingenua.",
  },
  grafo: {
    title: "1 · Mapa del dataset",
    body: "Antes de ejecutar algoritmos, mira cómo los CSV se convierten en nodos, aristas y pesos. Este es el mapa sobre el que se harán los recorridos.",
  },
  explorador: {
    title: "3 · Laboratorio libre",
    body: "Prueba cualquier algoritmo con tus propios parámetros cuando ya entiendes el mapa y la pregunta que quieres responder.",
  },
};

export function Workspace({ datasetId }: { datasetId: string }) {
  const [tab, setTab] = useState<Tab>("galeria");
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [graph, setGraph] = useState<GraphSummary | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDataset(datasetId)
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
    getGraphSummary(datasetId)
      .then(setGraph)
      .catch((e) =>
        setGraphError(e instanceof Error ? e.message : "No se pudo cargar la estructura del grafo"),
      );
  }, [datasetId]);

  const groups = CATALOG.reduce<Record<string, AlgoCard[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className={`mx-auto px-5 py-8 ${tab === "grafo" ? "max-w-[1500px]" : "max-w-6xl"}`}>
      {/* Cabecera del dataset */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-accent-2 mono">CLASE INTERACTIVA · DATASET → GRAFO → ALGORITMO</p>
          <h1 className="mt-1 text-2xl font-bold">Workspace del dataset</h1>
          <p className="text-sm text-muted mono">{datasetId}</p>
        </div>
        {summary && (
          <div className="flex gap-2 text-xs">
            {Object.entries(summary.row_counts).map(([k, v]) => (
              <span
                key={k}
                className="rounded-lg border border-border bg-surface px-3 py-1.5"
              >
                <span className="text-muted">{k}: </span>
                <span className="mono">{v.toLocaleString()}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-danger border border-danger/30 bg-danger/10 rounded-lg px-3 py-2">
          {error} ·{" "}
          <Link href="/upload" className="underline">
            volver a cargar
          </Link>
        </p>
      )}

      <section className="mt-6 rounded-xl border border-border bg-surface/50 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <LearningStep
            active={tab === "grafo"}
            n="1"
            title="Mapa"
            body="Los CSV se transforman en grafos."
          />
          <LearningStep
            active={tab === "galeria"}
            n="2"
            title="Pregunta"
            body="Cada problema elige un algoritmo."
          />
          <LearningStep
            active={tab === "explorador"}
            n="3"
            title="Ejecución"
            body="Ejecuta, compara y revisa resultados."
          />
        </div>
      </section>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        <TabButton active={tab === "galeria"} onClick={() => setTab("galeria")}>
          Preguntas guiadas
        </TabButton>
        <TabButton active={tab === "grafo"} onClick={() => setTab("grafo")}>
          Mapa del dataset
        </TabButton>
        <TabButton active={tab === "explorador"} onClick={() => setTab("explorador")}>
          Laboratorio libre
        </TabButton>
      </div>

      {/* Contenido */}
      <div className="mt-6">
        {tab === "galeria" && (
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold">{TAB_COPY.galeria.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted">{TAB_COPY.galeria.body}</p>
            </section>
            {Object.entries(groups).map(([group, cards]) => (
              <section key={group}>
                <h2 className="text-sm font-medium text-muted mono mb-3">
                  {GROUP_LABELS[group as AlgoCard["group"]].toUpperCase()}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cards.map((c) => (
                    <AlgorithmCard key={c.slug} card={c} datasetId={datasetId} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {tab === "grafo" && (
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold">{TAB_COPY.grafo.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted">{TAB_COPY.grafo.body}</p>
            </section>
            <GraphTab datasetId={datasetId} graph={graph} error={graphError} />
          </div>
        )}
        {tab === "explorador" && (
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold">{TAB_COPY.explorador.title}</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted">{TAB_COPY.explorador.body}</p>
            </section>
            <ExplorerTab datasetId={datasetId} />
          </div>
        )}
      </div>
    </div>
  );
}

function LearningStep({
  active,
  n,
  title,
  body,
}: {
  active: boolean;
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 transition ${
        active ? "border-accent bg-accent/10" : "border-border bg-[#0b1020]/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent mono">
          {n}
        </span>
        <span className="font-semibold">{title}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{body}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        active
          ? "border-accent text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
