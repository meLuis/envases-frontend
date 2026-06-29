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
      {/* CS-first: lidera el método + Big-O; la pregunta de negocio es el ejemplo */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight group-hover:text-accent transition">
          {card.investigated.name}
        </h3>
        <ComplexityTag value={card.investigated.bigO} tone="good" />
      </div>
      <p className="mt-2 text-sm text-muted leading-relaxed flex-1">
        <span className="text-muted/60">Ej:</span> {card.businessQuestion}
      </p>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <span className="text-muted mono">{GRAPH_LABELS[card.graph]}</span>
        {card.animation === "traversal" && (
          <span className="text-accent-2 mono">▶ animado</span>
        )}
      </div>
    </Link>
  );
}
