import { UMAP } from 'umap-js';
import type { EveEmbedding, EvePoint, ProjectionMethod } from './types';

/** Run UMAP dimensionality reduction */
function projectUMAP(vectors: number[][], dimensions: 2 | 3): number[][] {
  const nNeighbors = Math.min(15, vectors.length - 1);
  const umap = new UMAP({
    nComponents: dimensions,
    nNeighbors: Math.max(2, nNeighbors),
    minDist: 0.1,
    spread: 1.0,
  });
  return umap.fit(vectors);
}

/** Hand-rolled PCA via power iteration */
function projectPCA(vectors: number[][], dimensions: 2 | 3): number[][] {
  const n = vectors.length;
  if (n === 0) return [];
  const d = vectors[0].length;

  // Center the data
  const mean = new Float64Array(d);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) mean[j] += vectors[i][j];
  }
  for (let j = 0; j < d; j++) mean[j] /= n;

  const centered = vectors.map((v) => v.map((val, j) => val - mean[j]));

  // Find top-k eigenvectors via power iteration on covariance
  const eigenvectors: number[][] = [];

  for (let k = 0; k < dimensions; k++) {
    // Random initial vector
    let vec = Array.from({ length: d }, () => Math.random() - 0.5);
    let norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    vec = vec.map((v) => v / norm);

    // Power iteration (100 iterations is plenty for convergence)
    for (let iter = 0; iter < 100; iter++) {
      // Compute C * vec = X^T * (X * vec)
      const xv = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        let dot = 0;
        for (let j = 0; j < d; j++) dot += centered[i][j] * vec[j];
        xv[i] = dot;
      }

      const newVec = new Float64Array(d);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < d; j++) newVec[j] += centered[i][j] * xv[i];
      }

      // Deflate: subtract components along previously found eigenvectors
      for (const ev of eigenvectors) {
        let dot = 0;
        for (let j = 0; j < d; j++) dot += newVec[j] * ev[j];
        for (let j = 0; j < d; j++) newVec[j] -= dot * ev[j];
      }

      norm = Math.sqrt(newVec.reduce((s, v) => s + v * v, 0));
      if (norm < 1e-10) break;
      vec = Array.from(newVec).map((v) => v / norm);
    }

    eigenvectors.push(vec);
  }

  // Project data onto eigenvectors
  return centered.map((row) =>
    eigenvectors.map((ev) => row.reduce((s, v, j) => s + v * ev[j], 0))
  );
}

/** Scale projected points to [-5, 5] range for Three.js scene */
function normalizeProjection(points: number[][]): number[][] {
  if (points.length === 0) return [];
  const dims = points[0].length;

  const mins = new Array(dims).fill(Infinity);
  const maxs = new Array(dims).fill(-Infinity);

  for (const p of points) {
    for (let d = 0; d < dims; d++) {
      if (p[d] < mins[d]) mins[d] = p[d];
      if (p[d] > maxs[d]) maxs[d] = p[d];
    }
  }

  return points.map((p) =>
    p.map((v, d) => {
      const range = maxs[d] - mins[d];
      if (range < 1e-10) return 0;
      return ((v - mins[d]) / range) * 10 - 5; // map to [-5, 5]
    })
  );
}

// ─── DBSCAN Clustering ─────────────────────────────────────────────

