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
- Each side's single longest route through owned nodes earns 1 point per two
  edges, up to 5 points. A route cannot visit the same node twice, and shorter
  routes earn no additional route bonus.
- Base, connection, influence, and longest-route points are added after every
  move. The higher final total wins.

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
- Use **Copy** to share the active seed. Paste a seed into the **SEED** field
  and press `Enter` or **Load** to reproduce its board. **Reset** restarts the
  active seed from its first turn.
- Use the **CPU** selector above the board to change difficulty. The selection
  applies to the next CPU move and is remembered on this device.
- Use **MAP ON / OFF** above the board to show or hide the decorative tactical
  map. The preference is remembered on this device and does not affect play.
- Use **ルール** in the header to open the complete Japanese rules guide.
- A four-step Japanese tutorial opens automatically on the first visit. After
  dismissal it can be replayed from the rules guide at any time.

CPU levels:

- **Easy** varies its choice among several strong candidates.
- **Standard** uses the original weighted positional evaluation.
- **Hard** compares the real projected score and anticipates the Player's
  strongest immediate reply.

To understand a score, select the Player or CPU value beside **Base nodes**,
**Connections**, **Influence**, or **Longest route** in the Score ledger. The
Network map dims unrelated locations and highlights the contributing nodes and
links. Longest route highlights only the one route used for its bonus.
Influence uses dashed rings for scoring targets and solid rings for
contributing nodes. Select the score again, choose **Clear**, or press `Esc` to
exit the explanation.

## Design notes

- Game state is centralized in a React `useReducer`.
- Board generation, scoring, CPU evaluation, persistence, and SVG rendering are
  separate modules.
- The seeded PRNG makes node positions, roles, graph edges, and terrain
  reproducible.
- Every seed selects one of fifteen strategic terrain families. The original
  archipelago, hourglass, ring routes, spine, and core are joined by twin
  domains, delta, ladder, crossroads, fortress, river banks, trident,
  constellation, crescent, and layered basin layouts.
- Ten candidates are generated for that terrain and scored for connectivity,
  cycles, bottlenecks, junction variety, leaves, and excessive edge length.
  The strongest candidate becomes the board.
- Terrain-aware graph construction preserves meaningful bridges and alternate
  routes while keeping every node connected and degree four or lower.
- A deterministic SVG tactical-map underlay visualizes each terrain family
  with contours, sectors, routes, or waterways derived from the seed and node
  geometry. It is decorative only and never participates in scoring or CPU
  decisions.
- Hub and Relay roles are structural rather than random: Hubs favor central
  high-degree nodes, while Relays favor bridges and junctions.
- CPU decisions are deterministic for a game state except for seeded tie
  breaking. It values base points, friendly connections, Relay bonuses, Hub
  influence, and blocking Player connections.
- The current seed, CPU difficulty, tactical-map visibility, and lifetime
  results are stored in `localStorage`. Storage failures never prevent play.
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
