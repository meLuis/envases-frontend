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

export function Workspace({ datasetId }: { datasetId: string }) {
  const [tab, setTab] = useState<Tab>("galeria");
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [graph, setGraph] = useState<GraphSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDataset(datasetId)
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
    getGraphSummary(datasetId).then(setGraph).catch(() => {});
  }, [datasetId]);

  const groups = CATALOG.reduce<Record<string, AlgoCard[]>>((acc, c) => {
    (acc[c.group] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      {/* Cabecera del dataset */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Workspace del dataset</h1>
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

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-border">
        <TabButton active={tab === "galeria"} onClick={() => setTab("galeria")}>
          Galería de algoritmos
        </TabButton>
        <TabButton active={tab === "grafo"} onClick={() => setTab("grafo")}>
          El grafo
        </TabButton>
        <TabButton active={tab === "explorador"} onClick={() => setTab("explorador")}>
          Explorador libre
        </TabButton>
      </div>

      {/* Contenido */}
      <div className="mt-6">
        {tab === "galeria" && (
          <div className="space-y-8">
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
        {tab === "grafo" && <GraphTab datasetId={datasetId} graph={graph} />}
        {tab === "explorador" && <ExplorerTab datasetId={datasetId} />}
      </div>
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