function euclidean(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

function regionQuery(coords: number[][], idx: number, eps: number): number[] {
  const neighbors: number[] = [];
  const p = coords[idx];
  for (let i = 0; i < coords.length; i++) {
    if (euclidean(p, coords[i]) <= eps) neighbors.push(i);
  }
  return neighbors;
}

function dbscan(coords: number[][], eps: number, minPts: number): number[] {
  const n = coords.length;
  const UNVISITED = -2;
  const NOISE = -1;
  const labels = new Array<number>(n).fill(UNVISITED);
  let clusterId = 0;

  for (let i = 0; i < n; i++) {
    if (labels[i] !== UNVISITED) continue;

    const neighbors = regionQuery(coords, i, eps);
    if (neighbors.length < minPts) {
      labels[i] = NOISE;
      continue;
    }

    // Expand cluster
    labels[i] = clusterId;
    const queue = neighbors.filter((j) => j !== i);
    let head = 0;

    while (head < queue.length) {
      const j = queue[head++];

      if (labels[j] === NOISE) labels[j] = clusterId; // border point
      if (labels[j] !== UNVISITED) continue; // already processed
      labels[j] = clusterId;

      const jNeighbors = regionQuery(coords, j, eps);
      if (jNeighbors.length >= minPts) {
        for (const k of jNeighbors) {
          if (labels[k] === UNVISITED || labels[k] === NOISE) {
            if (!queue.includes(k)) queue.push(k);
          }
        }
      }
    }

    clusterId++;
  }

  return labels;
}

/** Auto-estimate epsilon using k-nearest-neighbor distances */
function estimateEpsilon(coords: number[][], k: number): number {
  const dists: number[] = [];

  for (let i = 0; i < coords.length; i++) {
    const neighborDists: number[] = [];
    for (let j = 0; j < coords.length; j++) {
      if (i === j) continue;
      neighborDists.push(euclidean(coords[i], coords[j]));
    }
    neighborDists.sort((a, b) => a - b);
    if (neighborDists.length >= k) dists.push(neighborDists[k - 1]);
  }

  // Use median k-distance as epsilon
  dists.sort((a, b) => a - b);
  return dists[Math.floor(dists.length / 2)] || 1.0;
}

/** Cluster projected points via DBSCAN with auto-tuned epsilon.
 *  When numClusters is provided, binary-searches eps to hit that target.
 *  Returns cluster label per point (-1 = noise). */
export function clusterPoints(points: EvePoint[], numClusters?: number): number[] {
  if (points.length < 2) return points.map(() => 0);

  const coords = points.map((p) =>
    p.position.length === 3
      ? [p.position[0], p.position[1], (p.position as [number, number, number])[2]]
      : [p.position[0], p.position[1]]
  );

  const minPts = Math.max(2, Math.min(5, Math.floor(points.length / 10)));

  if (numClusters != null && numClusters > 0) {
    // Compute pairwise distance range for binary search bounds
    let minDist = Infinity;
    let maxDist = 0;
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        const d = euclidean(coords[i], coords[j]);
        if (d > 0 && d < minDist) minDist = d;
        if (d > maxDist) maxDist = d;
      }
    }

    let lo = minDist;
    let hi = maxDist;

    for (let iter = 0; iter < 30; iter++) {
      const mid = (lo + hi) / 2;
      const labels = dbscan(coords, mid, minPts);
      const count = new Set(labels.filter((l) => l >= 0)).size;

      if (count === numClusters) return labels;

      if (count > numClusters) {
        // Too many clusters — eps too small, search upper half
        lo = mid;
      } else {
        // Too few clusters — eps too large, search lower half
        hi = mid;
      }
    }

    console.warn(
      `[eve] Could not find eps yielding exactly ${numClusters} clusters. Falling back to auto-epsilon.`
    );
  }

  const eps = estimateEpsilon(coords, minPts);
  return dbscan(coords, eps, minPts);
}

/** Project embeddings to 2D/3D coordinates */
export async function projectEmbeddings(
  embeddings: EveEmbedding[],
  method: ProjectionMethod,
  dimensions: 2 | 3,
): Promise<EvePoint[]> {
  const vectors = embeddings.map((e) => e.vector);
  if (vectors.length === 0) return [];

  const projected = method === 'umap'
    ? projectUMAP(vectors, dimensions)
    : projectPCA(vectors, dimensions);

  const normalized = normalizeProjection(projected);

  return embeddings.map((emb, i) => ({
    id: emb.id,
    position: (dimensions === 3
      ? [normalized[i][0], normalized[i][1], normalized[i][2]]
      : [normalized[i][0], normalized[i][1]]) as EvePoint['position'],
    label: emb.label,
    content: emb.content,
    score: emb.score,
    group: emb.group,
    metadata: emb.metadata,
  }));
}
