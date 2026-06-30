"use client";

import { useMemo } from "react";
import type { QueryResponse } from "@/lib/types";
import { useStepPlayer, StepControls } from "./StepPlayer";

interface Item {
  product_id: string;
  cost: number;
  value: number;
}

const COLS = 10; // tramos de presupuesto que se muestran (eje de capacidad)

function readItems(result: QueryResponse): Item[] {
  const raw = (result.metrics as Record<string, unknown>)?.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = r as Record<string, unknown>;
      return {
        product_id: String(o.product_id ?? ""),
        cost: Number(o.cost) || 0,
        value: Number(o.value) || 0,
      };
    })
    .filter((it) => it.cost > 0)
    .slice(0, 8);
}

export function KnapsackViz({
  result,
  budget,
  height,
}: {
  result: QueryResponse;
  budget: number;
  height?: string;
}) {
  const items = useMemo(() => readItems(result), [result]);

  // Tabla DP compacta sobre el presupuesto bucketizado en COLS tramos.
  const { dp, capacities, chosen } = useMemo(() => {
    const bucket = budget > 0 ? budget / COLS : 1;
    const capacities = Array.from({ length: COLS + 1 }, (_, j) => Math.round(j * bucket));
    const costBucket = items.map((it) => Math.min(Math.max(Math.ceil(it.cost / bucket), 1), COLS));
    // dp[i][j]: mejor valor usando los primeros i ítems con capacidad j tramos.
    const dp: number[][] = Array.from({ length: items.length + 1 }, () =>
      Array(COLS + 1).fill(0),
    );
    for (let i = 1; i <= items.length; i++) {
      const c = costBucket[i - 1];
      const v = items[i - 1].value;
      for (let j = 0; j <= COLS; j++) {
        const skip = dp[i - 1][j];
        const take = j >= c ? dp[i - 1][j - c] + v : -Infinity;
        dp[i][j] = Math.max(skip, take);
      }
    }
    // Backtrack para marcar los ítems elegidos en la solución óptima.
    const chosen = new Set<number>();
    let j = COLS;
    for (let i = items.length; i >= 1; i--) {
      const c = costBucket[i - 1];
      const v = items[i - 1].value;
      if (j >= c && dp[i][j] === dp[i - 1][j - c] + v && dp[i][j] !== dp[i - 1][j]) {
        chosen.add(i - 1);
        j -= c;
      }
    }
    return { dp, capacities, chosen };
  }, [items, budget]);

  const total = items.length * (COLS + 1);
  const player = useStepPlayer(total);
  const { step, done } = player;

  if (items.length === 0) {
    return (
      <div
        className="rounded-xl border border-border bg-[#0b1020] grid place-items-center text-sm text-muted"
        style={{ height: height ?? "60vh" }}
      >
        Ejecuta con IDs de producto válidos para construir la tabla DP.
      </div>
    );
  }

  // Celda actual (la que se está calculando en este paso).
  const curIdx = Math.min(step, total) - 1;
  const curRow = curIdx >= 0 ? Math.floor(curIdx / (COLS + 1)) : -1; // 0-based item
  const curCol = curIdx >= 0 ? curIdx % (COLS + 1) : -1;

  const cellRevealed = (i: number, j: number) => {
    const frame = i * (COLS + 1) + j; // i 0-based item-row
    return step > frame;
  };

  return (
    <div
      className="rounded-xl border border-border bg-[#0b1020] overflow-hidden flex flex-col"
      style={{ minHeight: height ?? "60vh" }}
    >
      <div className="flex-1 overflow-auto p-4">
        <p className="text-xs text-muted mb-3">
          Cada celda decide, para cada producto y nivel de presupuesto, si conviene
          incluirlo: <span className="mono">dp[i][w] = máx(dejarlo, tomarlo)</span>. El
          presupuesto se muestra en {COLS} tramos para que sea legible.
        </p>
        <table className="text-xs mono border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-[#0b1020] px-2 py-1 text-left text-muted">
                producto \ S/
              </th>
              {capacities.map((cap, j) => (
                <th
                  key={j}
                  className={`px-2 py-1 text-right text-muted ${
                    curCol === j ? "text-accent" : ""
                  }`}
                >
                  {cap.toLocaleString()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <th
                  className={`sticky left-0 bg-[#0b1020] px-2 py-1 text-left font-medium whitespace-nowrap ${
                    done && chosen.has(i)
                      ? "text-accent-2"
                      : curRow === i
                        ? "text-accent"
                        : "text-foreground"
                  }`}
                >
                  {done && chosen.has(i) ? "✔ " : ""}
                  {it.product_id}
                  <span className="ml-1 text-muted">
                    (S/{it.cost} · v{Math.round(it.value)})
                  </span>
                </th>
                {capacities.map((_, j) => {
                  const isCur = curRow === i && curCol === j;
                  const shown = cellRevealed(i, j) || isCur;
                  return (
                    <td
                      key={j}
                      className={`px-2 py-1 text-right border border-border/40 transition ${
                        isCur
                          ? "bg-accent/30 text-foreground"
                          : shown
                            ? "bg-surface/40 text-foreground"
                            : "text-transparent"
                      }`}
                    >
                      {shown ? Math.round(dp[i + 1][j]) : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Lectura de la recurrencia para la celda actual */}
        {!done && curRow >= 0 && (
          <p className="mt-3 text-xs text-muted">
            Calculando <span className="mono text-foreground">dp[{curRow + 1}][{capacities[curCol]}]</span>:
            comparar no incluir <span className="mono">{Math.round(dp[curRow][curCol])}</span> vs
            incluir <span className="mono">{items[curRow].product_id}</span>.
          </p>
        )}
        {done && (
          <p className="mt-3 text-sm">
            <span className="text-accent-2 font-semibold">
              Óptimo: {chosen.size} producto(s) seleccionados
            </span>{" "}
            <span className="text-muted">
              — la DP exploró todo el espacio y garantiza el mejor valor, no una aproximación.
            </span>
          </p>
        )}
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
        caption="llenando la tabla DP"
      />
    </div>
  );
}
