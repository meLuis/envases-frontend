import Link from "next/link";
import type { AlgoCard } from "@/data/catalog";
import { ComplexityPair } from "./MethodPanel";

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
      <h3 className="text-lg font-semibold leading-tight group-hover:text-accent transition">
        {card.businessQuestion}
      </h3>
      <p className="mt-2 text-sm text-muted leading-relaxed flex-1">
        <span className="text-muted/60">Algoritmo:</span>{" "}
        <span className="text-foreground">{card.investigated.name}</span>
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <ComplexityPair time={card.investigated.time} space={card.investigated.space} />
        <span className="text-xs font-medium text-accent group-hover:underline shrink-0">
          Abrir →
        </span>
      </div>
    </Link>
  );
}
