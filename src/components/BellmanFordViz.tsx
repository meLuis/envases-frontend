"use client";

import { useMemo } from "react";
import type { QueryResponse } from "@/lib/types";
import { useStepPlayer, StepControls } from "./StepPlayer";

interface Row {
  productId: string;
  supplier: string;
  weight: number; // edge_weight: negativo = ahorro
}

interface Frame {
  round: number;
  node: string; // nodo cuya distancia se actualiza
  dist: number;
  edgeFrom: string;
}

const INF = Infinity;

function readRows(result: QueryResponse): Row[] {
  return result.table
    .slice(0, 5)
    .map((r) => ({
      productId: String(r.product_id ?? ""),
      supplier: String(r.supplier ?? ""),
      weight: Number(r.edge_weight ?? r.savings_per_unit ?? 0) || 0,
    }))
    .filter((r) => r.productId);
}

export function BellmanFordViz({ result, height }: { result: QueryResponse; height?: string }) {
  const rows = useMemo(() => readRows(result), [result]);

  const { frames, snapshots } = useMemo(() => {
    const frames: Frame[] = [];
    // Ronda 1: SOURCE → PRODUCT (peso 0). Ronda 2: PRODUCT → OPTION (peso w).
    rows.forEach((r) => frames.push({ round: 1, node: `P:${r.productId}`, dist: 0, edgeFrom: "SOURCE" }));
    rows.forEach((r) =>
      frames.push({ round: 2, node: `O:${r.productId}`, dist: r.weight, edgeFrom: `P:${r.productId}` }),
    );
    // Snapshots de distancias acumuladas por paso (0 = init).
    const base: Record<string, number> = { SOURCE: 0 };
    rows.forEach((r) => {
      base[`P:${r.productId}`] = INF;
      base[`O:${r.productId}`] = INF;
    });
    const snapshots: Record<string, number>[] = [{ ...base }];
    let cur = { ...base };
    for (const f of frames) {
      cur = { ...cur, [f.node]: f.dist };
      snapshots.push({ ...cur });
    }
    return { frames, snapshots };
  }, [rows]);

  const total = frames.length;
  const player = useStepPlayer(total, 700);
  const { step, done } = player;

  if (rows.length === 0) {
    return (
      <div
        className="rounded-xl border border-border bg-[#0b1020] grid place-items-center text-sm text-muted"
        style={{ height: height ?? "60vh" }}
      >
        No hay aristas de ahorro para mostrar.
      </div>
    );
  }

  const dist = snapshots[Math.min(step, total)];
  const curFrame = step > 0 ? frames[step - 1] : null;
  const round = curFrame?.round ?? 0;

  // Geometría del SVG (3 columnas).
  const W = 640;
  const rowH = 90;
  const H = Math.max(rows.length * rowH + 40, 260);
  const xSrc = 70;
  const xProd = 320;
  const xOpt = 560;
  const ySrc = H / 2;
  const yOf = (i: number) => 50 + i * rowH;

  const fmt = (v: number) => (v === INF ? "∞" : v % 1 === 0 ? String(v) : v.toFixed(2));

  return (
    <div
      className="rounded-xl border border-border bg-[#0b1020] overflow-hidden flex flex-col"
      style={{ minHeight: height ?? "60vh" }}
    >
      <div className="flex-1 overflow-auto p-2">
        <p className="px-2 pt-2 text-xs text-muted">
          Bellman-Ford relaja todas las aristas por rondas. Las distancias empiezan en ∞
          (salvo el origen) y bajan al relajar. Una arista{" "}
          <span className="text-accent-2">negativa</span> = ahorro frente al costo típico.
        </p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: "60vh" }}>
          {/* Aristas SOURCE → PRODUCT */}
          {rows.map((r, i) => {
            const active = curFrame?.node === `P:${r.productId}`;
            return (
              <g key={`e1-${i}`}>
                <line
                  x1={xSrc + 22}
                  y1={ySrc}
                  x2={xProd - 22}
                  y2={yOf(i)}
                  stroke={active ? "#6ea8fe" : "#4a5a82"}
                  strokeWidth={active ? 3 : 1.5}
                />
                <text x={(xSrc + xProd) / 2} y={(ySrc + yOf(i)) / 2 - 4} fill="#94a3c4" fontSize={10} textAnchor="middle">
                  0
                </text>
              </g>
            );
          })}
          {/* Aristas PRODUCT → OPTION */}
          {rows.map((r, i) => {
            const active = curFrame?.node === `O:${r.productId}`;
            const neg = r.weight < 0;
            return (
              <g key={`e2-${i}`}>
                <line
                  x1={xProd + 22}
                  y1={yOf(i)}
                  x2={xOpt - 22}
                  y2={yOf(i)}
                  stroke={active ? "#6ea8fe" : neg ? "#7ef0c4" : "#4a5a82"}
                  strokeWidth={active ? 3 : neg ? 2 : 1.5}
                />
                <text
                  x={(xProd + xOpt) / 2}
                  y={yOf(i) - 6}
                  fill={neg ? "#7ef0c4" : "#94a3c4"}
                  fontSize={10}
                  textAnchor="middle"
                >
                  {fmt(r.weight)}
                </text>
              </g>
            );
          })}

          {/* Nodo SOURCE */}
          <Node x={xSrc} y={ySrc} label="SOURCE" dist={fmt(dist.SOURCE)} color="#c08bff" />
          {/* Nodos PRODUCT y OPTION */}
          {rows.map((r, i) => (
            <g key={`n-${i}`}>
              <Node
                x={xProd}
                y={yOf(i)}
                label={r.productId}
                dist={fmt(dist[`P:${r.productId}`])}
                color="#6ea8fe"
              />
              <Node
                x={xOpt}
                y={yOf(i)}
                label={r.supplier || "opción"}
                dist={fmt(dist[`O:${r.productId}`])}
                color={r.weight < 0 ? "#7ef0c4" : "#ff7a8a"}
              />
            </g>
          ))}
        </svg>
        <p className="px-2 pb-2 text-xs">
          {done ? (
            <span className="text-accent-2">
              Convergió: cada producto encontró su opción de menor costo (mayor ahorro).
            </span>
          ) : (
            <span className="text-muted">
              {round > 0 ? `Ronda ${round}: relajando aristas…` : "Inicio: todo en ∞ salvo SOURCE = 0."}
            </span>
          )}
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
        caption="relajación por rondas"
      />
    </div>
  );
}

function Node({
  x,
  y,
  label,
  dist,
  color,
}: {
  x: number;
  y: number;
  label: string;
  dist: string;
  color: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={20} fill="#141b2e" stroke={color} strokeWidth={2.5} />
      <text x={x} y={y + 4} fill="#e6ecf5" fontSize={10} fontWeight={700} textAnchor="middle">
        {dist}
      </text>
      <text x={x} y={y + 36} fill="#94a3c4" fontSize={10} textAnchor="middle">
        {label.length > 12 ? label.slice(0, 11) + "…" : label}
      </text>
    </g>
  );
}
