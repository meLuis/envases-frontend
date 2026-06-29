"use client";

import { useEffect, useState } from "react";
import type { QueryResponse } from "@/lib/types";
import { isAttributeNode, loadGraph, type LoadedGraph } from "@/lib/graphData";
import {
  bidirectionalBfsTrace,
  buildSubgraph,
  dijkstraMaxTrace,
  revealTrace,
  type AnimTrace,
} from "@/lib/algorithms";
import { GraphCanvas } from "./GraphCanvas";

const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(DIACRITICS, "").trim();
}

interface Prepared {
  graphKey: string;
  trace: AnimTrace;
  nodes: string[];
  edges: [string, string][];
  labels: Map<string, string>;
}

function prepare(
  slug: string,
  result: QueryResponse,
  values: Record<string, string>,
  g: LoadedGraph,
  graphKey: string,
): Prepared | null {
  const productIds = (key: string) =>
    new Set(
      result.table
        .map((r) => r[key])
        .filter(Boolean)
        .map((v) => `PRODUCT:${String(v)}`),
    );

  if (slug === "camino-cliente-proveedor" || slug === "camino-ponderado") {
    const path = result.table
      .map((r) => String(r.node ?? ""))
      .filter(Boolean);
    if (path.length < 2) return null;
    const start = path[0];
    const goal = path[path.length - 1];
    const trace =
      slug === "camino-ponderado"
        ? dijkstraMaxTrace(g, start, goal)
        : bidirectionalBfsTrace(g, start, goal);
    const sub = buildSubgraph(g, trace.steps, trace.path);
    return { graphKey, trace, ...sub, labels: g.labels };
  }

  if (slug === "venta-cruzada" || slug === "co-ocurrencia") {
    const origin = `PRODUCT:${values.productId ?? ""}`;
    const keep = productIds("product_id");
    const trace = revealTrace(g, [origin], 2, keep);
    const sub = buildSubgraph(g, trace.steps, []);
    return { graphKey, trace, ...sub, labels: g.labels };
  }

  if (slug === "buscar-producto") {
    const terms = new Set(norm(values.q ?? "").split(/\s+/).filter(Boolean));
    if (terms.size === 0) return null;
    const seeds: string[] = [];
    for (const [id, label] of g.labels) {
      if (isAttributeNode(id) && terms.has(norm(label))) seeds.push(id);
    }
    if (seeds.length === 0) return null;
    const keep = productIds("product_id");
    const trace = revealTrace(g, seeds, 1, keep);
    const sub = buildSubgraph(g, trace.steps, []);
    return { graphKey, trace, ...sub, labels: g.labels };
  }

  return null;
}

const GRAPH_FOR: Record<string, (v: Record<string, string>) => string> = {
  "camino-cliente-proveedor": () => "G_business",
  "camino-ponderado": () => "G_business",
  "venta-cruzada": () => "G_sales",
  "co-ocurrencia": (v) => (v.graphType === "purchases" ? "G_purchases" : "G_sales"),
  "buscar-producto": () => "G_attr",
};

export function AlgoVisualizer({
  datasetId,
  slug,
  values,
  result,
  height,
  onReveal,
}: {
  datasetId: string;
  slug: string;
  values: Record<string, string>;
  result: QueryResponse;
  height?: string;
  onReveal?: (
    revealed: number,
    total: number,
    currentNodeId: string | undefined,
    trace: AnimTrace,
    labels: Map<string, string>,
  ) => void;
}) {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = slug in GRAPH_FOR;

  useEffect(() => {
    if (!supported || !result.ok) return;
    let cancelled = false;
    const graphKey = GRAPH_FOR[slug](values);
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const g = await loadGraph(datasetId, graphKey);
        if (cancelled) return;
        const p = prepare(slug, result, values, g, graphKey);
        if (!p || p.trace.steps.length === 0) {
          setError("No se pudo reconstruir un subgrafo animable para esta consulta.");
          setPrepared(null);
        } else {
          setPrepared(p);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error cargando el grafo");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetId, slug, result]);

  if (!supported) return null;

  return (
    <div>
      {loading && <p className="text-sm text-muted">Cargando grafo…</p>}
      {error && <p className="text-sm text-warn">{error}</p>}
      {prepared && (
        <GraphCanvas
          key={`${prepared.graphKey}:${prepared.nodes.length}:${prepared.trace.steps.length}:${prepared.trace.path.length}`}
          nodes={prepared.nodes}
          edges={prepared.edges}
          labels={prepared.labels}
          trace={prepared.trace}
          height={height}
          onReveal={(revealed, total, currentNodeId) =>
            onReveal?.(revealed, total, currentNodeId, prepared.trace, prepared.labels)
          }
        />
      )}
    </div>
  );
}
