"use client";

import { useEffect, useMemo, useState } from "react";
import { artifactUrl, fetchArtifactText } from "@/lib/apiClient";
import { buildSubgraph, revealTrace, type AnimTrace } from "@/lib/algorithms";
import {
  GRAPH_ARTIFACTS,
  loadGraph,
  nodeType,
  NODE_TYPE_COLOR,
  type LoadedGraph,
} from "@/lib/graphData";
import { parseCSV } from "@/lib/csv";
import type { GraphSummary } from "@/lib/types";
import { GraphCanvas } from "./GraphCanvas";

type GraphKey = "G_attr" | "G_sales" | "G_purchases" | "G_business";

interface GraphConfig {
  key: GraphKey;
  title: string;
  purpose: string;
  nodesMeaning: string;
  edgesMeaning: string;
  weightMeaning: string;
  preferredSeedPrefixes: string[];
  depth: number;
  staticImage?: string;
}

const GRAPH_CONFIGS: GraphConfig[] = [
  {
    key: "G_attr",
    title: "G_attr · atributos de producto",
    purpose: "Mapa semántico del catálogo: conecta cada producto con tipo, subtipo, material, color, capacidad y boca.",
    nodesMeaning: "PRODUCT y capas de atributos como TYPE, MATERIAL, COLOR, CAPACITY.",
    edgesMeaning: "PRODUCT → atributo extraído desde la descripción del producto.",
    weightMeaning: "Confianza del atributo extraído por reglas de dominio.",
    preferredSeedPrefixes: ["TYPE:", "MATERIAL:", "COLOR:", "CAPACITY:"],
    depth: 1,
    staticImage: "g_attr_attribute_projection.png",
  },
  {
    key: "G_sales",
    title: "G_sales · ventas",
    purpose: "Mapa de ventas reales: permite ver qué clientes, documentos y productos aparecen conectados.",
    nodesMeaning: "CLIENT, DOCUMENT y PRODUCT.",
    edgesMeaning: "Relaciones observadas en comprobantes de venta.",
    weightMeaning: "Monto, cantidad o frecuencia disponible en el CSV de aristas.",
    preferredSeedPrefixes: ["CLIENT:", "SALE_DOC:", "PRODUCT:"],
    depth: 2,
  },
  {
    key: "G_purchases",
    title: "G_purchases · compras",
    purpose: "Mapa de abastecimiento: conecta proveedores, documentos de compra y productos.",
    nodesMeaning: "SUPPLIER, DOCUMENT y PRODUCT.",
    edgesMeaning: "Relaciones observadas en comprobantes de compra.",
    weightMeaning: "Monto, cantidad o frecuencia disponible en el CSV de aristas.",
    preferredSeedPrefixes: ["SUPPLIER:", "PURCHASE_DOC:", "PRODUCT:"],
    depth: 2,
  },
  {
    key: "G_business",
    title: "G_business · negocio combinado",
    purpose: "Mapa integrado para rutas de negocio: ayuda a explicar conexiones cliente → producto → proveedor.",
    nodesMeaning: "CLIENT, SUPPLIER, DOCUMENT y PRODUCT.",
    edgesMeaning: "Relaciones combinadas de ventas y compras normalizadas.",
    weightMeaning: "Peso comercial disponible según la relación generada.",
    preferredSeedPrefixes: ["CLIENT:", "PRODUCT:", "SUPPLIER:"],
    depth: 2,
  },
];

const GRAPH_BY_KEY = Object.fromEntries(GRAPH_CONFIGS.map((g) => [g.key, g])) as Record<GraphKey, GraphConfig>;
const PREVIEW_LIMIT = 80;

interface GraphTables {
  nodes: Record<string, string>[];
  edges: Record<string, string>[];
}

