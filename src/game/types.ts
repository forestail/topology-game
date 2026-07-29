export type Owner = "player" | "cpu" | null;
export type NodeType = "normal" | "hub" | "relay";
export type Turn = Exclude<Owner, null>;
export type Phase = "playerTurn" | "cpuThinking" | "finished";
export type Winner = Turn | "draw" | null;
export type CpuDifficulty = "easy" | "standard" | "hard";
export type ScoreCategory = "base" | "connections" | "influence";

export interface ScoreInspection {
  owner: Turn;
  category: ScoreCategory;
}

export interface ScoreEvidence {
  owner: Turn;
  category: ScoreCategory;
  points: number;
  itemCount: number;
  nodeIds: string[];
  edgeIds: string[];
  targetNodeIds: string[];
  contributorNodeIds: string[];
}

export interface GameNode {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  owner: Owner;
}

export interface GameEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface Move {
  owner: Turn;
  nodeId: string;
  turn: number;
}

export interface ScoreBreakdown {
  base: number;
  connections: number;
  influence: number;
  total: number;
}

export interface GameScore {
  player: ScoreBreakdown;
  cpu: ScoreBreakdown;
}

export interface GameState {
  seed: string;
  nodes: GameNode[];
  edges: GameEdge[];
  currentTurn: Turn;
  playerSelections: string[];
  cpuSelections: string[];
  phase: Phase;
  winner: Winner;
  score: GameScore;
  moveHistory: Move[];
  selectedNodeId: string | null;
  cpuDifficulty: CpuDifficulty;
  scoreInspection: ScoreInspection | null;
}

export interface LifetimeStats {
  gamesPlayed: number;
  playerWins: number;
  cpuWins: number;
  draws: number;
}

export type GameAction =
  | { type: "PLAYER_CLAIM"; nodeId: string }
  | { type: "CPU_CLAIM"; nodeId: string }
  | { type: "NEW_GAME"; seed: string }
  | { type: "RESTART" }
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "SET_CPU_DIFFICULTY"; difficulty: CpuDifficulty }
  | { type: "SET_SCORE_INSPECTION"; inspection: ScoreInspection | null };
