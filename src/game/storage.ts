import { EMPTY_STATS, STORAGE_KEYS } from "./constants";
import type { LifetimeStats, Winner } from "./types";

function isLifetimeStats(value: unknown): value is LifetimeStats {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.gamesPlayed === "number" &&
    typeof item.playerWins === "number" &&
    typeof item.cpuWins === "number" &&
    typeof item.draws === "number"
  );
}

export function loadLastSeed(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.lastSeed);
  } catch {
    return null;
  }
}

export function saveLastSeed(seed: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.lastSeed, seed);
  } catch {
    // Storage is optional; the active game remains fully functional.
  }
}

export function loadStats(): LifetimeStats {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.stats);
    if (!raw) return { ...EMPTY_STATS };
    const parsed: unknown = JSON.parse(raw);
    return isLifetimeStats(parsed) ? parsed : { ...EMPTY_STATS };
  } catch {
    return { ...EMPTY_STATS };
  }
}

export function recordGame(winner: Exclude<Winner, null>): LifetimeStats {
  const current = loadStats();
  const next = { ...current, gamesPlayed: current.gamesPlayed + 1 };

  if (winner === "player") next.playerWins += 1;
  if (winner === "cpu") next.cpuWins += 1;
  if (winner === "draw") next.draws += 1;

  try {
    window.localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(next));
  } catch {
    // Storage is optional; return the in-memory result for this session.
  }

  return next;
}
