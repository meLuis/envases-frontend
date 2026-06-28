import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <p className="text-accent-2 text-sm font-medium mono">
          CURSO · COMPLEJIDAD ALGORÍTMICA
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight">
          Algoritmos sobre grafos comerciales,{" "}
          <span className="text-accent">en vivo</span>.
        </h1>
        <p className="mt-5 text-muted text-lg leading-relaxed">
          Sube los datos reales de una empresa de envases y mira cómo distintos
          algoritmos —BFS, Dijkstra, Bellman-Ford, flujo de costo mínimo— recorren
          la estructura de datos para responder preguntas del negocio. Cada tarjeta
          muestra su <span className="text-foreground">complejidad Big-O</span>, el{" "}
          <span className="text-foreground">baseline que pudo ser pero perdió</span>{" "}
          y el resultado calculado por el servidor.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/upload"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-[#0b1020] hover:brightness-110 transition"
          >
            Empezar → subir datos
          </Link>
          <a
            href={`${API}/docs`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-border px-6 py-3 font-medium text-muted hover:text-foreground transition"
          >
            Ver la API
          </a>
        </div>
      </section>

      {/* Canales */}
      <section className="mt-16">
        <h2 className="text-sm font-medium text-muted mono">
          UN SOLO BACKEND · CUATRO FORMAS DE CONSUMIRLO
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ChannelCard
            tag="ACTIVO"
            tagColor="accent-2"
            title="Aplicación Web"
            desc="Esta plataforma: galería didáctica de algoritmos + explorador libre, con visualización animada del grafo. Pensada para la exposición en clase."
            actionLabel="Entrar a la web app"
            href="/upload"
          />
          <ChannelCard
            tag="ACTIVO"
            tagColor="accent-2"
            title="API REST / Swagger"
            desc="El mismo cálculo expuesto como endpoints JSON. Útil para integrar, automatizar o inspeccionar el contrato de cada algoritmo."
            actionLabel="Abrir Swagger"
            href={`${API}/docs`}
            external
          />
          <ChannelCard
            tag="PRÓXIMAMENTE"
            tagColor="warn"
            title="App de Escritorio"
            desc="Empaquetado nativo (Electron) para correr la misma experiencia sin navegador. Consume exactamente el mismo backend."
          />
          <ChannelCard
            tag="PRÓXIMAMENTE"
            tagColor="warn"
            title="Shell / Docker"
            desc="Para terminal y despliegue reproducible. El backend se levanta en contenedor y se consulta con curl."
          >
            <CommandBlock
              lines={[
                `curl ${API}/datasets`,
                `docker run -p 8000:8000 envases-api`,
              ]}
            />
          </ChannelCard>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        <Step
          n={1}
          title="Sube 3 archivos"
          desc="Productos, ventas y compras. El backend limpia, normaliza y construye 5 grafos."
        />
        <Step
          n={2}
          title="Explora la galería"
          desc="Cada tarjeta = una pregunta del negocio resuelta por un algoritmo, con su Big-O."
        />
        <Step
          n={3}
          title="Ejecuta y compáralo"
          desc="Mira el algoritmo recorrer el grafo y contrástalo con el baseline que descartamos."
        />
      </section>
    </div>
  );
}

function ChannelCard({
  tag,
  tagColor,
  title,
  desc,
  actionLabel,
  href,
  external,
  children,
}: {
  tag: string;
  tagColor: "accent-2" | "warn";
  title: string;
  desc: string;
  actionLabel?: string;
  href?: string;
  external?: boolean;
  children?: React.ReactNode;
}) {
  const tagClass =
    tagColor === "accent-2"
      ? "text-accent-2 border-accent-2/40 bg-accent-2/10"
      : "text-warn border-warn/40 bg-warn/10";
  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">{title}</h3>
        <span className={`text-[10px] mono px-2 py-0.5 rounded-full border ${tagClass}`}>
          {tag}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted leading-relaxed flex-1">{desc}</p>
      {children}
      {actionLabel && href ? (
        external ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            {actionLabel} →
          </a>
        ) : (
          <Link
            href={href}
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            {actionLabel} →
          </Link>
        )
      ) : null}
    </div>
  );
}

function CommandBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="mt-3 rounded-lg border border-border bg-[#0b1020] p-3 text-xs mono text-accent-2 overflow-x-auto">
      {lines.map((l, i) => (
        <div key={i}>
          <span className="text-muted select-none">$ </span>
          {l}
        </div>
      ))}
    </pre>
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
