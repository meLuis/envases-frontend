import type { LoadedGraph } from "./graphData";

export interface AnimTrace {
  /** Nodos en el orden en que el algoritmo los descubre. */
  steps: string[];
  /** Lado de descubrimiento (para BFS bidireccional). */
  side: Record<string, "a" | "b">;
  /** Nivel/profundidad de cada nodo (para layout y reveal por capas). */
  level: Record<string, number>;
  /** Camino final a resaltar (si aplica). */
  path: string[];
  /** Expansiones reales del algoritmo investigado. */
  expanded: number;
  /** Expansiones reales del baseline (para el ratio didáctico). */
  baselineExpanded?: number;
  note?: string;
}

function neighbors(g: LoadedGraph, n: string): string[] {
  return (g.adj.get(n) ?? []).map((e) => e.to);
}

/** BFS clásico (baseline): cuenta cuántos nodos expande hasta hallar el goal. */
export function bfsExpanded(g: LoadedGraph, start: string, goal: string): number {
  if (start === goal) return 1;
  const seen = new Set([start]);
  const queue = [start];
  let expanded = 0;
  while (queue.length) {
    const node = queue.shift()!;
    expanded++;
    if (node === goal) return expanded;
    for (const nb of neighbors(g, node)) {
      if (!seen.has(nb)) {
        seen.add(nb);
        queue.push(nb);
      }
    }
  }
  return expanded;
}

/** BFS bidireccional instrumentado (algoritmo investigado). */
export function bidirectionalBfsTrace(
  g: LoadedGraph,
  start: string,
  goal: string,
): AnimTrace {
  const steps: string[] = [];
  const side: Record<string, "a" | "b"> = {};
  const level: Record<string, number> = {};

  if (!g.adj.has(start) || !g.adj.has(goal)) {
    return { steps, side, level, path: [], expanded: 0, note: "Origen o destino fuera del grafo" };
  }

  const parentA = new Map<string, string | null>([[start, null]]);
  const parentB = new Map<string, string | null>([[goal, null]]);
  const frontA = [start];
  const frontB = [goal];
  side[start] = "a";
  side[goal] = "b";
  level[start] = 0;
  level[goal] = 0;
  steps.push(start, goal);
  let expanded = 0;
  let meet: string | null = null;

  function expand(
    front: string[],
    parents: Map<string, string | null>,
    other: Map<string, string | null>,
    tag: "a" | "b",
    depth: number,
  ): string | null {
    const next: string[] = [];
    for (const node of front) {
      expanded++;
      for (const nb of neighbors(g, node)) {
        if (parents.has(nb)) continue;
        parents.set(nb, node);
        if (!(nb in side)) {
          side[nb] = tag;
          level[nb] = depth;
          steps.push(nb);
        }
        if (other.has(nb)) return nb;
        next.push(nb);
      }
    }
    front.length = 0;
    front.push(...next);
    return null;
  }

  let depth = 1;
  while (frontA.length && frontB.length && !meet) {
    if (frontA.length <= frontB.length) {
      meet = expand(frontA, parentA, parentB, "a", depth);
    } else {
      meet = expand(frontB, parentB, parentA, "b", depth);
    }
    depth++;
  }

  let path: string[] = [];
  if (meet) {
    const left: string[] = [];
    let n: string | null | undefined = meet;
    while (n != null) {
      left.push(n);
      n = parentA.get(n) ?? null;
    }
    left.reverse();
    const right: string[] = [];
    n = parentB.get(meet) ?? null;
    while (n != null) {
      right.push(n);
      n = parentB.get(n) ?? null;
    }
    path = [...left, ...right];
  }

  return {
    steps,
    side,
    level,
    path,
    expanded,
    baselineExpanded: bfsExpanded(g, start, goal),
  };
}

