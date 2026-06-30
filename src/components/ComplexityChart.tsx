"use client";

import { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

type GrowthKey = "exp2half" | "exp2" | "quad" | "nlogn" | "linear" | "nearconst";

function classify(bigO: string): GrowthKey {
  const b = bigO.toLowerCase();
  if (b.includes("b^(d/2)")) return "exp2half";
  if (b.includes("b^d")) return "exp2";
  if (b.includes("α")) return "nearconst";
  if (b.includes("·") || b.includes("²")) return "quad";
  if (b.includes("log")) return "nlogn";
  return "linear";
}

function fn(key: GrowthKey, n: number): number {
  switch (key) {
    case "exp2half":
      return Math.pow(2, n / 2);
    case "exp2":
      return Math.pow(2, n);
    case "quad":
      return n * n;
    case "nlogn":
      return n * Math.log2(n + 1);
    case "nearconst":
      return Math.log2(n + 1);
    case "linear":
    default:
      return n;
  }
}

const MAX_N = 14;

export function ComplexityChart({
  investigated,
  baseline,
}: {
  investigated: { label: string; time: string };
  baseline: { label: string; time: string };
}) {
  const data = useMemo(() => {
    const kInv = classify(investigated.time);
    const kBase = classify(baseline.time);
    const rows = [];
    for (let n = 2; n <= MAX_N; n++) {
      rows.push({
        n,
        investigado: Math.round(fn(kInv, n) * 100) / 100,
        baseline: Math.round(fn(kBase, n) * 100) / 100,
      });
    }
    return rows;
  }, [investigated.time, baseline.time]);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold">Crecimiento del costo</h4>
        <span className="text-[11px] text-muted">
          eje Y ≈ operaciones · eje X = tamaño de entrada
        </span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="#2a3654" strokeDasharray="3 3" />
          <XAxis dataKey="n" stroke="#94a3c4" fontSize={11} />
          <YAxis stroke="#94a3c4" fontSize={11} />
          <Tooltip
            contentStyle={{
              background: "#141b2e",
              border: "1px solid #2a3654",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="investigado"
            name={`${investigated.label} · ${investigated.time}`}
            stroke="#7ef0c4"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name={`${baseline.label} · ${baseline.time}`}
            stroke="#ffcf6e"
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[11px] text-muted">
        Curvas ilustrativas de la <span className="text-foreground">forma</span> de
        crecimiento de cada complejidad (no son tiempos medidos). Sirven para ver
        qué algoritmo escala mejor a medida que crece la entrada.
      </p>
    </div>
  );
}
