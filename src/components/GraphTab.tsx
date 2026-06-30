"use client";

import { useState } from "react";
import { artifactUrl } from "@/lib/apiClient";
import type { GraphSummary } from "@/lib/types";

type GraphKey = "G_attr" | "G_sales" | "G_purchases" | "G_business";

interface GraphConfig {
  key: GraphKey;
  title: string;
  purpose: string;
  staticImage: string;
}

const GRAPH_CONFIGS: GraphConfig[] = [
  {
    key: "G_attr",
    title: "G_attr · atributos de producto",
    purpose: "Conecta cada producto con sus atributos: tipo, material, color, capacidad y boca.",
    staticImage: "g_attr_full.png",
  },
  {
    key: "G_sales",
    title: "G_sales · ventas",
    purpose: "Clientes, comprobantes y productos tal como aparecen en las ventas.",
    staticImage: "g_sales_full.png",
  },
  {
    key: "G_purchases",
    title: "G_purchases · compras",
    purpose: "Proveedores, comprobantes y productos del abastecimiento.",
    staticImage: "g_purchases_full.png",
  },
  {
    key: "G_business",
    title: "G_business · negocio combinado",
    purpose: "Mapa integrado para rutas cliente → producto → proveedor.",
    staticImage: "g_business_full.png",
  },
];

export function GraphTab({
  datasetId,
  graph,
  error,
}: {
  datasetId: string;
  graph: GraphSummary | null;
  error?: string | null;
}) {
  const [selected, setSelected] = useState<GraphKey>("G_attr");
  const config = GRAPH_CONFIGS.find((g) => g.key === selected)!;
  const counts = graph?.by_graph[selected];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">El mapa del dataset</h2>
        <p className="mt-1 text-sm text-muted max-w-3xl">
          Así se ven los grafos construidos a partir de los CSV. Es la imagen completa:
          sobre estos mapas los algoritmos hacen sus recorridos paso a paso.
        </p>
      </header>

      {error && (
        <p className="text-sm text-danger border border-danger/30 bg-danger/10 rounded-lg px-3 py-2">
          No se pudo cargar la estructura del grafo: {error}
        </p>
      )}

      {/* Selector de grafo */}
      <div className="flex flex-wrap gap-2">
        {GRAPH_CONFIGS.map((item) => {
          const active = item.key === selected;
          return (
            <button
              key={item.key}
              onClick={() => setSelected(item.key)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium mono transition ${
                active
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-surface text-muted hover:border-accent/50"
              }`}
            >
              {item.key}
            </button>
          );
        })}
      </div>

      {/* Descripción + caption */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">{config.purpose}</p>
        {counts && (
          <p className="text-xs text-muted mono">
            {counts.nodes.toLocaleString()} nodos · {counts.edges.toLocaleString()} aristas
          </p>
        )}
      </div>

      {/* PNG grande */}
      <GraphImage datasetId={datasetId} title={config.title} imageName={config.staticImage} />
    </div>
  );
}

function GraphImage({
  datasetId,
  title,
  imageName,
}: {
  datasetId: string;
  title: string;
  imageName: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="grid h-[430px] place-items-center rounded-xl border border-border bg-surface text-sm text-muted">
        La imagen no existe todavía para este dataset. Re-subirlo la regenerará.
      </div>
    );
  }
  const href = artifactUrl(datasetId, imageName);
  return (
    <div className="rounded-xl border border-border bg-[#0b1020] overflow-hidden">
      <a href={href} target="_blank" rel="noreferrer" title="Abrir imagen grande">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={href}
          alt={`Visualización completa de ${title}`}
          onError={() => setFailed(true)}
          className="block h-[min(78vh,860px)] min-h-[560px] w-full object-contain"
        />
      </a>
      <div className="flex items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 text-xs text-muted">
        <span>PNG completo generado por la API.</span>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-border px-3 py-1.5 hover:border-accent hover:text-foreground"
        >
          Ver grande
        </a>
      </div>
    </div>
  );
}
