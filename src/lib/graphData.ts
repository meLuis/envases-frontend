import { fetchArtifactText } from "./apiClient";
import { parseCSV } from "./csv";

export interface GraphEdge {
  to: string;
  weight: number;
  amount: number;
  edgeType: string;
}

export interface LoadedGraph {
  /** node_id → adyacencia (no dirigida, como _adjacency del backend). */
  adj: Map<string, GraphEdge[]>;
  /** node_id → etiqueta legible. */
  labels: Map<string, string>;
  edgeCount: number;
}

const cache = new Map<string, Promise<LoadedGraph>>();

/** Mapea cada grafo a sus artefactos de nodos/aristas. */
export const GRAPH_ARTIFACTS: Record<
  string,
  { nodes: string; edges: string }
> = {
  G_attr: {
    nodes: "semantic_attribute_graph_nodes.csv",
    edges: "semantic_attribute_graph_edges.csv",
  },
  G_business: {
    nodes: "transaction_graph_business_nodes.csv",
    edges: "transaction_graph_business_edges.csv",
  },
  G_sales: {
    nodes: "transaction_graph_sales_nodes.csv",
    edges: "transaction_graph_sales_edges.csv",
  },
  G_purchases: {
    nodes: "transaction_graph_purchases_nodes.csv",
    edges: "transaction_graph_purchases_edges.csv",
  },
};

export function loadGraph(datasetId: string, graphKey: string): Promise<LoadedGraph> {
  const key = `${datasetId}:${graphKey}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const artifacts = GRAPH_ARTIFACTS[graphKey];
  if (!artifacts) {
    return Promise.reject(new Error(`Grafo ${graphKey} sin artefactos para visualizar`));
  }

  const promise = (async () => {
    const [nodesText, edgesText] = await Promise.all([
      fetchArtifactText(datasetId, artifacts.nodes).catch(() => ""),
      fetchArtifactText(datasetId, artifacts.edges),
    ]);

    const labels = new Map<string, string>();
    if (nodesText) {
      for (const r of parseCSV(nodesText)) {
        if (r.node_id) labels.set(r.node_id, r.label || r.node_id);
      }
    }

    const adj = new Map<string, GraphEdge[]>();
    let edgeCount = 0;
    const add = (from: string, to: string, weight: number, amount: number, et: string) => {
      let list = adj.get(from);
      if (!list) {
        list = [];
        adj.set(from, list);
      }
      list.push({ to, weight, amount, edgeType: et });
    };

    for (const r of parseCSV(edgesText)) {
      const s = r.source;
      const t = r.target;
      if (!s || !t) continue;
      const w = Number(r.weight) || 0;
      const a = Number(r.amount) || 0;
      const et = r.edge_type || "";
      add(s, t, w, a, et); // no dirigido
      add(t, s, w, a, et);
      edgeCount++;
      if (!labels.has(s)) labels.set(s, s);
      if (!labels.has(t)) labels.set(t, t);
    }

    return { adj, labels, edgeCount };
  })();

  cache.set(key, promise);
  return promise;
}

/** Etiqueta corta para mostrar en el nodo (recorta prefijos largos). */
export function shortLabel(nodeId: string, labels: Map<string, string>): string {
  const raw = labels.get(nodeId) ?? nodeId;
  const trimmed = raw.length > 22 ? raw.slice(0, 21) + "…" : raw;
  return trimmed;
}

/** Tipo de nodo a partir del prefijo del id (CLIENT:, PRODUCT:, ...). */
export function nodeType(nodeId: string): string {
  const idx = nodeId.indexOf(":");
  if (idx === -1) return "OTHER";
  const prefix = nodeId.slice(0, idx);
  if (prefix.endsWith("_DOC")) return "DOCUMENT";
  return prefix;
}

// Color por tipo de entidad. Valores hex (Cytoscape no resuelve var(--x));
// reflejan los tokens --node-* de globals.css. Fuente única para el lienzo,
// el riel narrador y las leyendas.
//
// G_attr ahora es un grafo EN CAPAS: cada dimensión del producto (TYPE, COLOR,
// CAPACITY…) es su propio node_type con su propio color. Los hex coinciden con
// el visualizador estático del backend para que imágenes y lienzo se lean igual.
export const NODE_TYPE_COLOR: Record<string, string> = {
  PRODUCT: "#6ea8fe",
  // Capas semánticas de G_attr
  TYPE: "#3b82f6",
  SUBTYPE: "#94a3b8",
  ACCESSORY: "#14b8a6",
  SHAPE: "#ec4899",
  FEATURE: "#eab308",
  MATERIAL: "#f97316",
  COLOR: "#22c55e",
  CAPACITY: "#a855f7",
  MOUTH_SIZE: "#ef4444",
  // Compatibilidad con datasets antiguos (nodo atributo genérico)
  ATTRIBUTE: "#7ef0c4",
  // Grafos transaccionales
  DOCUMENT: "#ffcf6e",
  CLIENT: "#c08bff",
  SUPPLIER: "#ff7a8a",
  OTHER: "#94a3c4",
};

// Las 9 capas semánticas de G_attr (atributos de producto). Un nodo es
// "atributo" si su node_type es una de estas capas (o el genérico ATTRIBUTE).
export const ATTRIBUTE_LAYERS = [
  "TYPE",
  "SUBTYPE",
  "ACCESSORY",
  "SHAPE",
  "FEATURE",
  "MATERIAL",
  "COLOR",
  "CAPACITY",
  "MOUTH_SIZE",
] as const;

const ATTRIBUTE_TYPE_SET = new Set<string>([...ATTRIBUTE_LAYERS, "ATTRIBUTE"]);

/** ¿El nodo es un atributo de producto (cualquier capa de G_attr)? */
export function isAttributeNode(nodeId: string): boolean {
  return ATTRIBUTE_TYPE_SET.has(nodeType(nodeId));
}
