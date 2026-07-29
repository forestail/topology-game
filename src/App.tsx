"use client";

import { Board } from "./components/Board";
import { GameHeader } from "./components/GameHeader";
import { ScorePanel } from "./components/ScorePanel";
import { useGame } from "./hooks/useGame";

export default function App() {
  const {
    state,
    stats,
    claimNode,
    newGame,
    restart,
    selectNode,
    setCpuDifficulty,
  } = useGame();

  return (
    <main className="app-shell">
      <GameHeader seed={state.seed} onNewGame={newGame} onRestart={restart} />
      <div className="workspace">
        <Board
          nodes={state.nodes}
          edges={state.edges}
          phase={state.phase}
          selectedNodeId={state.selectedNodeId}
          cpuDifficulty={state.cpuDifficulty}
          onClaim={claimNode}
          onSelect={selectNode}
          onDifficultyChange={setCpuDifficulty}
        />
        <ScorePanel state={state} stats={stats} />
      </div>
      <footer>
        <span>Topology / Local simulation</span>
        <span>Scoring: base + connected edges + adjacent influence</span>
      </footer>
    </main>
  );
}
