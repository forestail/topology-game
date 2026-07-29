export const NODE_COUNT = 24;
export const MAX_DEGREE = 4;
export const BOARD_WIDTH = 960;
export const BOARD_HEIGHT = 640;
export const BOARD_PADDING = 54;
export const MIN_NODE_DISTANCE = 82;
export const PROXIMITY_DISTANCE = 235;
export const CPU_DELAY_MS = 400;

export const NODE_BASE_POINTS = {
  normal: 1,
  hub: 2,
  relay: 1,
} as const;

export const NODE_TYPE_WEIGHTS = {
  normal: 0.7,
  hub: 0.2,
  relay: 0.1,
} as const;

export const STORAGE_KEYS = {
  lastSeed: "topology:lastSeed",
  stats: "topology:lifetimeStats",
  cpuDifficulty: "topology:cpuDifficulty",
  tutorialSeen: "topology:tutorialSeen",
} as const;

export const EMPTY_STATS = {
  gamesPlayed: 0,
  playerWins: 0,
  cpuWins: 0,
  draws: 0,
} as const;
