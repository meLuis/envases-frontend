"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Core } from "cytoscape";
import type { AnimTrace } from "@/lib/algorithms";
import { nodeType, shortLabel, NODE_TYPE_COLOR as TYPE_COLOR } from "@/lib/graphData";

export function GraphCanvas({
  nodes,
  edges,
  labels,
  trace,
  height = "360px",
  onReveal,
}: {
  nodes: string[];
  edges: [string, string][];
  labels: Map<string, string>;
  trace: AnimTrace;
  height?: string;
  onReveal?: (revealed: number, total: number, currentNodeId: string | undefined) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [tip, setTip] = useState<{ x: number; y: number; label: string; type: string } | null>(null);

  // Mantener la última identidad de onReveal sin re-disparar el efecto de aviso.
  const onRevealRef = useRef(onReveal);
  useEffect(() => {
    onRevealRef.current = onReveal;
  });

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

  // La animación recorre SOLO los nodos que existen en el subgrafo dibujado
  // (la traza trae cientos de pasos, pero el lienzo tiene ~60 nodos). Así el
  // contador es real y la animación dura segundos, no un minuto.
  const visibleOrder = useMemo(() => {
    const set = new Set(nodes);
    return trace.steps.filter((s) => set.has(s));
  }, [nodes, trace.steps]);
  const total = visibleOrder.length;

  // Init Cytoscape (import dinámico para evitar SSR sobre window).
  useEffect(() => {
    let cancelled = false;
    let cy: Core | null = null;
    let ro: ResizeObserver | null = null;
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
      // Layout adaptativo. `cose` (dirigido por fuerzas) dispersa los nodos
      // desconectados a coordenadas enormes → `fit` se aleja tanto que los
      // nodos quedan sub-pixel (lienzo "en negro"). Para subgrafos pequeños o
      // dispersos usamos un layout DETERMINISTA y compacto que SIEMPRE deja
      // todo a la vista; `cose` solo para grafos grandes y conectados.
      const useConcentric = nodes.length <= 24;
      const layoutOpts = useConcentric
        ? {
            name: "concentric" as const,
            fit: true,
            padding: 40,
            animate: false,
            minNodeSpacing: 45,
            // Hub (mayor grado) al centro; vecinos alrededor → lectura natural.
            concentric: (n: { degree: () => number }) => n.degree(),
            levelWidth: () => 1,
          }
        : {
            name: "cose" as const,
            fit: true,
            padding: 40,
            animate: false,
            // Mantener juntas las componentes desconectadas (no dispersarlas).
            componentSpacing: 80,
            nodeOverlap: 12,
          };
      cy = cytoscape({
        container: ref.current,
        elements,
        // Acotar el zoom: ni invisible ni gigante, pase lo que pase el layout.
        minZoom: 0.25,
        maxZoom: 2.5,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(color)",
              label: "data(label)",
              color: "#e6ecf5",
              "font-size": 11,
              "font-weight": 600,
              "text-valign": "bottom",
              "text-halign": "center",
              "text-margin-y": 4,
              "text-max-width": "110px",
              "text-wrap": "ellipsis",
              "text-outline-color": "#0b1020",
              "text-outline-width": 2,
              width: 28,
              height: 28,
              "border-width": 2,
              "border-color": "#0b1020",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": "#4a5a82",
              "curve-style": "bezier",
              opacity: 0.85,
            },
          },
          // "hidden" = invisible pero conserva posición → la cámara enmarca todo
          // el subgrafo desde el inicio (estable) y los nodos aparecen en su sitio.
          {
            selector: ".hidden",
            style: { opacity: 0, "text-opacity": 0, events: "no" },
          },
          { selector: "node.side-a", style: { "border-color": "#6ea8fe", "border-width": 3 } },
          { selector: "node.side-b", style: { "border-color": "#7ef0c4", "border-width": 3 } },
          {
            selector: "node.path",
            style: {
              "border-color": "#ff7a8a",
              "border-width": 5,
              width: 34,
              height: 34,
              "font-size": 11,
            },
          },
          {
            selector: "edge.path",
            style: { "line-color": "#ff7a8a", width: 3, opacity: 1 },
          },
        ],
        layout: layoutOpts,
      });
      cyRef.current = cy;
      // Enmarcar TODO el subgrafo. Como los ocultos usan opacity (no
      // display:none) conservan bounding box, así que `fit` enmarca el grafo
      // completo. Re-mide el contenedor antes de encuadrar (clave en
      // pantalla completa / cuando aparece el riel lateral).
      const refit = () => {
        if (!cy) return;
        cy.resize();
        cy.fit(undefined, 40);
      };
      cy.on("layoutstop", refit);
      // Respaldo robusto: doble rAF (espera a que el contenedor esté medido) +
      // timeout, por si el layout síncrono ya terminó antes de registrar el
      // listener de layoutstop.
      requestAnimationFrame(() => requestAnimationFrame(refit));
      setTimeout(refit, 250);

      // Re-ajustar cuando el contenedor cambia de tamaño (aparece el riel,
      // resize de ventana, etc.). Cytoscape no lo hace solo.
      if (ref.current && "ResizeObserver" in window) {
        ro = new ResizeObserver(() => {
          if (!cy) return;
          cy.resize();
          cy.fit(undefined, 30);
        });
        ro.observe(ref.current);
      }

      // Tooltip al pasar el cursor: muestra etiqueta completa + tipo de entidad.
      cy.on("mouseover", "node", (evt) => {
        const n = evt.target;
        const rp = n.renderedPosition();
        const id = n.id();
        setTip({
          x: rp.x,
          y: rp.y,
          label: labels.get(id) ?? id,
          type: nodeType(id),
        });
      });
      cy.on("mouseout", "node", () => setTip(null));
      cy.on("pan zoom", () => setTip(null));
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
      cy?.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  // Avisar al padre solo cuando cambia `revealed` (no cuando cambia la
  // identidad del callback — eso causaba un bucle de renders).
  useEffect(() => {
    onRevealRef.current?.(revealed, total, visibleOrder[revealed - 1]);
  }, [revealed, total, visibleOrder]);

  // Tick de revelado (sobre los nodos visibles → dura segundos, no un minuto).
  useEffect(() => {
    if (!playing || revealed >= total) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 150);
    return () => clearTimeout(t);
  }, [playing, revealed, total]);

  // Aplica el estado de revelado al grafo.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const shown = new Set(visibleOrder.slice(0, revealed));
    const allPathShown = revealed >= total;
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
  }, [revealed, trace, pathSet, pathEdgeSet, visibleOrder, total]);

  const done = revealed >= total;

  return (
    <div className="rounded-xl border border-border bg-[#0b1020] overflow-hidden flex flex-col">
      {/* Lienzo — altura explícita para no colapsar en padres sin altura definida.
          OJO: Cytoscape fuerza `position: relative` en su contenedor al montar,
          lo que anula un `absolute inset-0` y colapsa la altura a 0. Por eso el
          contenedor usa `h-full w-full` (toma la altura explícita del padre). */}
      <div className="relative w-full shrink-0" style={{ height }}>
        <div ref={ref} className="h-full w-full" />
        {tip && (
          <div
            className="pointer-events-none absolute z-10 rounded-lg border border-border bg-surface/95 px-2.5 py-1.5 shadow-lg backdrop-blur"
            style={{
              left: tip.x,
              top: tip.y,
              transform: "translate(-50%, calc(-100% - 14px))",
              maxWidth: 260,
            }}
          >
            <div
              className="text-[10px] mono font-bold"
              style={{ color: TYPE_COLOR[tip.type] ?? TYPE_COLOR.OTHER }}
            >
              {tip.type}
            </div>
            <div className="text-sm font-medium text-foreground break-words">{tip.label}</div>
          </div>
        )}
      </div>

      {/* Controles + métricas */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 shrink-0">
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
            onClick={() => setRevealed((r) => Math.min(r + 1, total))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground"
          >
            Paso →
          </button>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 1.3)}
              className="rounded-lg border border-border px-2 py-1.5 text-sm text-muted hover:text-foreground"
              title="Zoom in"
            >
              ＋
            </button>
            <button
              onClick={() => cyRef.current && cyRef.current.zoom(cyRef.current.zoom() * 0.75)}
              className="rounded-lg border border-border px-2 py-1.5 text-sm text-muted hover:text-foreground"
              title="Zoom out"
            >
              −
            </button>
            <button
              onClick={() => cyRef.current && cyRef.current.fit(undefined, 20)}
              className="rounded-lg border border-border px-2 py-1.5 text-sm text-muted hover:text-foreground"
              title="Fit to screen"
            >
              ⊙
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Metric label="nodos en escena" value={`${revealed}/${total}`} />
        </div>
      </div>

      {/* Leyenda de 2 canales: relleno = tipo de entidad · borde = estado en la búsqueda */}
      <div className="border-t border-border px-4 py-2 text-[11px] text-muted">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-muted/70 mr-1">relleno = entidad:</span>
          <Legend color="#6ea8fe" label="producto" />
          <Legend color="#7ef0c4" label="atributo" />
          <Legend color="#ffcf6e" label="comprobante" />
          <Legend color="#c08bff" label="cliente" />
          <Legend color="#ff7a8a" label="proveedor" />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-muted/70 mr-1">borde = búsqueda:</span>
          <Legend color="#6ea8fe" label="frente origen" ring />
          <Legend color="#7ef0c4" label="frente destino" ring />
          <Legend color="#ff7a8a" label="camino final" ring />
          {trace.note && <span className="text-warn">· {trace.note}</span>}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-right">
      <div className="mono font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  );
}

function Legend({ color, label, ring }: { color: string; label: string; ring?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={
          ring
            ? { border: `2px solid ${color}`, background: "transparent" }
            : { background: color }
        }
      />
      {label}
    </span>
  );
}