interface PreviewData {
  nodes: string[];
  edges: [string, string][];
  labels: Map<string, string>;
  trace: AnimTrace;
}

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
  const [tables, setTables] = useState<GraphTables | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const config = GRAPH_BY_KEY[selected];
  const artifacts = GRAPH_ARTIFACTS[selected];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setTables(null);
      setPreview(null);
      try {
        const [nodesText, edgesText, loadedGraph] = await Promise.all([
          fetchArtifactText(datasetId, artifacts.nodes),
          fetchArtifactText(datasetId, artifacts.edges),
          loadGraph(datasetId, selected),
        ]);
        if (cancelled) return;
        const nextTables = { nodes: parseCSV(nodesText), edges: parseCSV(edgesText) };
        setTables(nextTables);
        setPreview(buildStaticPreview(loadedGraph, config));
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "No se pudo cargar el grafo");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [artifacts.edges, artifacts.nodes, config, datasetId, selected]);

  const nodeTypeCounts = useMemo(
    () => countBy(tables?.nodes ?? [], (row) => row.node_type || nodeType(row.node_id || "")),
    [tables],
  );
  const edgeTypeCounts = useMemo(
    () => countBy(tables?.edges ?? [], (row) => row.edge_type || row.relation || "EDGE"),
    [tables],
  );

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

  const graphSummary = graph.by_graph[selected];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold">El grafo: el mapa del dataset</h2>
        <p className="mt-1 text-sm text-muted max-w-3xl">
          Esta pestaña muestra los grafos que ya fueron construidos al subir los CSV.
          Aquí no se ejecutan algoritmos: la Galería usa estos mapas para hacer BFS,
          Dijkstra, Bellman-Ford y los demás recorridos.
        </p>
      </header>

      <section>
        <h3 className="text-sm font-medium text-muted mono mb-3">GRAFOS PRINCIPALES</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {GRAPH_CONFIGS.map((item) => {
            const counts = graph.by_graph[item.key];
            const active = item.key === selected;
            return (
              <button
                key={item.key}
                onClick={() => setSelected(item.key)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:border-accent/50"
                }`}
              >
                <div className="font-semibold mono text-accent">{item.key}</div>
                <p className="mt-1 min-h-10 text-xs text-muted">{item.purpose}</p>
                <div className="mt-3 flex gap-4 text-sm">
                  <Metric value={counts?.nodes ?? 0} label="nodos" />
                  <Metric value={counts?.edges ?? 0} label="aristas" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">{config.title}</h3>
            <p className="mt-1 text-sm text-muted">{config.purpose}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoBox label="Nodos" value={graphSummary?.nodes ?? tables?.nodes.length ?? 0} />
            <InfoBox label="Aristas" value={graphSummary?.edges ?? tables?.edges.length ?? 0} />
            <InfoBox label="Artefactos" value="CSV" />
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h4 className="text-sm font-semibold">Cómo leer este grafo</h4>
            <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
              <ReadItem title="Nodos" body={config.nodesMeaning} />
              <ReadItem title="Aristas" body={config.edgesMeaning} />
              <ReadItem title="Peso" body={config.weightMeaning} />
            </dl>
          </div>

          <Breakdown title="Tipos de nodo" counts={nodeTypeCounts} colorized />
          <Breakdown title="Tipos de arista" counts={edgeTypeCounts} />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted mono">VISTA VISUAL</h3>
          {selected === "G_attr" && config.staticImage ? (
            <GraphImage
              datasetId={datasetId}
              imageName={config.staticImage}
              fallback={preview}
            />
          ) : loading ? (
            <PreviewSkeleton />
          ) : preview ? (
            <GraphCanvas
              nodes={preview.nodes}
              edges={preview.edges}
              labels={preview.labels}
              trace={preview.trace}
              height="430px"
              staticView
            />
          ) : (
            <EmptyPreview message={loadError ?? "No hay vista disponible para este grafo."} />
          )}
          <p className="text-xs text-muted">
            El canvas es una muestra para lectura visual. El grafo completo se revisa en las tablas y CSV.
          </p>
        </div>
      </section>

      {loadError && (
        <p className="text-sm text-danger border border-danger/30 bg-danger/10 rounded-lg px-3 py-2">
          {loadError}
        </p>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-muted mono">NODOS Y ARISTAS</h3>
            <p className="mt-1 text-xs text-muted">
              Busca una etiqueta, id, tipo o peso. Las descargas contienen el CSV completo.
            </p>
          </div>
          <label className="block min-w-64">
            <span className="text-[11px] text-muted">Buscar en tablas</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="FRASCO, CLIENT, AMBAR, 100ML…"
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <CsvPreviewTable
            title="Nodos"
            rows={tables?.nodes ?? []}
            query={query}
            downloadHref={artifactUrl(datasetId, artifacts.nodes)}
            loading={loading}
          />
          <CsvPreviewTable
            title="Aristas"
            rows={tables?.edges ?? []}
            query={query}
            downloadHref={artifactUrl(datasetId, artifacts.edges)}
            loading={loading}
          />
        </div>
      </section>
    </div>
  );
}

function buildStaticPreview(graph: LoadedGraph, config: GraphConfig): PreviewData | null {
  const seed = chooseSeed(graph, config);
  if (!seed) return null;
  const trace = revealTrace(graph, [seed], config.depth);
  const sub = buildSubgraph(graph, trace.steps, [], 55, 130);
  return {
    ...sub,
    labels: graph.labels,
    trace: {
      steps: sub.nodes,
      side: Object.fromEntries(sub.nodes.map((node) => [node, "a"] as const)),
      level: Object.fromEntries(sub.nodes.map((node) => [node, 0])),
      path: [],
      expanded: sub.nodes.length,
    },
  };
}

function chooseSeed(graph: LoadedGraph, config: GraphConfig): string | null {
  const nodes = [...graph.adj.keys()];
  for (const prefix of config.preferredSeedPrefixes) {
    const candidates = nodes
      .filter((id) => id.startsWith(prefix))
      .sort((a, b) => (graph.adj.get(b)?.length ?? 0) - (graph.adj.get(a)?.length ?? 0));
    const moderate = candidates.find((id) => {
      const degree = graph.adj.get(id)?.length ?? 0;
      return degree >= 3 && degree <= 30;
    });
    if (moderate) return moderate;
    if (candidates[0]) return candidates[0];
  }
  return nodes.sort((a, b) => (graph.adj.get(b)?.length ?? 0) - (graph.adj.get(a)?.length ?? 0))[0] ?? null;
}

function GraphImage({
  datasetId,
  imageName,
  fallback,
}: {
  datasetId: string;
  imageName: string;
  fallback: PreviewData | null;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return fallback ? (
      <GraphCanvas
        nodes={fallback.nodes}
        edges={fallback.edges}
        labels={fallback.labels}
        trace={fallback.trace}
        height="430px"
        staticView
      />
    ) : (
      <EmptyPreview message="El PNG estático no existe para este dataset." />
    );
  }
  return (
    <div className="rounded-xl border border-border bg-[#0b1020] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={artifactUrl(datasetId, imageName)}
        alt="Proyección estática de G_attr"
        onError={() => setFailed(true)}
        className="block h-[430px] w-full object-contain"
      />
      <div className="border-t border-border bg-surface px-4 py-3 text-xs text-muted">
        PNG generado por el backend. Los valores exactos están en la tabla de aristas.
      </div>
    </div>
  );
}

function CsvPreviewTable({
  title,
  rows,
  query,
  downloadHref,
  loading,
}: {
  title: string;
  rows: Record<string, string>[];
  query: string;
  downloadHref: string;
  loading: boolean;
}) {
  const filtered = useMemo(() => filterRows(rows, query), [rows, query]);
  const visible = filtered.slice(0, PREVIEW_LIMIT);
  const columns = preferredColumns(rows);

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-[11px] text-muted">
            {loading ? "Cargando…" : `${filtered.length.toLocaleString()} coincidencias · ${rows.length.toLocaleString()} filas`}
          </p>
        </div>
        <a
          href={downloadHref}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-foreground"
        >
          Descargar CSV
        </a>
      </div>
      <div className="max-h-[380px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-2 text-left text-xs text-muted">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 font-medium whitespace-nowrap">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr key={index} className="border-t border-border/70">
                {columns.map((column) => (
                  <td key={column} className="max-w-72 truncate px-3 py-2 whitespace-nowrap" title={row[column]}>
                    {row[column] || "—"}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-sm text-muted" colSpan={Math.max(columns.length, 1)}>
                  No hay filas para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > visible.length && (
        <div className="border-t border-border px-4 py-2 text-xs text-muted">
          Mostrando las primeras {visible.length}. Descarga el CSV para revisar todo.
        </div>
      )}
    </div>
  );
}

function preferredColumns(rows: Record<string, string>[]): string[] {
  const first = rows[0] ?? {};
  const all = Object.keys(first);
  const preferred = [
    "node_id",
    "node_type",
    "label",
    "ref",
    "source",
    "target",
    "edge_type",
    "weight",
    "amount",
    "quantity",
    "document_id",
  ];
  const selected = preferred.filter((column) => all.includes(column));
  return selected.length ? selected : all.slice(0, 8);
}

function filterRows(rows: Record<string, string>[], query: string): Record<string, string>[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) => Object.values(row).some((value) => value.toLowerCase().includes(q)));
}

function countBy(rows: Record<string, string>[], key: (row: Record<string, string>) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = key(row) || "OTHER";
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function Breakdown({
  title,
  counts,
  colorized,
}: {
  title: string;
  counts: Record<string, number>;
  colorized?: boolean;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {entries.slice(0, 12).map(([type, count]) => (
          <div key={type} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: colorized ? NODE_TYPE_COLOR[type] ?? NODE_TYPE_COLOR.OTHER : "#6ea8fe" }}
            />
            <span className="font-medium">{type}</span>
            <span className="ml-auto mono text-muted">{count.toLocaleString()}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-muted">Sin datos cargados.</p>}
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold">{value.toLocaleString()}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-1 text-xl font-bold mono">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function ReadItem({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-accent">{title}</dt>
      <dd className="mt-1 text-muted">{body}</dd>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="grid h-[430px] place-items-center rounded-xl border border-border bg-[#0b1020] text-sm text-muted">
      Cargando vista del grafo…
    </div>
  );
}

function EmptyPreview({ message }: { message: string }) {
  return (
    <div className="grid h-[430px] place-items-center rounded-xl border border-border bg-surface text-sm text-muted">
      {message}
    </div>
  );
}
