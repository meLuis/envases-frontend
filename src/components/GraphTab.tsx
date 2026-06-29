"use client";

import { useEffect, useState } from "react";
import type { GraphSummary } from "@/lib/types";
import { loadGraph, NODE_TYPE_COLOR } from "@/lib/graphData";
import { buildSubgraph, revealTrace, type AnimTrace } from "@/lib/algorithms";
import { GraphCanvas } from "./GraphCanvas";

function MiniGraphPreview({ datasetId }: { datasetId: string }) {
  const [data, setData] = useState<{
    nodes: string[];
    edges: [string, string][];
    labels: Map<string, string>;
    trace: AnimTrace;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGraph(datasetId, "G_business")
      .then((g) => {
        if (cancelled) return;
        // Semilla: primer CLIENT con grado razonable para un ego-grafo legible.
        let seed: string | null = null;
        for (const [id, list] of g.adj) {
          if (id.startsWith("CLIENT:") && list.length >= 4 && list.length <= 12) {
            seed = id;
            break;
          }
        }
        if (!seed) seed = g.adj.keys().next().value ?? null;
        if (!seed) {
          setError("Grafo vacío.");
          return;
        }
        const trace = revealTrace(g, [seed], 2);
        const sub = buildSubgraph(g, trace.steps, [], 45, 110);
        setData({ ...sub, labels: g.labels, trace });
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  return (
    <section>
      <h3 className="text-sm font-medium text-muted mono mb-3">
        MUESTRA REAL · ego-grafo de un cliente en G_business
      </h3>
      {error && <p className="text-sm text-warn">{error}</p>}
      {!data && !error && (
        <p className="text-sm text-muted">Cargando muestra del grafo…</p>
      )}
      {data && (
        <GraphCanvas
          key={`mini:${data.nodes.length}:${data.trace.steps.length}`}
          nodes={data.nodes}
          edges={data.edges}
          labels={data.labels}
          trace={data.trace}
          height="420px"
        />
      )}
      <p className="mt-2 text-xs text-muted max-w-2xl">
        No se dibuja el grafo completo (miles de nodos serían ilegibles): se
        muestra el vecindario a 2 saltos de un cliente. Así se ve la estructura
        cliente → producto → proveedor/documento que recorren los algoritmos.
      </p>
    </section>
  );
}

// Color por tipo de nodo: fuente única compartida con el lienzo (graphData).
const NODE_TYPE_COLORS = NODE_TYPE_COLOR;

const NODE_TYPE_MEANING: Record<string, string> = {
  PRODUCT: "producto del catálogo",
  // Capas semánticas de G_attr (dimensiones del producto)
  TYPE: "tipo de envase (frasco, pote…)",
  SUBTYPE: "variante comercial (airless, espumero…)",
  ACCESSORY: "pieza incluida (tapa, brocha…)",
  SHAPE: "forma física (ovalado, cónico…)",
  FEATURE: "cualidad (estéril, graduado…)",
  MATERIAL: "material (vidrio, plástico…)",
  COLOR: "color del envase",
  CAPACITY: "capacidad (100ML, 50GR…)",
  MOUTH_SIZE: "boca/rosca (18MM, 28MM…)",
  ATTRIBUTE: "atributo (material, color…)",
  DOCUMENT: "comprobante real (factura/boleta)",
  CLIENT: "cliente que compra",
  SUPPLIER: "proveedor que abastece",
};

export function GraphTab({
  datasetId,
  graph,
  error,
}: {
  datasetId: string;
  graph: GraphSummary | null;
  error?: string | null;
}) {
  if (error) {
    return (
      <p className="text-sm text-danger border border-danger/30 bg-danger/10 rounded-lg px-3 py-2">
        No se pudo cargar la estructura del grafo: {error}
      </p>
    );
  }
  if (!graph) {
    return <p className="text-sm text-muted">Cargando estructura del grafo…</p>;
  }

  const totalNodes = graph.total_unique_nodes || 1;
  const breakdown = Object.entries(graph.node_type_breakdown).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">La estructura de datos: grafos</h2>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Todo el sistema se apoya en grafos. Los nodos son entidades del negocio
          (productos, clientes, proveedores, atributos y comprobantes) y las
          aristas son relaciones reales extraídas de los CSV. Cada algoritmo de la
          galería recorre uno de estos grafos.
        </p>
      </div>

      {/* Muestra real del grafo de negocio */}
      <MiniGraphPreview datasetId={datasetId} />

      {/* Conteo por grafo */}
      <section>
        <h3 className="text-sm font-medium text-muted mono mb-3">
          GRAFOS CONSTRUIDOS
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(graph.by_graph).map(([name, g]) => (
            <div
              key={name}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <div className="font-semibold mono text-accent">{name}</div>
              <div className="mt-2 flex gap-4 text-sm">
                <div>
                  <div className="text-xl font-bold">
                    {g.nodes.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted">nodos</div>
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {g.edges.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-muted">aristas</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Composición de nodos */}
      <section>
        <h3 className="text-sm font-medium text-muted mono mb-3">
          COMPOSICIÓN DE NODOS · {totalNodes.toLocaleString()} ÚNICOS
        </h3>
        <div className="rounded-xl border border-border bg-surface p-4">
          {/* Barra apilada */}
          <div className="flex h-4 w-full overflow-hidden rounded-full">
            {breakdown.map(([type, count]) => (
              <div
                key={type}
                title={`${type}: ${count}`}
                style={{
                  width: `${(count / totalNodes) * 100}%`,
                  background: NODE_TYPE_COLORS[type] ?? "var(--muted)",
                }}
              />
            ))}
          </div>
          {/* Leyenda con significado de negocio */}
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {breakdown.map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 text-sm">
                <span
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ background: NODE_TYPE_COLORS[type] ?? "var(--muted)" }}
                />
                <span className="font-medium">{type}</span>
                {NODE_TYPE_MEANING[type] && (
                  <span className="text-[11px] text-muted/70">
                    · {NODE_TYPE_MEANING[type]}
                  </span>
                )}
                <span className="text-muted mono ml-auto shrink-0">
                  {count.toLocaleString()} ·{" "}
                  {((count / totalNodes) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted max-w-2xl">
          Los nodos <span className="text-warn">DOCUMENT</span> representan
          comprobantes reales. Modelarlos como nodos (en vez de solo unir
          cliente↔producto) habilita el análisis de co-compra por factura y
          eleva la riqueza del grafo de negocio.
        </p>
      </section>
    </div>
  );
}
