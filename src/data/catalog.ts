// Catálogo didáctico: cada tarjeta empareja una pregunta de negocio con el
// algoritmo investigado que la resuelve en vivo y, cuando aplica, el baseline
// que "pudo ser pero perdió". Big-O y referencias curados desde
// TF-Final-independiente/docs/ALGORITMOS_EVOLUCION.md y el backend real.

export type GraphKey =
  | "G_attr"
  | "G_business"
  | "G_sales"
  | "G_purchases"
  | "G_projection"
  | "G_offers"
  | "flow";

export type AnimationKind = "traversal" | "structural";

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
  bigO: string;
  idea: string;
  reference?: string;
}

export interface AlgoCard {
  slug: string;
  title: string;
  businessQuestion: string;
  graph: GraphKey;
  group: "busqueda" | "caminos" | "optimizacion" | "documentos" | "riesgo";
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
  // --- Búsqueda ---------------------------------------------------------
  {
    slug: "buscar-producto",
    title: "Buscador semántico de producto",
    businessQuestion: "¿Qué producto está buscando el usuario?",
    graph: "G_attr",
    group: "busqueda",
    animation: "traversal",
    investigated: {
      name: "BFS multi-semilla sobre G_attr en capas",
      bigO: "O(V + E)",
      idea: "G_attr es un grafo en capas: cada dimensión del producto (tipo, material, color, capacidad, boca…) es un nodo propio. La consulta se resuelve contra esas capas (semillas), un BFS con decaimiento genera candidatos y el motor conserva solo la intersección estricta: el producto debe tocar todos los conceptos resueltos. Los atributos numéricos (100ML) son exactos: nunca aproximan a 120ML.",
    },
    baseline: {
      name: "Escaneo textual lineal",
      bigO: "O(n · m)",
      idea: "Recorrer los n nombres de producto comparando substring/similitud contra la consulta de longitud m.",
      whyWorse:
        "Ignora la estructura de atributos: no entiende que 'ámbar' y 'vidrio' son propiedades compartidas entre productos. El grafo permite saltar a vecinos relevantes en vez de revisar todo el catálogo.",
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

  // --- Caminos ----------------------------------------------------------
  {
    slug: "camino-cliente-proveedor",
    title: "Conexión cliente ↔ proveedor",
    businessQuestion: "¿Qué cadena conecta a un cliente con un proveedor?",
    graph: "G_business",
    group: "caminos",
    animation: "traversal",
    investigated: {
      name: "BFS bidireccional",
      bigO: "O(b^(d/2))",
      idea: "Dos frentes de búsqueda avanzan simultáneamente desde el cliente y desde el proveedor; cuando se encuentran, se reconstruye el camino. Expandir siempre la frontera más pequeña acota el frente.",
      reference: "Pohl, I. (1971), Bi-directional search, Machine Intelligence 6",
    },
    baseline: {
      name: "BFS desde el origen",
      bigO: "O(b^d)",
      idea: "Un único frente que explora en anchura hasta toparse con el destino.",
      whyWorse:
        "La frontera crece exponencialmente con la distancia d. Medición real (ODONTOLOGIA → ENVIPLAST): mismo camino óptimo de longitud 4, pero BFS expandió 8 nodos y el bidireccional solo 4 (ratio 2×, y crece con d).",
    },
    inputs: [
      {
        name: "client",
        label: "Cliente",
        type: "text",
        placeholder: "ODONTOLOGIA",
      },
      {
        name: "supplier",
        label: "Proveedor",
        type: "text",
        placeholder: "ENVIPLAST",
      },
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
      bigO: "O((V + E) log V)",
      idea: "Con una cola de prioridad se busca el camino que maximiza el monto transado (amount) entre origen y destino en G_business.",
      reference: "Dijkstra, E. W. (1959), Numerische Mathematik 1",
    },
    baseline: {
      name: "BFS sin pesos",
      bigO: "O(V + E)",
      idea: "Encuentra el camino con menos saltos, ignorando cuánto dinero representa cada arista.",
      whyWorse:
        "El camino más corto en saltos no es el comercialmente más relevante: dos entidades pueden estar a 2 saltos por una transacción de S/5 o por una de S/50.000. Sin pesos, no se distingue.",
    },
    inputs: [
      { name: "source", label: "Origen", type: "text", placeholder: "ODONTOLOGIA" },
      { name: "target", label: "Destino", type: "text", placeholder: "GENPLAST" },
    ],
  },

  // --- Sustitutos / familias -------------------------------------------
  {
    slug: "sustitutos",
    title: "Sustitutos de un producto",
    businessQuestion: "Si falta un producto, ¿qué otro lo reemplaza?",
    graph: "G_projection",
    group: "busqueda",
    animation: "structural",
    investigated: {
      name: "UFDS (Union-Find) + ranking por similitud",
      bigO: "O(α(n)) por operación",
      idea: "Union-Find agrupa productos en familias por componentes conexos de la proyección; dentro de la familia se rankean los vecinos por similitud (Jaccard de atributos).",
    },
    baseline: {
      name: "Recorrido total del grafo por consulta",
      bigO: "O(V · E)",
      idea: "Para cada producto, recorrer todo el grafo buscando conexos.",
      whyWorse:
        "Union-Find responde 'pertenecen a la misma familia' en tiempo casi constante (inverso de Ackermann), tras un preprocesamiento lineal. Recalcular conexos por consulta desperdicia trabajo.",
    },
    inputs: [
      { name: "productId", label: "ID de producto", type: "text", placeholder: "5004" },
    ],
  },

  // --- Optimización -----------------------------------------------------
  {
    slug: "presupuesto",
    title: "Presupuesto óptimo (mochila)",
    businessQuestion: "¿Cómo maximizar unidades dentro de un presupuesto?",
    graph: "flow",
    group: "optimizacion",
    animation: "structural",
    investigated: {
      name: "Knapsack — Programación Dinámica",
      bigO: "O(n · W)",
      idea: "Tabla DP que decide, para cada producto y cada nivel de presupuesto, si conviene incluirlo. Garantiza el óptimo, no una aproximación.",
    },
    baseline: {
      name: "Greedy por ratio valor/costo",
      bigO: "O(n log n)",
      idea: "Ordenar por valor/costo y llenar hasta agotar el presupuesto.",
      whyWorse:
        "El greedy es más rápido pero NO garantiza el óptimo en la mochila 0/1: puede dejar fuera una combinación mejor por elegir localmente el mejor ratio. La DP explora el espacio completo de forma eficiente.",
    },
    inputs: [
      { name: "budget", label: "Presupuesto (S/)", type: "number", default: "5000" },
      {
        name: "productIds",
        label: "Productos (IDs separados por coma)",
        type: "text",
        placeholder: "5004,5007,5036",
        help: "Se piden 1 unidad de cada uno como demanda base.",
      },
    ],
  },
  {
    slug: "ofertas",
    title: "Mejores ahorros históricos",
    businessQuestion: "¿Dónde estuvo el mayor ahorro frente al costo típico?",
    graph: "G_offers",
    group: "optimizacion",
    animation: "structural",
    investigated: {
      name: "Bellman-Ford",
      bigO: "O(V · E)",
      idea: "Relaja todas las aristas V−1 veces para hallar el mejor 'ahorro' (peso negativo = oportunidad) de cada producto frente a su costo mediano por proveedor.",
      reference: "Bellman (1958); Ford (1956)",
    },
    inputs: [{ name: "limit", label: "Top N", type: "number", default: "20" }],
  },
  {
    slug: "pedido-optimo",
    title: "Pedido multi-SKU factible",
    businessQuestion:
      "¿Cómo repartir un pedido entre proveedores sin violar capacidades?",
    graph: "flow",
    group: "optimizacion",
    animation: "structural",
    investigated: {
      name: "Flujo de costo mínimo",
      bigO: "O(F · E log V)",
      idea: "Red FUENTE → SKU → PROVEEDOR → SUMIDERO. Asigna la capacidad escasa al SKU donde más reduce el costo y reporta déficit honesto cuando no alcanza.",
      reference:
        "Edmonds & Karp (1972); Ahuja, Magnanti & Orlin (1993), Network Flows, cap. 9",
    },
    baseline: {
      name: "Greedy por-SKU independiente",
      bigO: "O(n log n) por SKU",
      idea: "Elegir el proveedor más barato para cada SKU por separado.",
      whyWorse:
        "Ignora que varios SKUs compiten por la capacidad global del mismo proveedor barato. Medición real (4 SKUs de ENVIPLAST): el greedy reporta S/3.179 'completo' pero asigna 6.500u a un proveedor con capacidad ~2.050u/día → plan inejecutable. El flujo respeta capacidades y reporta el déficit real.",
    },
    inputs: [
      { name: "productId", label: "ID de producto", type: "text", placeholder: "5064" },
      { name: "quantity", label: "Cantidad", type: "number", default: "1000" },
    ],
  },

  // --- Riesgo -----------------------------------------------------------
  {
    slug: "riesgo-proveedor",
    title: "Riesgo y dependencia de proveedores",
    businessQuestion: "¿Qué productos dependen de un único proveedor?",
    graph: "G_purchases",
    group: "riesgo",
    animation: "structural",
    investigated: {
      name: "Grado de entrada en G_purchases + índice HHI",
      bigO: "O(V + E)",
      idea: "El grado de entrada de cada producto cuenta cuántos proveedores lo abastecen; el índice Herfindahl-Hirschman mide la concentración del volumen por proveedor.",
    },
    inputs: [],
  },

  // --- Venta cruzada / documentos --------------------------------------
  {
    slug: "venta-cruzada",
    title: "Venta cruzada (histórica)",
    businessQuestion:
      "Clientes que compraron X, ¿qué más compraron alguna vez?",
    graph: "G_sales",
    group: "documentos",
    animation: "traversal",
    investigated: {
      name: "BFS de 2 saltos: PRODUCTO → CLIENTE → PRODUCTO",
      bigO: "O(V + E)",
      idea: "Desde el producto se alcanzan sus clientes (salto 1) y desde ellos los demás productos que compraron (salto 2), rankeados por clientes compartidos.",
    },
    inputs: [
      { name: "productId", label: "ID de producto", type: "text", placeholder: "5007" },
      { name: "limit", label: "Resultados", type: "number", default: "10" },
    ],
  },
  {
    slug: "co-ocurrencia",
    title: "Co-ocurrencia en el mismo comprobante",
    businessQuestion: "¿Qué productos van juntos en la MISMA factura?",
    graph: "G_sales",
    group: "documentos",
    animation: "traversal",
    investigated: {
      name: "Market Basket vía nodos DOCUMENT",
      bigO: "O(E)",
      idea: "Usando los nodos DOCUMENT (cada comprobante real), se listan los productos que comparten documento con el producto dado — co-compra operativa, no histórica.",
    },
    baseline: {
      name: "Co-ocurrencia directa por cliente",
      bigO: "O(V + E)",
      idea: "Contar productos que comparten cliente en cualquier momento.",
      whyWorse:
        "Comparte cliente ≠ comprado en la misma operación. El nodo DOCUMENT distingue 'lo pidió junto' de 'lo pidió alguna vez', que es la señal accionable para empaquetado.",
    },
    inputs: [
      { name: "productId", label: "ID de producto", type: "text", placeholder: "5007" },
      SALES_PURCHASES_SELECT,
      { name: "limit", label: "Resultados", type: "number", default: "15" },
    ],
  },
  {
    slug: "volatilidad",
    title: "Volatilidad de co-compra",
    businessQuestion: "¿Un producto es versátil o dependiente de otros?",
    graph: "G_sales",
    group: "documentos",
    animation: "structural",
    investigated: {
      name: "Análisis: Similitud de Jaccard",
      bigO: "O(D · C²)",
      idea: "Compara los conjuntos de productos de cada par de documentos donde aparece el producto usando la métrica Jaccard. Jaccard alto = siempre con los mismos (dependiente); bajo = combinaciones variadas (versátil).",
    },
    inputs: [
      { name: "productId", label: "ID de producto", type: "text", placeholder: "5007" },
      SALES_PURCHASES_SELECT,
    ],
  },
  {
    slug: "eficiencia-logistica",
    title: "Eficiencia logística por documento",
    businessQuestion: "¿Cómo se distribuyen los pedidos (simples vs complejos)?",
    graph: "G_sales",
    group: "documentos",
    animation: "structural",
    investigated: {
      name: "Análisis: Distribución de documentos",
      bigO: "O(D)",
      idea: "Agrupa las líneas de venta por comprobante y calcula la distribución de líneas/monto: pedidos simples (1 línea) vs pedidos complejos (10+ líneas), revelando patrones de eficiencia operativa.",
    },
    inputs: [SALES_PURCHASES_SELECT],
  },
  {
    slug: "ahorro-por-documento",
    title: "Documentos con mayor ahorro",
    businessQuestion: "¿En qué comprobantes de compra conviene renegociar?",
    graph: "G_purchases",
    group: "documentos",
    animation: "structural",
    investigated: {
      name: "Análisis: Ahorros por documento (Bellman-Ford + agregación)",
      bigO: "O(D · P)",
      idea: "Cruza los candidatos de ahorro de Bellman-Ford (mejor precio histórico) con los productos de cada comprobante para rankear documentos por ahorro potencial agregado, priorizando renegociaciones de alto impacto.",
    },
    inputs: [{ name: "limit", label: "Top N", type: "number", default: "15" }],
  },
  {
    slug: "concentracion",
    title: "Concentración de líneas (Gini)",
    businessQuestion: "¿El negocio crece por volumen o por diversidad?",
    graph: "G_sales",
    group: "documentos",
    animation: "structural",
    investigated: {
      name: "Análisis: Concentración (coef. Gini)",
      bigO: "O(D log D)",
      idea: "Mide la desigualdad en la cantidad de productos por documento usando el coeficiente de Gini. Gini alto = pocos comprobantes complejos dominan; bajo = documentos homogéneos.",
    },
    baseline: {
      name: "Promedio simple de líneas",
      bigO: "O(D)",
      idea: "Reportar solo el promedio de productos por documento.",
      whyWorse:
        "El promedio oculta la forma de la distribución: dos negocios con el mismo promedio pueden tener estructuras opuestas. Gini captura la desigualdad real.",
    },
    inputs: [SALES_PURCHASES_SELECT],
  },
];

export function cardBySlug(slug: string): AlgoCard | undefined {
  return CATALOG.find((c) => c.slug === slug);
}

export const GROUP_LABELS: Record<AlgoCard["group"], string> = {
  busqueda: "Búsqueda y similitud",
  caminos: "Caminos en el grafo",
  optimizacion: "Optimización",
  riesgo: "Riesgo",
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
