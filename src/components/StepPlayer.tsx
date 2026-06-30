"use client";

import { useEffect, useState } from "react";

/**
 * Reproductor de pasos compartido por los visuales (Knapsack, Bellman-Ford,
 * Union-Find). Mantiene un índice 0..total y auto-avanza mientras `playing`.
 */
export function useStepPlayer(total: number, intervalMs = 650) {
  // Los visuales se remontan con key={runId} en cada ejecución, así que el
  // estado arranca limpio sin necesidad de resetear dentro de un efecto.
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || step >= total) return;
    const t = setTimeout(() => setStep((s) => s + 1), intervalMs);
    return () => clearTimeout(t);
  }, [playing, step, total, intervalMs]);

  const done = step >= total;
  return { step, setStep, playing, setPlaying, done, total };
}

export function StepControls({
  step,
  total,
  playing,
  done,
  onToggle,
  onStep,
  onReset,
  caption,
}: {
  step: number;
  total: number;
  playing: boolean;
  done: boolean;
  onToggle: () => void;
  onStep: () => void;
  onReset: () => void;
  caption?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={done ? onReset : onToggle}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-[#0b1020] hover:brightness-110"
        >
          {done ? "↻ Repetir" : playing ? "⏸ Pausar" : "▶ Reproducir"}
        </button>
        <button
          onClick={onStep}
          disabled={done}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-foreground disabled:opacity-40"
        >
          Paso →
        </button>
        {caption && <span className="text-xs text-muted">{caption}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs mono text-muted">
          paso {Math.min(step, total)}/{total}
        </span>
        <div className="h-1.5 w-32 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${(Math.min(step, total) / Math.max(total, 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
