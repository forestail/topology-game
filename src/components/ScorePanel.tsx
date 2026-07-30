import type {
  GameState,
  LifetimeStats,
  ScoreCategory,
  ScoreInspection,
  Turn,
} from "../game/types";
import { getRemainingCount } from "../game/selectors";
import { Legend } from "./Legend";

interface ScorePanelProps {
  state: GameState;
  stats: LifetimeStats;
  inspection: ScoreInspection | null;
  onInspect: (inspection: ScoreInspection | null) => void;
}

const SCORE_ROWS: Array<{ category: ScoreCategory; label: string }> = [
  { category: "base", label: "Base nodes" },
  { category: "connections", label: "Connections" },
  { category: "influence", label: "Influence" },
  { category: "route", label: "Longest route" },
];

interface ScoreEvidenceButtonProps {
  owner: Turn;
  category: ScoreCategory;
  label: string;
  value: number;
  active: boolean;
  onInspect: (inspection: ScoreInspection | null) => void;
}

function ScoreEvidenceButton({
  owner,
  category,
  label,
  value,
  active,
  onInspect,
}: ScoreEvidenceButtonProps) {
  const ownerLabel = owner === "player" ? "Player" : "CPU";

  return (
    <button
      className={`ledger-score ledger-score-${owner}${active ? " is-active" : ""}`}
      type="button"
      aria-pressed={active}
      aria-label={`${ownerLabel} ${label}: ${value} points. Show evidence on the network map.`}
      onClick={() => onInspect(active ? null : { owner, category })}
    >
      <span>{owner === "player" ? "P" : "C"}</span>
      <strong>{value}</strong>
    </button>
  );
}

function outcomeCopy(state: GameState): string {
  if (state.phase !== "finished") return "Claim every node. Shape clusters, protect relays.";
  if (state.winner === "draw") return "Balanced network. The study ends in a draw.";
  return state.winner === "player"
    ? "Player controls the stronger network."
    : "CPU controls the stronger network.";
}

export function ScorePanel({
  state,
  stats,
  inspection,
  onInspect,
}: ScorePanelProps) {
  const remaining = getRemainingCount(state);
  const claimed = state.playerSelections.length + state.cpuSelections.length;
  const progress = (claimed / state.nodes.length) * 100;

  return (
    <aside className="score-panel" aria-label="Game status">
      <section className="outcome-block">
        <p className="section-kicker">Live analysis</p>
        <h2>
          {state.phase === "finished"
            ? state.winner === "draw"
              ? "Draw"
              : `${state.winner === "player" ? "Player" : "CPU"} wins`
            : "Territory open"}
        </h2>
        <p>{outcomeCopy(state)}</p>
      </section>

      <section className="score-grid" aria-label="Current scores">
        <div className="score-card score-player">
          <div>
            <span className="owner-swatch owner-player">P</span>
            <span>Player</span>
          </div>
          <strong>{state.score.player.total}</strong>
          <small>{state.playerSelections.length} nodes</small>
        </div>
        <div className="score-card score-cpu">
          <div>
            <span className="owner-swatch owner-cpu">C</span>
            <span>CPU</span>
          </div>
          <strong>{state.score.cpu.total}</strong>
          <small>{state.cpuSelections.length} nodes</small>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <h3>Acquisition</h3>
          <span>{remaining} open</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="turn-row">
          <span>Current turn</span>
          <strong>
            {state.phase === "finished"
              ? "Complete"
              : state.currentTurn === "player"
                ? "Player"
                : "CPU"}
          </strong>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-heading">
          <h3>Score ledger</h3>
          <span>Select a score</span>
        </div>
        <dl className="ledger">
          {SCORE_ROWS.map(({ category, label }) => (
            <div key={category}>
              <dt>{label}</dt>
              <dd className="ledger-score-pair">
                {(["player", "cpu"] as const).map((owner) => (
                  <ScoreEvidenceButton
                    key={owner}
                    owner={owner}
                    category={category}
                    label={label}
                    value={state.score[owner][category]}
                    active={
                      inspection?.owner === owner &&
                      inspection.category === category
                    }
                    onInspect={onInspect}
                  />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <Legend />

      <section className="session-strip" aria-label="Lifetime results">
        <span>{stats.gamesPlayed} studies</span>
        <span>{stats.playerWins}W</span>
        <span>{stats.cpuWins}L</span>
        <span>{stats.draws}D</span>
      </section>
    </aside>
  );
}
