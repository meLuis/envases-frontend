import type { QueryResponse } from "./types";
import * as api from "./apiClient";

type Vals = Record<string, string>;
type Runner = (datasetId: string, v: Vals) => Promise<QueryResponse>;

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v !== "" && v !== undefined ? n : fallback;
}

function graphType(v: string | undefined): "sales" | "purchases" {
  return v === "purchases" ? "purchases" : "sales";
}

export const RUNNERS: Record<string, Runner> = {
  "buscar-producto": (id, v) =>
    api.searchProducts(id, v.q ?? "", num(v.limit, 10)),

  "camino-cliente-proveedor": (id, v) =>
    api.clientToSupplier(id, v.client ?? "", v.supplier ?? ""),

  "camino-ponderado": (id, v) =>
    api.weightedPath(id, v.source ?? "", v.target ?? ""),

  sustitutos: (id, v) => api.productSubstitutes(id, v.productId ?? ""),

  presupuesto: (id, v) => {
    const items = (v.productIds ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((product_id) => ({ product_id, quantity: 1 }));
    return api.optimizeBudget(id, num(v.budget, 5000), items);
  },

  ofertas: (id, v) => api.offersBestSavings(id, num(v.limit, 20)),

  "venta-cruzada": (id, v) =>
    api.crossSell(id, v.productId ?? "", num(v.limit, 10)),

  "co-ocurrencia": (id, v) =>
    api.coOccurrence(id, v.productId ?? "", graphType(v.graphType), num(v.limit, 15)),
};
