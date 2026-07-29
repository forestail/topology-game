"use client";

import { useCallback, useEffect, useState } from "react";
import { Board } from "./components/Board";
import { GameHeader } from "./components/GameHeader";
import { HelpModal, type HelpMode } from "./components/HelpModal";
import { ScorePanel } from "./components/ScorePanel";
import {
  hasSeenTutorial,
  saveTutorialSeen,
} from "./game/storage";
import { useGame } from "./hooks/useGame";

export default function App() {
  const [helpMode, setHelpMode] = useState<HelpMode | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const {
    state,
    stats,
    claimNode,
    newGame,
    restart,
    selectNode,
    setCpuDifficulty,
    inspectScore,
  } = useGame();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!hasSeenTutorial()) {
        setTutorialStep(0);
        setHelpMode("tutorial");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const closeHelp = useCallback(() => {
    if (helpMode === "tutorial") saveTutorialSeen();
    setHelpMode(null);
  }, [helpMode]);

  const startTutorial = useCallback(() => {
    setTutorialStep(0);
    setHelpMode("tutorial");
  }, []);

  return (
    <main className="app-shell">
      <GameHeader
        seed={state.seed}
        onNewGame={newGame}
        onRestart={restart}
        onOpenRules={() => setHelpMode("rules")}
      />
      <div className="workspace">
        <Board
          nodes={state.nodes}
          edges={state.edges}
          phase={state.phase}
          selectedNodeId={state.selectedNodeId}
          cpuDifficulty={state.cpuDifficulty}
          scoreInspection={state.scoreInspection}
          onClaim={claimNode}
          onSelect={selectNode}
          onDifficultyChange={setCpuDifficulty}
          onClearScoreInspection={() => inspectScore(null)}
        />
        <ScorePanel
          state={state}
          stats={stats}
          inspection={state.scoreInspection}
          onInspect={inspectScore}
        />
      </div>
      <footer>
        <span>Topology / Local simulation</span>
        <span>Scoring: base + connected edges + adjacent influence</span>
      </footer>
      {helpMode && (
        <HelpModal
          mode={helpMode}
          tutorialStep={tutorialStep}
          onTutorialStepChange={setTutorialStep}
          onStartTutorial={startTutorial}
          onClose={closeHelp}
        />
      )}
    </main>
  );
}
