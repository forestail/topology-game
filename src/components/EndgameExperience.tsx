import { useMemo, useState } from "react";
import { analyzeLoss, canAnalyzeLoss } from "../game/lossAnalysis";
import type { GameState, ScoreInspection } from "../game/types";
import { LossAnalysisPanel } from "./LossAnalysisPanel";
import { ResultCelebration } from "./ResultCelebration";

interface EndgameExperienceProps {
  active: boolean;
  state: GameState;
  onRestart: () => void;
  onNewGame: () => void;
  onInspect: (inspection: ScoreInspection | null) => void;
}

type EndgameView = "result" | "analysis" | "closed";

export function EndgameExperience({
  active,
  state,
  onRestart,
  onNewGame,
  onInspect,
}: EndgameExperienceProps) {
  const [view, setView] = useState<EndgameView>("result");
  const lossAnalysis = useMemo(
    () =>
      canAnalyzeLoss(state.winner)
        ? analyzeLoss(state.nodes, state.edges, state.score)
        : null,
    [state.edges, state.nodes, state.score, state.winner],
  );

  if (!state.winner || view === "closed") return null;

  if (view === "analysis" && lossAnalysis) {
    return (
      <LossAnalysisPanel
        active={active}
        analysis={lossAnalysis}
        playerScore={state.score.player.total}
        cpuScore={state.score.cpu.total}
        inspection={state.scoreInspection}
        onInspect={onInspect}
        onClose={() => setView("result")}
        onReviewScoreboard={() => setView("closed")}
      />
    );
  }

  return (
    <ResultCelebration
      active={active}
      winner={state.winner}
      playerScore={state.score.player.total}
      cpuScore={state.score.cpu.total}
      onRestart={onRestart}
      onNewGame={onNewGame}
      onDismiss={() => setView("closed")}
      onAnalyzeLoss={
        lossAnalysis ? () => setView("analysis") : undefined
      }
    />
  );
}
