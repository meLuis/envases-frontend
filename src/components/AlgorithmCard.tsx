import Link from "next/link";
import type { AlgoCard } from "@/data/catalog";
import { GRAPH_LABELS } from "@/data/catalog";
import { ComplexityTag } from "./MethodPanel";

export function AlgorithmCard({
  card,
  datasetId,
}: {
  card: AlgoCard;
  datasetId: string;
}) {
  return (
    <Link
      href={`/dataset/${datasetId}/algo/${card.slug}`}
      className="group rounded-xl border border-border bg-surface p-4 flex flex-col hover:border-accent/50 transition"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] mono text-muted">
        <span>{GRAPH_LABELS[card.graph]}</span>
        {card.animation === "traversal" && (
          <span className="text-accent-2">recorrido animado</span>
        )}
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-tight group-hover:text-accent transition">
        {card.businessQuestion}
      </h3>
      <p className="mt-2 text-sm text-muted leading-relaxed flex-1">
        <span className="text-muted/60">Algoritmo:</span>{" "}
        <span className="text-foreground">{card.investigated.name}</span>
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <ComplexityTag value={card.investigated.bigO} tone="good" />
        <span className="text-xs font-medium text-accent group-hover:underline">
          Ejecutar clase →
        </span>
      </div>
    </Link>
  );
}
