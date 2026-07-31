import { useEffect, useRef } from "react";
import type {
  LossAnalysis,
  LossCategoryStatus,
} from "../game/lossAnalysis";
import type { ScoreInspection } from "../game/types";

interface LossAnalysisPanelProps {
  active: boolean;
  analysis: LossAnalysis;
  playerScore: number;
  cpuScore: number;
  inspection: ScoreInspection | null;
  onInspect: (inspection: ScoreInspection) => void;
  onClose: () => void;
  onReviewScoreboard: () => void;
}

const STATUS_LABELS: Record<LossCategoryStatus, string> = {
  favorable: "Player優勢",
  unfavorable: "Player不利",
  even: "互角",
};

export function LossAnalysisPanel({
  active,
  analysis,
  playerScore,
  cpuScore,
  inspection,
  onInspect,
  onClose,
  onReviewScoreboard,
}: LossAnalysisPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>("button"),
      ).filter((element) => !element.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocus?.focus();
    };
  }, [active, onClose]);

  if (!active) return null;

  return (
    <div
      className="loss-analysis-stage"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="loss-analysis-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loss-analysis-title"
        tabIndex={-1}
      >
        <header className="loss-analysis-header">
          <div>
            <p>Defeat review</p>
            <h2 id="loss-analysis-title">敗因分析</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="敗因分析を閉じる">
            ×
          </button>
        </header>

        <div className="loss-analysis-scroll">
          <section className="loss-final-score" aria-label="最終結果">
            <div>
              <span>Player</span>
              <strong>{playerScore}</strong>
            </div>
            <p>
              <span>敗北</span>
              <strong>−{analysis.finalMargin} pts</strong>
            </p>
            <div>
              <span>CPU</span>
              <strong>{cpuScore}</strong>
            </div>
          </section>

          <section className="loss-primary-cause">
            <p className="loss-section-label">主な敗因</p>
            <h3>{analysis.primaryTitle}</h3>
            {analysis.primaryDetails.map((detail) => (
              <p key={detail}>{detail}</p>
            ))}
          </section>

          <section className="loss-breakdown">
            <div className="loss-section-heading">
              <div>
                <p className="loss-section-label">得点差の内訳</p>
                <h3>4項目の比較</h3>
              </div>
              <span>MAPで根拠を確認</span>
            </div>

            <div className="loss-category-list">
              {analysis.categories.map((category) => {
                const activeInspection =
                  inspection?.owner === category.inspection.owner &&
                  inspection.category === category.category;
                return (
                  <article
                    key={category.category}
                    className={`loss-category loss-category-${category.status}`}
                  >
                    <div className="loss-category-title">
                      <h4>{category.label}</h4>
                      <span>{STATUS_LABELS[category.status]}</span>
                    </div>
                    <div className="loss-category-score">
                      <span>
                        Player <strong>{category.playerPoints}</strong>
                      </span>
                      <i aria-hidden="true">/</i>
                      <span>
                        CPU <strong>{category.cpuPoints}</strong>
                      </span>
                    </div>
                    <p>{category.comparisonText}</p>
                    <button
                      type="button"
                      aria-pressed={activeInspection}
                      onClick={() => onInspect(category.inspection)}
                    >
                      {activeInspection
                        ? "MAPで表示中"
                        : `${category.inspection.owner === "cpu" ? "CPU" : "Player"}をMAPで確認`}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          {analysis.tacticalNotes.length > 0 && (
            <section className="loss-tactical-notes">
              <p className="loss-section-label">戦術的な補足</p>
              <h3>盤面から確認できたこと</h3>
              <ul>
                {analysis.tacticalNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="loss-analysis-footer">
          <button
            type="button"
            className="loss-review-scoreboard"
            onClick={onReviewScoreboard}
          >
            最終得点の内訳を見る
          </button>
          <button
            type="button"
            className="loss-close-analysis"
            onClick={onClose}
          >
            分析を閉じる
          </button>
        </footer>
      </div>
    </div>
  );
}
