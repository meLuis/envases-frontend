// Catálogo didáctico para el curso de Complejidad Algorítmica.
// Cada tarjeta empareja una pregunta con el algoritmo que la resuelve y, cuando
// aplica, la solución ingenua que "pudo ser pero pierde". Para cada uno se
// declara complejidad de TIEMPO y de ESPACIO (lo esencial para el examen).

export type GraphKey =
  | "G_attr"
  | "G_business"
  | "G_sales"
  | "G_purchases"
  | "G_projection"
  | "G_offers"
  | "flow";

// Tipo de visual paso a paso de cada algoritmo.
//  - traversal: recorrido sobre el grafo (BFS, Dijkstra…)
//  - knapsack:  tabla de programación dinámica
//  - bellman:   relajación de aristas por rondas
//  - unionfind: fusión de familias (componentes conexos)
export type AnimationKind = "traversal" | "knapsack" | "bellman" | "unionfind";

export type FieldType = "text" | "number" | "select";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  default?: string;
  options?: { value: string; label: string }[];
  help?: string;
}

export interface AlgoMethod {
  name: string;
  /** Complejidad de tiempo (Big-O). */
  time: string;
  /** Complejidad de espacio (Big-O). */
  space: string;
  idea: string;
}

export interface AlgoCard {
  slug: string;
  title: string;
  businessQuestion: string;
  graph: GraphKey;
  group: "busqueda" | "caminos" | "optimizacion" | "documentos";
  investigated: AlgoMethod;
  baseline?: AlgoMethod & { whyWorse: string };
  animation: AnimationKind;
  inputs: FormField[];
}

const SALES_PURCHASES_SELECT: FormField = {
  name: "graphType",
  label: "Grafo",
  type: "select",
  default: "sales",
  options: [
    { value: "sales", label: "Ventas (G_sales)" },
    { value: "purchases", label: "Compras (G_purchases)" },
  ],
};

