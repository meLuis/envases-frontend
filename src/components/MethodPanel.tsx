import type { AlgoCard } from "@/data/catalog";

export function MethodPanel({ card }: { card: AlgoCard }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Algoritmo elegido (gana) */}
      <div className="rounded-xl border border-accent-2/40 bg-accent-2/5 p-4">
        <span className="text-[10px] mono text-accent-2 border border-accent-2/40 rounded-full px-2 py-0.5">
          ALGORITMO ELEGIDO
        </span>
        <h4 className="mt-3 font-semibold">{card.investigated.name}</h4>
        <div className="mt-2">
          <ComplexityPair time={card.investigated.time} space={card.investigated.space} />
        </div>
        <p className="mt-2 text-sm text-muted leading-relaxed">{card.investigated.idea}</p>
      </div>

      {/* Solución ingenua (pudo ser pero pierde) */}
      {card.baseline ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] mono text-muted border border-border rounded-full px-2 py-0.5">
            SOLUCIÓN INGENUA
          </span>
          <h4 className="mt-3 font-semibold text-muted">{card.baseline.name}</h4>
          <div className="mt-2">
            <ComplexityPair time={card.baseline.time} space={card.baseline.space} tone="neutral" />
          </div>
          <p className="mt-2 text-sm text-muted leading-relaxed">{card.baseline.idea}</p>
          <div className="mt-3 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2">
            <span className="text-[10px] mono text-warn">POR QUÉ NO BASTA</span>
            <p className="mt-1 text-sm text-foreground/90 leading-relaxed">
              {card.baseline.whyWorse}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 p-4 grid place-items-center text-center">
          <p className="text-sm text-muted">
            Este algoritmo no tiene una alternativa clásica equivalente para comparar.
          </p>
        </div>
      )}
    </div>
  );
}

/** Par de etiquetas de complejidad: tiempo + espacio. */
export function ComplexityPair({
  time,
  space,
  tone = "good",
}: {
  time: string;
  space: string;
  tone?: "good" | "neutral";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <ComplexityTag label="tiempo" value={time} tone={tone} />
      <ComplexityTag label="espacio" value={space} tone="neutral" />
    </div>
  );
}

export function ComplexityTag({
  value,
  label,
  tone = "neutral",
}: {
  value: string;
  label?: string;
  tone?: "good" | "neutral" | "bad";
}) {
  const cls =
    tone === "good"
      ? "text-accent-2 border-accent-2/40 bg-accent-2/10"
      : tone === "bad"
        ? "text-danger border-danger/40 bg-danger/10"
        : "text-muted border-border bg-surface-2";
  return (
    <span className={`inline-flex items-center gap-1 text-xs mono px-2 py-0.5 rounded-md border ${cls}`}>
      {label && <span className="opacity-60">{label}</span>}
      {value}
    </span>
  );
}
