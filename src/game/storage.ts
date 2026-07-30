import { EMPTY_STATS, STORAGE_KEYS } from "./constants";
import type { CpuDifficulty, LifetimeStats, Winner } from "./types";

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

export function loadCpuDifficulty(): CpuDifficulty {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.cpuDifficulty);
    return value === "easy" || value === "hard" || value === "standard"
      ? value
      : "standard";
  } catch {
    return "standard";
  }
}

export function saveCpuDifficulty(difficulty: CpuDifficulty): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.cpuDifficulty, difficulty);
  } catch {
    // Storage is optional; the active selection remains usable this session.
  }
}

export function hasSeenTutorial(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEYS.tutorialSeen) === "true";
  } catch {
    return false;
  }
}

export function saveTutorialSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.tutorialSeen, "true");
  } catch {
    // Storage is optional; dismissing still works for the current page.
  }
}

export function loadTerrainUnderlayVisible(): boolean {
  try {
    return (
      window.localStorage.getItem(STORAGE_KEYS.terrainUnderlayVisible) !==
      "false"
    );
  } catch {
    return true;
  }
}

export function saveTerrainUnderlayVisible(visible: boolean): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.terrainUnderlayVisible,
      String(visible),
    );
  } catch {
    // Storage is optional; the active selection remains usable this session.
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
