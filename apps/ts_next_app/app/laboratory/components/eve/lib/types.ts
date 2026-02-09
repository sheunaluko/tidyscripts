/** Raw embedding with vector data and metadata */
export interface EveEmbedding {
  id: string;
  vector: number[];
  label?: string;
  content?: string;
  score?: number;
  group?: string;
  metadata?: Record<string, unknown>;
}

/** Projected point ready for rendering */
export interface EvePoint {
  id: string;
  position: [number, number] | [number, number, number];
  label?: string;
  content?: string;
  score?: number;
  group?: string;
  metadata?: Record<string, unknown>;
}

/** Color theme preset */
export interface EveTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  scoreGradient: [string, string];
}

/** Persisted settings */
export interface EveSettings {
  themeId: string;
  glowIntensity: number;
  pointSize: number;
  animationSpeed: number;
  showHud: boolean;
  showGrid: boolean;
  showDetailPanel: boolean;
  method: 'umap' | 'pca';
  dimensions: 2 | 3;
}

/** Projection method */
export type ProjectionMethod = 'umap' | 'pca';

/** Component props */
export interface EveProps {
  embeddings?: EveEmbedding[];
  points?: EvePoint[];
  query?: number[];
  method?: ProjectionMethod;
  dimensions?: 2 | 3;
  colorBy?: 'score' | 'group' | 'cluster';
  numClusters?: number;
  onPointSelect?: (point: EvePoint) => void;
  showDetailPanel?: boolean;
  showSettings?: boolean;
}

/** Core hook return type */
export interface UseEveReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  hoveredPoint: EvePoint | null;
  selectedPoint: EvePoint | null;
  cursorPosition: { x: number; y: number } | null;
  isProjecting: boolean;
  projectedPoints: EvePoint[];
  clusterCount: number | null;
  setSelectedPoint: (point: EvePoint | null) => void;
}