export const CATALOG: AlgoCard[] = [
  // --- Búsqueda y similitud --------------------------------------------
  {
    slug: "buscar-producto",
    title: "Buscador de producto",
    businessQuestion: "¿Qué producto está buscando el usuario?",
    graph: "G_attr",
    group: "busqueda",
    animation: "traversal",
    investigated: {
      name: "BFS multi-semilla sobre G_attr",
      time: "O(V + E)",
      space: "O(V)",
      idea: "G_attr conecta cada producto con sus atributos (tipo, material, color, capacidad…). La consulta activa esos atributos como semillas y un BFS por capas reúne los productos que tocan todos los conceptos buscados.",
    },
    baseline: {
      name: "Escaneo textual lineal",
      time: "O(n · m)",
      space: "O(1)",
      idea: "Recorrer los n nombres de producto comparando texto contra la consulta de largo m.",
      whyWorse:
        "Revisa todo el catálogo sin aprovechar que 'ámbar' o 'vidrio' son atributos compartidos. El grafo salta directo a los vecinos relevantes.",
    },
    inputs: [
      {
        name: "q",
        label: "Consulta",
        type: "text",
        placeholder: "frasco gotero ambar",
        help: "Términos de atributo o nombre.",
      },
      { name: "limit", label: "Resultados", type: "number", default: "10" },
    ],
  },
  {
    slug: "sustitutos",
    title: "Sustitutos de un producto",
    businessQuestion: "Si falta un producto, ¿qué otro lo reemplaza?",
    graph: "G_projection",
    group: "busqueda",
    animation: "unionfind",
    investigated: {
      name: "Union-Find (UFDS) + similitud",
      time: "O(α(n))",
      space: "O(n)",
      idea: "Union-Find agrupa los productos en familias (componentes conexos); dentro de la familia se ordenan los vecinos por similitud de atributos (Jaccard).",
    },
    baseline: {
      name: "Recorrer todo el grafo por consulta",
      time: "O(V · E)",
      space: "O(V)",
      idea: "Para cada producto, recorrer el grafo entero buscando sus conexos.",
      whyWorse:
        "Union-Find responde '¿misma familia?' en tiempo casi constante tras un preproceso lineal. Recalcular los conexos en cada consulta repite trabajo.",
    },
    inputs: [
      { name: "productId", label: "ID de producto", type: "text", placeholder: "5004" },
    ],
  },

  // --- Caminos en el grafo ---------------------------------------------
  {
    slug: "camino-cliente-proveedor",
    title: "Conexión cliente ↔ proveedor",
    businessQuestion: "¿Qué cadena conecta a un cliente con un proveedor?",
    graph: "G_business",
    group: "caminos",
    animation: "traversal",
    investigated: {
      name: "BFS bidireccional",
      time: "O(b^(d/2))",
      space: "O(b^(d/2))",
      idea: "Dos búsquedas avanzan a la vez desde el cliente y desde el proveedor; cuando se tocan, se arma el camino. Expandir siempre el frente más pequeño reduce el trabajo.",
    },
    baseline: {
      name: "BFS desde el origen",
      time: "O(b^d)",
      space: "O(b^d)",
      idea: "Un solo frente explora en anchura hasta llegar al destino.",
      whyWorse:
        "La frontera crece exponencialmente con la distancia. Buscar desde los dos lados a la vez la corta casi a la mitad (de b^d a b^(d/2)).",
    },
    inputs: [
      { name: "client", label: "Cliente", type: "text", placeholder: "ODONTOLOGIA" },
      { name: "supplier", label: "Proveedor", type: "text", placeholder: "ENVIPLAST" },
    ],
  },
  {
    slug: "camino-ponderado",
    title: "Conexión comercial más fuerte",
    businessQuestion:
      "¿Cuál es el camino de mayor volumen comercial entre dos entidades?",
    graph: "G_business",
    group: "caminos",
    animation: "traversal",
    investigated: {
      name: "Dijkstra ponderado por monto",
      time: "O((V + E) log V)",
      space: "O(V)",
      idea: "Con una cola de prioridad busca el camino que maximiza el monto transado entre origen y destino.",
    },
    baseline: {
      name: "BFS sin pesos",
      time: "O(V + E)",
      space: "O(V)",
      idea: "Encuentra el camino con menos saltos, ignorando el monto de cada arista.",
      whyWorse:
        "El camino más corto en saltos no es el de mayor volumen: dos entidades pueden estar a 2 saltos por S/5 o por S/50.000. Sin pesos no se distingue.",
    },
    inputs: [
      { name: "source", label: "Origen", type: "text", placeholder: "ODONTOLOGIA" },
      { name: "target", label: "Destino", type: "text", placeholder: "GENPLAST" },
    ],
  },

  // --- Documentos y co-compra ------------------------------------------
  {
    slug: "venta-cruzada",
    title: "Venta cruzada",
    businessQuestion: "Clientes que compraron X, ¿qué más compraron?",
    graph: "G_sales",
    group: "documentos",
    animation: "traversal",
    investigated: {
      name: "BFS de 2 saltos: producto → cliente → producto",
      time: "O(V + E)",
      space: "O(V)",
      idea: "Desde el producto se llega a sus clientes (salto 1) y desde ellos a los demás productos que compraron (salto 2), ordenados por clientes en común.",
    },
    inputs: [
      { name: "productId", label: "ID de producto", type: "text", placeholder: "5007" },
      { name: "limit", label: "Resultados", type: "number", default: "10" },
    ],
  },
  {
    slug: "co-ocurrencia",
    title: "Productos en la misma factura",
    businessQuestion: "¿Qué productos van juntos en el MISMO comprobante?",
    graph: "G_sales",
    group: "documentos",
    animation: "traversal",
    investigated: {
      name: "Market Basket vía nodos DOCUMENT",
      time: "O(E)",
      space: "O(V)",
      idea: "Usando los nodos DOCUMENT (cada comprobante real), lista los productos que comparten documento con el dado: co-compra en la misma operación.",
    },
    baseline: {
      name: "Co-ocurrencia por cliente",
      time: "O(V + E)",
      space: "O(V)",
      idea: "Contar productos que comparten cliente en cualquier momento.",
      whyWorse:
        "Compartir cliente no es comprar junto. El nodo DOCUMENT distingue 'lo pidió en la misma factura' de 'lo pidió alguna vez'.",
    },
    inputs: [
      { name: "productId", label: "ID de producto", type: "text", placeholder: "5007" },
      SALES_PURCHASES_SELECT,
      { name: "limit", label: "Resultados", type: "number", default: "15" },
    ],
  },

  // --- Optimización -----------------------------------------------------
  {
    slug: "presupuesto",
    title: "Presupuesto óptimo (mochila)",
    businessQuestion: "¿Cómo maximizar unidades dentro de un presupuesto?",
    graph: "flow",
    group: "optimizacion",
    animation: "knapsack",
    investigated: {
      name: "Knapsack 0/1 — Programación Dinámica",
      time: "O(n · W)",
      space: "O(n · W)",
      idea: "Una tabla decide, para cada producto y cada nivel de presupuesto, si conviene incluirlo. Garantiza el óptimo, no una aproximación.",
    },
    baseline: {
      name: "Greedy por ratio valor/costo",
      time: "O(n log n)",
      space: "O(n)",
      idea: "Ordenar por valor/costo y llenar hasta agotar el presupuesto.",
      whyWorse:
        "El greedy es rápido pero no garantiza el óptimo en la mochila 0/1: puede descartar una mejor combinación por elegir el mejor ratio local.",
    },
    inputs: [
      { name: "budget", label: "Presupuesto (S/)", type: "number", default: "5000" },
      {
        name: "productIds",
        label: "Productos (IDs separados por coma)",
        type: "text",
        placeholder: "5004,5007,5036",
        help: "Se pide 1 unidad de cada uno como demanda base.",
      },
    ],
  },
  {
    slug: "ofertas",
    title: "Mejores ahorros históricos",
    businessQuestion: "¿Dónde estuvo el mayor ahorro frente al costo típico?",
    graph: "G_offers",
    group: "optimizacion",
    animation: "bellman",
    investigated: {
      name: "Bellman-Ford",
      time: "O(V · E)",
      space: "O(V)",
      idea: "Relaja todas las aristas V−1 veces para encontrar el mejor ahorro (peso negativo = oportunidad) de cada producto frente a su costo típico.",
    },
    baseline: {
      name: "Dijkstra",
      time: "O((V + E) log V)",
      space: "O(V)",
      idea: "Camino mínimo con cola de prioridad, asumiendo pesos no negativos.",
      whyWorse:
        "Dijkstra es más rápido pero supone pesos ≥ 0. Aquí los 'ahorros' son aristas negativas, que Dijkstra no maneja; Bellman-Ford sí.",
    },
    inputs: [{ name: "limit", label: "Top N", type: "number", default: "20" }],
  },
];

export function cardBySlug(slug: string): AlgoCard | undefined {
  return CATALOG.find((c) => c.slug === slug);
}

export const GROUP_LABELS: Record<AlgoCard["group"], string> = {
  busqueda: "Búsqueda y similitud",
  caminos: "Caminos en el grafo",
  optimizacion: "Optimización",
  documentos: "Documentos y co-compra",
};

export const GRAPH_LABELS: Record<GraphKey, string> = {
  G_attr: "G_attr · producto↔atributo",
  G_business: "G_business · cliente/proveedor↔producto",
  G_sales: "G_sales · ventas + documentos",
  G_purchases: "G_purchases · compras + documentos",
  G_projection: "G_projection · producto↔producto",
  G_offers: "G_offers · red de ofertas",
  flow: "Red de flujo / tabla DP",
};
