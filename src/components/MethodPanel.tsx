import type { AlgoCard } from "@/data/catalog";

export function MethodPanel({ card }: { card: AlgoCard }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Investigado (gana) */}
      <div className="rounded-xl border border-accent-2/40 bg-accent-2/5 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] mono text-accent-2 border border-accent-2/40 rounded-full px-2 py-0.5">
            ALGORITMO ELEGIDO
          </span>
          <ComplexityTag value={card.investigated.bigO} tone="good" />
        </div>
        <h4 className="mt-3 font-semibold">{card.investigated.name}</h4>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          {card.investigated.idea}
        </p>
        {card.investigated.reference && (
          <p className="mt-2 text-[11px] text-muted italic">
            Ref: {card.investigated.reference}
          </p>
        )}
      </div>

      {/* Baseline (pudo ser pero perdió) */}
      {card.baseline ? (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] mono text-muted border border-border rounded-full px-2 py-0.5">
              SOLUCIÓN INGENUA
            </span>
            <ComplexityTag value={card.baseline.bigO} tone="neutral" />
          </div>
          <h4 className="mt-3 font-semibold text-muted">{card.baseline.name}</h4>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            {card.baseline.idea}
          </p>
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
            Sin baseline directo: este algoritmo responde una pregunta que el
            curso no resolvía con una alternativa clásica equivalente.
          </p>
        </div>
      )}
    </div>
  );
}

export function ComplexityTag({
  value,
  tone = "neutral",
}: {
  value: string;
  tone?: "good" | "neutral" | "bad";
}) {
  const cls =
    tone === "good"
      ? "text-accent-2 border-accent-2/40 bg-accent-2/10"
      : tone === "bad"
        ? "text-danger border-danger/40 bg-danger/10"
        : "text-muted border-border bg-surface-2";
  return (
    <span className={`text-xs mono px-2 py-0.5 rounded-md border ${cls}`}>
      {value}
    </span>
  );
}
