"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createDataset,
  listDatasets,
} from "@/lib/apiClient";
import type { DatasetListItem } from "@/lib/types";

type FileKey = "productos" | "ventas" | "compras";

const FIELDS: { key: FileKey; label: string; hint: string }[] = [
  { key: "productos", label: "Productos", hint: "catálogo / productos.csv" },
  { key: "ventas", label: "Ventas", hint: "ventas.csv" },
  { key: "compras", label: "Compras", hint: "items_compras.csv" },
];

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<Partial<Record<FileKey, File>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existing, setExisting] = useState<DatasetListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    listDatasets()
      .then((r) => setExisting(r.datasets))
      .catch(() => setExisting([]))
      .finally(() => setLoadingList(false));
  }, []);

  const ready = FIELDS.every((f) => files[f.key]);

  async function handleSubmit() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      const summary = await createDataset({
        productos: files.productos!,
        ventas: files.ventas!,
        compras: files.compras!,
      });
      router.push(`/dataset/${summary.dataset_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir los archivos");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <h1 className="text-3xl font-bold">Carga de datos</h1>
      <p className="mt-2 text-muted">
        El backend limpia los archivos, infiere el esquema y construye los grafos
        sobre los que correrán los algoritmos.
      </p>

      {/* Subida */}
      <div className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="font-semibold text-lg">Subir 3 archivos nuevos</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {FIELDS.map((f) => (
            <FileDrop
              key={f.key}
              label={f.label}
              hint={f.hint}
              file={files[f.key]}
              onPick={(file) =>
                setFiles((prev) => ({ ...prev, [f.key]: file }))
              }
            />
          ))}
        </div>

        {error && (
          <p className="mt-4 text-sm text-danger border border-danger/30 bg-danger/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!ready || busy}
          className="mt-5 rounded-lg bg-accent px-6 py-3 font-semibold text-[#0b1020] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition"
        >
          {busy ? "Procesando…" : "Construir grafos →"}
        </button>
      </div>

      {/* Datasets existentes */}
      <div className="mt-8 rounded-xl border border-border bg-surface/50 p-6">
        <h2 className="font-semibold text-lg">
          …o usar un dataset ya cargado
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ideal para la demo: salta la subida y entra directo a la galería.
        </p>
        {loadingList ? (
          <p className="mt-4 text-sm text-muted">Cargando…</p>
        ) : existing.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No hay datasets aún. Sube los 3 archivos arriba.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {existing.map((d) => (
              <li
                key={d.dataset_id}
                className="flex items-center justify-between py-3"
              >
                <div>
                  <span className="mono text-accent-2">{d.dataset_id}</span>
                  <span className="ml-3 text-xs text-muted">
                    {(d.size_bytes / 1_000_000).toFixed(1)} MB
                  </span>
                </div>
                <button
                  onClick={() => router.push(`/dataset/${d.dataset_id}`)}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Abrir →
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FileDrop({
  label,
  hint,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  file?: File;
  onPick: (f: File) => void;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition ${
        file
          ? "border-accent-2/50 bg-accent-2/5"
          : "border-border hover:border-accent/50"
      }`}
    >
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
        }}
      />
      <div className="font-medium">{label}</div>
      {file ? (
        <div className="mt-1 text-xs text-accent-2 truncate">{file.name}</div>
      ) : (
        <div className="mt-1 text-xs text-muted">{hint}</div>
      )}
    </label>
  );
}
