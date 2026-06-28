"use client";

import type { FormField } from "@/data/catalog";

export function InputForm({
  fields,
  values,
  onChange,
}: {
  fields: FormField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted">
        Este algoritmo no requiere parámetros: opera sobre todo el grafo.
      </p>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => (
        <label key={f.name} className="block">
          <span className="text-xs font-medium text-muted">{f.label}</span>
          {f.type === "select" ? (
            <select
              value={values[f.name] ?? f.default ?? ""}
              onChange={(e) => onChange(f.name, e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={f.type}
              value={values[f.name] ?? f.default ?? ""}
              placeholder={f.placeholder}
              onChange={(e) => onChange(f.name, e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          )}
          {f.help && <span className="mt-1 block text-[11px] text-muted">{f.help}</span>}
        </label>
      ))}
    </div>
  );
}
