// Contrato del backend (app/domain/schemas.py)

export interface ArtifactStatus {
  name: string;
  kind: string;
  generated: boolean;
  reason?: string | null;
}

export interface DatasetSummary {
  dataset_id: string;
  status: string;
  row_counts: Record<string, number>;
  generated: ArtifactStatus[];
  omitted: ArtifactStatus[];
  warnings: string[];
}

export interface QueryResponse {
  ok: boolean;
  answer: string;
  algorithm: string;
  table: Record<string, unknown>[];
  metrics: Record<string, unknown>;
  evidence: Record<string, unknown>;
  warnings: string[];
  error?: string | null;
}

export interface DatasetListItem {
  dataset_id: string;
  size_bytes: number;
}

export interface GraphSummary {
  dataset_id: string;
  by_graph: Record<string, { nodes: number; edges: number; available?: boolean }>;
  node_type_breakdown: Record<string, number>;
  total_unique_nodes: number;
}

export interface ArtifactInfo {
  name: string;
  size_bytes: number;
  download_url: string;
}

export interface BudgetItem {
  product_id: string;
  quantity?: number;
  value?: number | null;
}

export interface PurchaseItem {
  product_id: string;
  quantity: number;
}
