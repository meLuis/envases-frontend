import type {
  ArtifactInfo,
  BudgetItem,
  DatasetListItem,
  DatasetSummary,
  GraphSummary,
  QueryResponse,
} from "./types";

export const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`GET ${path} → ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`POST ${path} → ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// --- Datasets -------------------------------------------------------------

export function listDatasets() {
  return getJSON<{ datasets: DatasetListItem[]; count: number }>("/datasets");
}

export function getDataset(id: string) {
  return getJSON<DatasetSummary>(`/datasets/${id}`);
}

export async function createDataset(files: {
  productos: File;
  ventas: File;
  compras: File;
}): Promise<DatasetSummary> {
  const form = new FormData();
  form.append("productos", files.productos);
  form.append("ventas", files.ventas);
  form.append("compras", files.compras);
  const res = await fetch(`${API_BASE}/datasets`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`POST /datasets → ${res.status}: ${detail}`);
  }
  return res.json() as Promise<DatasetSummary>;
}

// --- Grafos y artefactos --------------------------------------------------

export function getGraphSummary(id: string) {
  return getJSON<GraphSummary>(`/datasets/${id}/graph/summary`);
}

export function listArtifacts(id: string) {
  return getJSON<{ dataset_id: string; artifacts: ArtifactInfo[] }>(
    `/datasets/${id}/artifacts`,
  );
}

export function artifactUrl(id: string, name: string) {
  return `${API_BASE}/datasets/${id}/artifacts/${name}`;
}

/** Descarga el CSV crudo de un artefacto (para Cytoscape / animación). */
export async function fetchArtifactText(id: string, name: string): Promise<string> {
  const res = await fetch(artifactUrl(id, name), { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar el artefacto ${name}`);
  return res.text();
}

// --- Consultas (los 14 endpoints de algoritmos) ---------------------------

export function searchProducts(id: string, q: string, limit = 10) {
  return getJSON<QueryResponse>(
    `/datasets/${id}/products/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
}

export function clientToSupplier(id: string, client: string, supplier: string) {
  return getJSON<QueryResponse>(
    `/datasets/${id}/paths/client-to-supplier?client=${encodeURIComponent(
      client,
    )}&supplier=${encodeURIComponent(supplier)}`,
  );
}

export function weightedPath(id: string, source: string, target: string) {
  return getJSON<QueryResponse>(
    `/datasets/${id}/paths/weighted?source=${encodeURIComponent(
      source,
    )}&target=${encodeURIComponent(target)}`,
  );
}

export function productSubstitutes(id: string, productId: string) {
  return getJSON<QueryResponse>(
    `/datasets/${id}/products/${productId}/substitutes`,
  );
}

export function offersBestSavings(id: string, limit = 20) {
  return getJSON<QueryResponse>(`/datasets/${id}/offers/best-savings?limit=${limit}`);
}

export function crossSell(id: string, productId: string, limit = 10) {
  return getJSON<QueryResponse>(
    `/datasets/${id}/products/${productId}/cross-sell?limit=${limit}`,
  );
}

export function coOccurrence(
  id: string,
  productId: string,
  graphType: "sales" | "purchases" = "sales",
  limit = 15,
) {
  return getJSON<QueryResponse>(
    `/datasets/${id}/products/${productId}/co-occurrence?graph_type=${graphType}&limit=${limit}`,
  );
}

export function optimizeBudget(id: string, budget: number, items: BudgetItem[]) {
  return postJSON<QueryResponse>(`/datasets/${id}/budget/optimize`, {
    budget,
    items,
  });
}
