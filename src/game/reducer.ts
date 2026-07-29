import { generateBoard } from "./generateBoard";
import { calculateScore } from "./scoring";
import type {
  GameAction,
  GameNode,
  GameState,
  Owner,
  Turn,
  Winner,
  CpuDifficulty,
} from "./types";

function determineWinner(player: number, cpu: number): Winner {
  if (player === cpu) return "draw";
  return player > cpu ? "player" : "cpu";
}

function claimNode(
  state: GameState,
  nodeId: string,
  owner: Turn,
): GameState {
  const target = state.nodes.find((node) => node.id === nodeId);
  if (!target || target.owner !== null) return state;

  const nodes = state.nodes.map((node): GameNode =>
    node.id === nodeId ? { ...node, owner } : node,
  );
  const moveHistory = [
    ...state.moveHistory,
    { owner, nodeId, turn: state.moveHistory.length + 1 },
  ];
  const score = calculateScore(nodes, state.edges);
  const finished = nodes.every((node) => node.owner !== null);
  const nextOwner: Owner = owner === "player" ? "cpu" : "player";

  return {
    ...state,
    nodes,
    currentTurn: nextOwner ?? "player",
    playerSelections:
      owner === "player" ? [...state.playerSelections, nodeId] : state.playerSelections,
    cpuSelections:
      owner === "cpu" ? [...state.cpuSelections, nodeId] : state.cpuSelections,
    phase: finished
      ? "finished"
      : owner === "player"
        ? "cpuThinking"
        : "playerTurn",
    winner: finished ? determineWinner(score.player.total, score.cpu.total) : null,
    score,
    moveHistory,
    selectedNodeId: null,
  };
}

export function createInitialGame(
  seed: string,
  cpuDifficulty: CpuDifficulty = "standard",
): GameState {
  const { nodes, edges } = generateBoard(seed);
  return {
    seed,
    nodes,
    edges,
    currentTurn: "player",
    playerSelections: [],
    cpuSelections: [],
    phase: "playerTurn",
    winner: null,
    score: calculateScore(nodes, edges),
    moveHistory: [],
    selectedNodeId: null,
    cpuDifficulty,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "PLAYER_CLAIM":
      return state.phase === "playerTurn"
        ? claimNode(state, action.nodeId, "player")
        : state;
    case "CPU_CLAIM":
      return state.phase === "cpuThinking"
        ? claimNode(state, action.nodeId, "cpu")
        : state;
    case "NEW_GAME":
      return createInitialGame(action.seed, state.cpuDifficulty);
    case "RESTART":
      return createInitialGame(state.seed, state.cpuDifficulty);
    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.nodeId };
    case "SET_CPU_DIFFICULTY":
      return { ...state, cpuDifficulty: action.difficulty };
    default:
      return state;
  }
}

export function isGameFinished(state: GameState): boolean {
  return (
    state.phase === "finished" &&
    state.nodes.every((node) => node.owner !== null)
  );
}