/** Dijkstra de máximo peso (amount) instrumentado, orden de extracción. */
export function dijkstraMaxTrace(
  g: LoadedGraph,
  start: string,
  goal: string,
): AnimTrace {
  const steps: string[] = [];
  const side: Record<string, "a" | "b"> = {};
  const level: Record<string, number> = {};
  if (!g.adj.has(start) || !g.adj.has(goal)) {
    return { steps, side, level, path: [], expanded: 0, note: "Origen o destino fuera del grafo" };
  }
  const best = new Map<string, number>([[start, 0]]);
  const parent = new Map<string, string | null>([[start, null]]);
  const settled = new Set<string>();
  // cola simple (n pequeño tras inducir): extrae el de mayor acumulado
  const pq: { node: string; cost: number }[] = [{ node: start, cost: 0 }];
  let expanded = 0;
  let depth = 0;

  while (pq.length) {
    pq.sort((x, y) => y.cost - x.cost);
    const { node } = pq.shift()!;
    if (settled.has(node)) continue;
    settled.add(node);
    expanded++;
    side[node] = "a";
    level[node] = depth++;
    steps.push(node);
    if (node === goal) break;
    for (const e of g.adj.get(node) ?? []) {
      const cand = (best.get(node) ?? 0) + e.amount;
      if (cand > (best.get(e.to) ?? -Infinity)) {
        best.set(e.to, cand);
        parent.set(e.to, node);
        pq.push({ node: e.to, cost: cand });
      }
    }
  }

  const path: string[] = [];
  if (settled.has(goal)) {
    let n: string | null | undefined = goal;
    while (n != null) {
      path.push(n);
      n = parent.get(n) ?? null;
    }
    path.reverse();
  }
  return { steps, side, level, path, expanded };
}

/**
 * Reveal por capas desde semillas hasta maxDepth (BFS multi-fuente).
 * keepAtMaxDepth limita la última capa a un conjunto objetivo (resultado del API)
 * para mantener el lienzo legible.
 */
export function revealTrace(
  g: LoadedGraph,
  seeds: string[],
  maxDepth: number,
  keepAtMaxDepth?: Set<string>,
): AnimTrace {
  const steps: string[] = [];
  const side: Record<string, "a" | "b"> = {};
  const level: Record<string, number> = {};
  const seen = new Set<string>();
  let frontier = seeds.filter((s) => g.adj.has(s));
  for (const s of seeds) {
    seen.add(s);
    side[s] = "a";
    level[s] = 0;
    steps.push(s);
  }
  let depth = 0;
  while (frontier.length && depth < maxDepth) {
    depth++;
    const next: string[] = [];
    for (const node of frontier) {
      for (const nb of neighbors(g, node)) {
        if (seen.has(nb)) continue;
        if (depth === maxDepth && keepAtMaxDepth && !keepAtMaxDepth.has(nb)) {
          continue;
        }
        seen.add(nb);
        side[nb] = depth === maxDepth ? "b" : "a";
        level[nb] = depth;
        steps.push(nb);
        next.push(nb);
      }
    }
    frontier = next;
  }
  return { steps, side, level, path: [], expanded: steps.length };
}

/** Induce el subgrafo entre los nodos involucrados, con tope de legibilidad. */
export function buildSubgraph(
  g: LoadedGraph,
  involved: string[],
  path: string[],
  maxNodes = 60,
  maxEdges = 160,
): { nodes: string[]; edges: [string, string][] } {
  // Prioriza nodos del camino, luego los primeros descubiertos.
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const n of path) {
    if (!seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  }
  for (const n of involved) {
    if (ordered.length >= maxNodes) break;
    if (!seen.has(n)) {
      seen.add(n);
      ordered.push(n);
    }
  }
  const nodeSet = new Set(ordered);
  const edges: [string, string][] = [];
  const edgeSeen = new Set<string>();
  for (const n of ordered) {
    for (const e of g.adj.get(n) ?? []) {
      if (!nodeSet.has(e.to)) continue;
      const key = n < e.to ? `${n}|${e.to}` : `${e.to}|${n}`;
      if (edgeSeen.has(key)) continue;
      edgeSeen.add(key);
      edges.push([n, e.to]);
      if (edges.length >= maxEdges) break;
    }
    if (edges.length >= maxEdges) break;
  }
  return { nodes: ordered, edges };
}
