"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Core } from "cytoscape";
import type { AnimTrace } from "@/lib/algorithms";
import { nodeType, shortLabel } from "@/lib/graphData";

const TYPE_COLOR: Record<string, string> = {
  PRODUCT: "#6ea8fe",
  ATTRIBUTE: "#7ef0c4",
  DOCUMENT: "#ffcf6e",
  CLIENT: "#c08bff",
  SUPPLIER: "#ff7a8a",
  OTHER: "#94a3c4",
};

export function GraphCanvas({
  nodes,
  edges,
  labels,
  trace,
}: {
  nodes: string[];
  edges: [string, string][];
  labels: Map<string, string>;
  trace: AnimTrace;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(true);

  const pathSet = useMemo(() => new Set(trace.path), [trace.path]);
  const pathEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < trace.path.length - 1; i++) {
      const a = trace.path[i];
      const b = trace.path[i + 1];
      s.add(a < b ? `${a}|${b}` : `${b}|${a}`);
    }
    return s;
  }, [trace.path]);

  // Init Cytoscape (import dinámico para evitar SSR sobre window).
  useEffect(() => {
    let cancelled = false;
    let cy: Core | null = null;
    (async () => {
      const cytoscape = (await import("cytoscape")).default;
      if (cancelled || !ref.current) return;
      const elements = [
        ...nodes.map((id) => ({
          data: { id, label: shortLabel(id, labels), color: TYPE_COLOR[nodeType(id)] ?? TYPE_COLOR.OTHER },
          classes: "hidden",
        })),
        ...edges.map(([s, t], i) => ({
          data: { id: `e${i}`, source: s, target: t },
          classes: "hidden",
        })),
      ];
      cy = cytoscape({
        container: ref.current,
        elements,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(color)",
              label: "data(label)",
              color: "#e6ecf5",
              "font-size": 7,
              "text-valign": "center",
              "text-halign": "center",
              "text-max-width": "70px",
              "text-wrap": "ellipsis",
              width: 18,
              height: 18,
              "border-width": 2,
              "border-color": "#2a3654",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1,
              "line-color": "#2a3654",
              "curve-style": "haystack",
              opacity: 0.5,
            },
          },
          { selector: ".hidden", style: { display: "none" } },
          { selector: "node.side-a", style: { "border-color": "#6ea8fe" } },
          { selector: "node.side-b", style: { "border-color": "#7ef0c4" } },
          {
            selector: "node.path",
            style: {
              "border-color": "#ff7a8a",
              "border-width": 4,
              width: 24,
              height: 24,
              "font-size": 8,
            },
          },
          {
            selector: "edge.path",
            style: { "line-color": "#ff7a8a", width: 3, opacity: 1 },
          },
        ],
        layout: { name: "cose", animate: false, padding: 20 },
      });
      cyRef.current = cy;
    })();
    return () => {
      cancelled = true;
      cy?.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Tick de revelado.
  useEffect(() => {
    if (!playing || revealed >= trace.steps.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 260);
    return () => clearTimeout(t);
  }, [playing, revealed, trace.steps.length]);

  // Aplica el estado de revelado al grafo.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const shown = new Set(trace.steps.slice(0, revealed));
    const allPathShown = revealed >= trace.steps.length;
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const id = n.id();
        if (!shown.has(id)) {
          n.addClass("hidden");
          return;
        }
        n.removeClass("hidden side-a side-b path");
        const side = trace.side[id];
        if (side === "a") n.addClass("side-a");
        else if (side === "b") n.addClass("side-b");
        if (allPathShown && pathSet.has(id)) n.addClass("path");
      });
      cy.edges().forEach((e) => {
        const s = e.source().id();
        const t = e.target().id();
        if (!shown.has(s) || !shown.has(t)) {
          e.addClass("hidden");
          return;
        }
        e.removeClass("hidden path");
        const key = s < t ? `${s}|${t}` : `${t}|${s}`;
        if (allPathShown && pathEdgeSet.has(key)) e.addClass("path");
      });
    });
  }, [revealed, trace, pathSet, pathEdgeSet]);

  const done = revealed >= trace.steps.length;

  return (
    <div className="rounded-xl border border-border bg-[#0b1020] overflow-hidden">
      {/* Lienzo */}
      <div ref={ref} className="h-[360px] w-full" />

      {/* Controles + métricas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (done) setRevealed(0);
              setPlaying((p) => !p);
            }}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-[#0b1020] hover:brightness-110"
          >
            {done ? "↻ Repetir" : playing ? "⏸ Pausar" : "▶ Reproducir"}
          </button>
          <button
            onClick={() => setRevealed((r) => Math.min(r + 1, trace.steps.length))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Paso →
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Metric label="nodos descubiertos" value={`${revealed}/${trace.steps.length}`} />
          <Metric label="expansiones (investigado)" value={trace.expanded} tone="good" />
          {trace.baselineExpanded != null && (
            <Metric
              label="expansiones (BFS baseline)"
              value={trace.baselineExpanded}
              tone="warn"
            />
          )}
          {trace.baselineExpanded != null && trace.expanded > 0 && (
            <Metric
              label="ratio"
              value={`${(trace.baselineExpanded / trace.expanded).toFixed(2)}×`}
              tone="good"
            />
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 border-t border-border px-4 py-2 text-[11px] text-muted">
        <Legend color="#6ea8fe" label="frente origen" />
        <Legend color="#7ef0c4" label="frente destino" />
        <Legend color="#ff7a8a" label="camino final" />
        {trace.note && <span className="text-warn">· {trace.note}</span>}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "good" | "warn";
}) {
  const c = tone === "good" ? "text-accent-2" : tone === "warn" ? "text-warn" : "text-foreground";
  return (
    <div className="text-right">
      <div className={`mono font-bold ${c}`}>{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
