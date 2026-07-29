# Topology

Topology is a quiet, single-player territory game designed for a three-to-five
minute break. Claim nodes on a seeded network, build valuable connections, and
compete with a lightweight CPU for influence.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server.

Quality checks:

```bash
npm run test
npm run lint
npm run build
```

## Rules

- The board has 24 nodes. Player moves first, then CPU, until all nodes are
  claimed.
- Normal and Relay nodes are worth 1 base point. Hubs are worth 2.
- Every edge between two nodes owned by the same side adds 1 point. If either
  endpoint is a Relay, that edge adds 2 points.
- Every board node is also an influence target, including already owned nodes.
  Adjacent Normal and Relay nodes contribute 1 influence; adjacent Hubs
  contribute 2. The side with more adjacent influence earns 1 point for that
  target. A tie earns neither side a point.
- Base, connection, and influence points are added after every move. The higher
  final total wins.

Node shapes do not rely on color: Normal is a circle, Hub is a double circle,
and Relay is a square with a center point. Player claims use a solid `P`; CPU
claims use a dashed, hatched `C`.

## Controls

- Click an open node to claim it.
- Use `Tab` or arrow keys to focus open nodes; press `Enter` or `Space` to
  claim the focused node.
- Press `Esc` to clear focus.
- Press `N` for a new random game.
- Press `R` to restart the current seed.
- Use **Copy** to share a seed and **Reset** to reproduce its board.

## Design notes

- Game state is centralized in a React `useReducer`.
- Board generation, scoring, CPU evaluation, persistence, and SVG rendering are
  separate modules.
- The seeded PRNG makes node positions, types, and graph edges reproducible.
- Board generation uses a bounded placement loop and a degree-constrained
  Kruskal pass, then adds nearby tactical edges up to degree four.
- CPU decisions are deterministic for a game state except for seeded tie
  breaking. It values base points, friendly connections, Relay bonuses, Hub
  influence, and blocking Player connections.
- Only the current seed and lifetime results are stored in `localStorage`.
  Storage failures never prevent play.
- The interface responds down to 320 px widths and switches with the operating
  system’s light/dark preference.

## Project structure

```text
app/                  Application entry and global visual system
src/components/       SVG board and status UI
src/game/             Types, generation, scoring, CPU, reducer, storage
src/hooks/            React game lifecycle
worker/               Sites-compatible application entry
```
