"use client";

import { useEffect, useMemo, useState } from "react";
import type { QueryResponse } from "@/lib/types";
import { fetchArtifactText } from "@/lib/apiClient";
import { parseCSV } from "@/lib/csv";
import { useStepPlayer, StepControls } from "./StepPlayer";

const MIN_SIM = 0.75; // = MIN_UFDS_SIMILARITY del backend
const PALETTE = [
  "#6ea8fe", "#7ef0c4", "#ffcf6e", "#c08bff", "#ff7a8a", "#22c55e",
  "#f97316", "#ec4899", "#14b8a6", "#a855f7", "#eab308", "#3b82f6",
];

interface Edge {
  a: string;
  b: string;
  sim: number;
}

function key(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function UnionFindViz({
  datasetId,
  productId,
  result,
  height,
}: {
  datasetId: string;
  productId: string;
  result: QueryResponse;
  height?: string;
}) {
  const [projText, setProjText] = useState<string | null>(null);
  const loading = projText === null; // aún cargando mientras no haya respuesta

  // Miembros = producto consultado + vecinos del resultado (cap 12).
  const { members, labels } = useMemo(() => {
    const labels = new Map<string, string>();
    const members: string[] = [String(productId)];
    labels.set(String(productId), String(productId));
    for (const r of result.table.slice(0, 11)) {
      const id = String(r.product_id ?? "");
      if (!id || members.includes(id)) continue;
      members.push(id);
      labels.set(id, String(r.product_name ?? id) || id);
    }
    return { members, labels };
  }, [productId, result]);

  useEffect(() => {
    let cancelled = false;
    fetchArtifactText(datasetId, "product_projection_edges.csv")
      .then((t) => !cancelled && setProjText(t))
      .catch(() => !cancelled && setProjText(""));
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  // Aristas entre miembros (desde la proyección); si no hay, estrella al consultado.
  const edges = useMemo<Edge[]>(() => {
    const memberSet = new Set(members);
    const seen = new Set<string>();
    const out: Edge[] = [];
    if (projText) {
      for (const r of parseCSV(projText)) {
        const a = String(r.source ?? "");
        const b = String(r.target ?? "");
        const sim = Number(r.similarity) || 0;
        if (!memberSet.has(a) || !memberSet.has(b) || a === b) continue;
        if (sim < MIN_SIM) continue;
        const k = key(a, b);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ a, b, sim });
      }
    }
    if (out.length === 0) {
      // Fallback: estrella consultado ↔ vecino con la similitud del resultado.
      for (const r of result.table.slice(0, 11)) {
        const b = String(r.product_id ?? "");
        if (!b || b === members[0]) continue;
        out.push({ a: members[0], b, sim: Number(r.similarity) || 1 });
      }
    }
    return out.sort((x, y) => y.sim - x.sim);
  }, [projText, members, result]);

  // Réplica del Union-Find: snapshot de raíz por miembro tras cada arista.
  const { snapshots, merged } = useMemo(() => {
    const parent = new Map(members.map((m) => [m, m]));
    const find = (x: string): string => {
      let r = x;
      while (parent.get(r) !== r) r = parent.get(r)!;
      let c = x;
      while (parent.get(c) !== r) {
        const next = parent.get(c)!;
        parent.set(c, r);
        c = next;
      }
      return r;
    };
    const snap = () => new Map(members.map((m) => [m, find(m)]));
    const snapshots: Map<string, string>[] = [snap()];
    const merged: boolean[] = [];
    for (const e of edges) {
      const ra = find(e.a);
      const rb = find(e.b);
      if (ra !== rb) {
        parent.set(rb, ra);
        merged.push(true);
      } else {
        merged.push(false);
      }
      snapshots.push(snap());
    }
    return { snapshots, merged };
  }, [members, edges]);

  const total = edges.length;
  const player = useStepPlayer(total, 750);
  const { step, done } = player;

  // Geometría circular.
  const size = 460;
  const cx = size / 2;
  const cy = size / 2;
  const radius = Math.min(size, 360) / 2 - 60;
  const pos = (i: number) => {
    const ang = (i / Math.max(members.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + radius * Math.cos(ang), y: cy + radius * Math.sin(ang) };
  };

  const snap = snapshots[Math.min(step, total)];
  const rootColor = (root: string) =>
    PALETTE[Math.max(members.indexOf(root), 0) % PALETTE.length];
  const components = snap ? new Set([...snap.values()]).size : members.length;
  const curEdge = step > 0 ? edges[step - 1] : null;

  if (loading) {
    return (
      <div
        className="rounded-xl border border-border bg-[#0b1020] grid place-items-center text-sm text-muted"
        style={{ height: height ?? "60vh" }}
      >
        Cargando familia…
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border bg-[#0b1020] overflow-hidden flex flex-col"
      style={{ minHeight: height ?? "60vh" }}
    >
      <div className="flex-1 overflow-auto p-2">
        <p className="px-2 pt-2 text-xs text-muted">
          Union-Find empieza con cada producto en su propio grupo y va{" "}
          <span className="text-foreground">fusionando</span> los que están conectados
          (similitud ≥ {MIN_SIM}). Al final, una misma familia = un mismo color.
        </p>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full mx-auto" style={{ maxHeight: "55vh" }}>
          {/* Aristas */}
          {edges.map((e, i) => {
            const ia = members.indexOf(e.a);
            const ib = members.indexOf(e.b);
            if (ia < 0 || ib < 0) return null;
            const pa = pos(ia);
            const pb = pos(ib);
            const processed = i < step;
            const isCur = i === step - 1;
            return (
              <line
                key={i}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={isCur ? "#6ea8fe" : processed && merged[i] ? "#7ef0c4" : "#2a3654"}
                strokeWidth={isCur ? 3 : processed && merged[i] ? 2 : 1}
                strokeDasharray={processed ? undefined : "4 4"}
              />
            );
          })}
          {/* Nodos */}
          {members.map((m, i) => {
            const p = pos(i);
            const color = snap ? rootColor(snap.get(m)!) : PALETTE[i % PALETTE.length];
            const isQuery = i === 0;
            return (
              <g key={m}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isQuery ? 16 : 13}
                  fill={color}
                  stroke={isQuery ? "#e6ecf5" : "#0b1020"}
                  strokeWidth={isQuery ? 3 : 2}
                />
                <text x={p.x} y={p.y + 28} fill="#94a3c4" fontSize={9} textAnchor="middle">
                  {(labels.get(m) ?? m).slice(0, 14)}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="px-2 pb-2 text-xs">
          <span className="text-muted">componentes (familias): </span>
          <span className="mono text-foreground">{components}</span>
          {curEdge && !done && (
            <span className="text-muted">
              {" "}· {merged[step - 1] ? "unió dos grupos" : "ya estaban en el mismo grupo"}
            </span>
          )}
          {done && <span className="text-accent-2"> · familia consolidada</span>}
        </p>
      </div>

      <StepControls
        step={player.step}
        total={player.total}
        playing={player.playing}
        done={player.done}
        onToggle={() => player.setPlaying((p) => !p)}
        onStep={() => player.setStep((s) => Math.min(s + 1, total))}
        onReset={() => {
          player.setStep(0);
          player.setPlaying(true);
        }}
        caption="fusionando familias"
      />
    </div>
  );
}
