# Envases Frontend — Grafos & Complejidad Algorítmica

Web app didáctica (Next.js + TypeScript) para el curso de **Complejidad Algorítmica**.
Consume el backend FastAPI (`../envases-backend`) y muestra, para cada pregunta del
negocio, el algoritmo que la resuelve, su Big-O, el baseline que se descartó y una
**visualización animada** de cómo recorre el grafo real.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Cytoscape.js — render de grafos
- Framer Motion / animación por revelado de pasos
- Recharts — curvas de complejidad Big-O

## Requisitos previos

El backend debe estar corriendo:

```bash
cd ../envases-backend
source .venv/bin/activate
uvicorn app.main:app --port 8000
```

## Ejecutar

```bash
npm install
npm run dev     # http://localhost:3000
```

La URL del backend se configura en `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## Estructura

```
src/
├── app/
│   ├── page.tsx                     # Homepage launcher (4 canales)
│   ├── upload/page.tsx              # Subir 3 archivos o elegir dataset existente
│   └── dataset/[id]/
│       ├── page.tsx                 # Workspace (Galería · El grafo · Explorador)
│       └── algo/[slug]/page.tsx     # Detalle de un algoritmo
├── components/
│   ├── Workspace.tsx                # Pestañas del dataset
│   ├── AlgorithmCard.tsx            # Tarjeta de la galería
│   ├── AlgoDetail.tsx               # Vista detalle: método + Big-O + ejecutar
│   ├── MethodPanel.tsx              # Antes (baseline) vs Ahora (investigado)
│   ├── ComplexityChart.tsx          # Curvas de crecimiento Big-O
│   ├── GraphCanvas.tsx              # Cytoscape + animación del recorrido
│   ├── AlgoVisualizer.tsx           # Adapta resultado del API → traza animable
│   ├── GraphTab.tsx                 # "El grafo": composición + ego-muestra real
│   ├── ExplorerTab.tsx              # Explorador libre (ejecuta cualquier algoritmo)
│   ├── InputForm.tsx / ResultView.tsx
├── data/catalog.ts                  # 14 tarjetas (pregunta, grafo, Big-O, baseline)
└── lib/
    ├── apiClient.ts                 # Cliente tipado de los endpoints
    ├── runners.ts                   # slug → llamada al API
    ├── graphData.ts                 # Carga de grafos desde /artifacts
    ├── algorithms.ts                # BFS / BFS bidireccional / Dijkstra / reveal
    └── csv.ts                       # Parser CSV
```

## Cómo funciona la animación

1. El usuario ejecuta un algoritmo → el **backend** calcula el resultado autoritativo.
2. El frontend descarga el CSV de nodos/aristas del grafo vía `/artifacts`.
3. Re-ejecuta el algoritmo en JS **instrumentado** para producir la traza de
   recorrido (orden de visita, frentes, camino final) y la anima sobre un
   ego-subgrafo legible.
4. El camino final resaltado coincide con el que devolvió el servidor.

> No se dibuja el grafo completo (miles de nodos): se reconstruye solo el
> vecindario relevante a la consulta.

## Algoritmos con recorrido animado

`buscar-producto`, `camino-cliente-proveedor` (BFS bidireccional vs BFS),
`camino-ponderado` (Dijkstra), `venta-cruzada` y `co-ocurrencia` (revelado 2 saltos).
El resto muestra método, Big-O y resultado en tablas/métricas.
