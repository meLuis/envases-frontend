import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      {/* Hero */}
      <section className="text-center">
        <p className="text-accent-2 text-sm font-medium mono">
          CURSO DE COMPLEJIDAD ALGORÍTMICA
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">
          Del CSV al grafo, del grafo al algoritmo.
        </h1>
        <p className="mt-5 text-muted text-lg leading-relaxed max-w-2xl mx-auto">
          Sube datos de una empresa de envases, mira cómo se convierten en un
          grafo y ejecuta algoritmos clásicos —BFS, Dijkstra, Bellman-Ford,
          Knapsack, Union-Find— paso a paso. Para cada uno ves su{" "}
          <span className="text-foreground">complejidad de tiempo y espacio</span>.
        </p>
        <div className="mt-8">
          <Link
            href="/upload"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-[#0b1020] hover:brightness-110 transition"
          >
            Empezar → subir datos
          </Link>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mt-16 grid gap-4 sm:grid-cols-4">
        <Step
          n={1}
          title="Sube datos"
          desc="Productos, ventas y compras. El backend limpia el esquema."
        />
        <Step
          n={2}
          title="Mira el mapa"
          desc="Los CSV se convierten en un grafo con nodos y aristas."
        />
        <Step
          n={3}
          title="Elige una pregunta"
          desc="Cada caso usa un algoritmo distinto."
        />
        <Step
          n={4}
          title="Ejecuta paso a paso"
          desc="Observa el recorrido y la complejidad del algoritmo."
        />
      </section>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface/50 p-5">
      <div className="h-8 w-8 rounded-full bg-accent/15 text-accent grid place-items-center font-bold mono">
        {n}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted leading-relaxed">{desc}</p>
    </div>
  );
}
