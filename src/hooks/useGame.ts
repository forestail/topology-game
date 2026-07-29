"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { CPU_DELAY_MS } from "../game/constants";
import { chooseCpuMove } from "../game/cpu";
import { createSeededRandom, createSeed } from "../game/random";
import { createInitialGame, gameReducer } from "../game/reducer";
import {
  loadLastSeed,
  loadStats,
  recordGame,
  saveLastSeed,
} from "../game/storage";
import type { LifetimeStats } from "../game/types";

const BOOT_SEED = "topology-boot";
const EMPTY_SESSION_STATS: LifetimeStats = {
  gamesPlayed: 0,
  playerWins: 0,
  cpuWins: 0,
  draws: 0,
};

export function useGame() {
  const [state, dispatch] = useReducer(
    gameReducer,
    undefined,
    () => createInitialGame(BOOT_SEED),
  );
  const [stats, setStats] = useState<LifetimeStats>(EMPTY_SESSION_STATS);
  const [storageReady, setStorageReady] = useState(false);
  const recordedGameRef = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const savedSeed = loadLastSeed();
      const seed =
        savedSeed && savedSeed !== "topology" && savedSeed !== BOOT_SEED
          ? savedSeed
          : createSeed();
      setStats(loadStats());
      dispatch({ type: "NEW_GAME", seed });
      setStorageReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    saveLastSeed(state.seed);
  }, [state.seed, storageReady]);

  useEffect(() => {
    if (state.phase !== "cpuThinking") return;

    const timer = window.setTimeout(() => {
      const random = createSeededRandom(
        `${state.seed}:cpu:${state.moveHistory.length}`,
      );
      const nodeId = chooseCpuMove(state.nodes, state.edges, random);
      if (nodeId) dispatch({ type: "CPU_CLAIM", nodeId });
    }, CPU_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [state.edges, state.moveHistory.length, state.nodes, state.phase, state.seed]);

  useEffect(() => {
    if (
      state.phase === "finished" &&
      state.winner &&
      recordedGameRef.current !== state.seed
    ) {
      recordedGameRef.current = state.seed;
      setStats(recordGame(state.winner));
    }
  }, [state.phase, state.seed, state.winner]);

  const newGame = useCallback(() => {
    const seed = createSeed();
    recordedGameRef.current = null;
    dispatch({ type: "NEW_GAME", seed });
  }, []);

  const restart = useCallback(() => {
    recordedGameRef.current = null;
    dispatch({ type: "RESTART" });
  }, []);

  const claimNode = useCallback((nodeId: string) => {
    dispatch({ type: "PLAYER_CLAIM", nodeId });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;

      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        newGame();
      }
      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        restart();
      }
      if (event.key === "Escape") {
        dispatch({ type: "SELECT_NODE", nodeId: null });
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newGame, restart]);

  return {
    state,
    stats,
    claimNode,
    newGame,
    restart,
    selectNode: (nodeId: string | null) =>
      dispatch({ type: "SELECT_NODE", nodeId }),
  };
}
