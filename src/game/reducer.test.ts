import { describe, expect, it } from "vitest";
import { createInitialGame, gameReducer, isGameFinished } from "./reducer";

describe("gameReducer", () => {
  it("finishes after all nodes have been claimed", () => {
    let state = createInitialGame("finish-test");

    for (const node of state.nodes) {
      state =
        state.phase === "playerTurn"
          ? gameReducer(state, { type: "PLAYER_CLAIM", nodeId: node.id })
          : gameReducer(state, { type: "CPU_CLAIM", nodeId: node.id });
    }

    expect(isGameFinished(state)).toBe(true);
    expect(state.winner).not.toBeNull();
    expect(state.playerSelections).toHaveLength(12);
    expect(state.cpuSelections).toHaveLength(12);
  });

  it("ignores player input while the CPU is thinking", () => {
    let state = createInitialGame("phase-test");
    state = gameReducer(state, { type: "PLAYER_CLAIM", nodeId: state.nodes[0].id });
    const unchanged = gameReducer(state, {
      type: "PLAYER_CLAIM",
      nodeId: state.nodes[1].id,
    });
    expect(unchanged).toBe(state);
  });

  it("keeps the selected CPU difficulty when restarting", () => {
    let state = createInitialGame("difficulty-test");
    state = gameReducer(state, {
      type: "SET_CPU_DIFFICULTY",
      difficulty: "hard",
    });
    state = gameReducer(state, { type: "RESTART" });

    expect(state.cpuDifficulty).toBe("hard");
    expect(state.phase).toBe("playerTurn");
  });

  it("loads a specified seed and reproduces its board", () => {
    let state = createInitialGame("first-seed", "hard");
    state = gameReducer(state, {
      type: "PLAYER_CLAIM",
      nodeId: state.nodes[0].id,
    });
    state = gameReducer(state, {
      type: "NEW_GAME",
      seed: "shared-seed-id",
    });
    const expected = createInitialGame("shared-seed-id", "hard");

    expect(state).toEqual(expected);
    expect(state.seed).toBe("shared-seed-id");
    expect(state.cpuDifficulty).toBe("hard");
  });

  it("stores score inspection and clears it after a move", () => {
    let state = createInitialGame("inspection-test");
    state = gameReducer(state, {
      type: "SET_SCORE_INSPECTION",
      inspection: { owner: "player", category: "base" },
    });
    expect(state.scoreInspection).toEqual({
      owner: "player",
      category: "base",
    });

    state = gameReducer(state, {
      type: "PLAYER_CLAIM",
      nodeId: state.nodes[0].id,
    });
    expect(state.scoreInspection).toBeNull();
  });
});
