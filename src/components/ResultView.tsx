"use client";

import type { QueryResponse } from "@/lib/types";

export function ResultView({ result }: { result: QueryResponse }) {
  if (!result.ok) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        {result.error ?? "La consulta no devolvió resultado."}
      </div>
    );
  }

  const columns = result.table.length > 0 ? Object.keys(result.table[0]) : [];

  return (
    <div className="space-y-4">
      {/* Respuesta en lenguaje natural */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
        <p className="text-sm">{result.answer}</p>
        {result.algorithm && (
          <p className="mt-1 text-[11px] text-muted mono">{result.algorithm}</p>
        )}
      </div>

      {/* Tabla de resultados */}
      {result.table.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="px-3 py-2 font-medium whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.table.map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {columns.map((c) => (
                    <td key={c} className="px-3 py-2 whitespace-nowrap">
                      {formatCell(row[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(2);
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
