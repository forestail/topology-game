import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { getResultPresentation } from "../game/resultPresentation";
import type { Winner } from "../game/types";

type FinishedWinner = Exclude<Winner, null>;
type ParticleStyle = CSSProperties & Record<`--${string}`, string>;

interface ResultCelebrationProps {
  active: boolean;
  winner: FinishedWinner;
  playerScore: number;
  cpuScore: number;
  onRestart: () => void;
  onNewGame: () => void;
}

const VICTORY_PARTICLES = Array.from({ length: 28 }, (_, index) => {
  const angle = (index / 28) * Math.PI * 2;
  const distance = 150 + (index % 5) * 24;
  const fallDistance = 350 + (index % 4) * 45;

  return {
    id: index,
    style: {
      "--burst-x": `${Math.cos(angle) * distance}px`,
      "--burst-y": `${Math.sin(angle) * distance * 0.62 - 55}px`,
      "--fall-x": `${Math.cos(angle) * (distance + 70)}px`,
      "--fall-y": `${fallDistance}px`,
      "--spin": `${360 + ((index * 83) % 540)}deg`,
      "--delay": `${(index % 7) * 28}ms`,
      "--duration": `${1050 + (index % 6) * 85}ms`,
    } as ParticleStyle,
  };
});

export function ResultCelebration({
  active,
  winner,
  playerScore,
  cpuScore,
  onRestart,
  onNewGame,
}: ResultCelebrationProps) {
  const [visible, setVisible] = useState(true);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const presentation = getResultPresentation(winner, playerScore, cpuScore);
  const isVictory = presentation.tone === "victory";
  const isOpen = visible && active;

  useEffect(() => {
    if (!isOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      primaryButtonRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        setVisible(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>("button"),
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
  }, [isOpen]);

  if (!isOpen) return null;

  const primaryAction =
    presentation.tone === "defeat" ? onRestart : onNewGame;
  const secondaryAction =
    presentation.tone === "defeat" ? onNewGame : onRestart;

  return (
    <div
      className={`result-celebration result-${presentation.tone}`}
      data-testid="result-celebration"
    >
      {isVictory && (
        <>
          <div className="result-rays" aria-hidden="true" />
          <div className="result-particles" aria-hidden="true">
            {VICTORY_PARTICLES.map((particle) => (
              <i key={particle.id} style={particle.style} />
            ))}
          </div>
        </>
      )}

      <div
        ref={dialogRef}
        className="result-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-message"
      >
        <button
          type="button"
          className="result-close"
          aria-label="結果表示を閉じる"
          onClick={() => setVisible(false)}
        >
          ×
        </button>

        <div className="result-seal" aria-hidden="true">
          <span>
            {winner === "player" ? "P" : winner === "cpu" ? "C" : "="}
          </span>
        </div>
        <p className="result-eyebrow">{presentation.eyebrow}</p>
        <h2 id="result-title">{presentation.title}</h2>
        <p id="result-message" className="result-message">
          {presentation.message}
        </p>

        <div className="result-scoreboard" aria-label="最終得点">
          <div className="result-score result-score-player">
            <span>Player</span>
            <strong>{playerScore}</strong>
          </div>
          <div className="result-margin">
            <span>Final</span>
            <strong>{presentation.marginLabel}</strong>
          </div>
          <div className="result-score result-score-cpu">
            <span>CPU</span>
            <strong>{cpuScore}</strong>
          </div>
        </div>

        <div className="result-actions">
          <button
            ref={primaryButtonRef}
            type="button"
            className="result-primary"
            onClick={primaryAction}
          >
            {presentation.primaryLabel}
          </button>
          <button
            type="button"
            className="result-secondary"
            onClick={secondaryAction}
          >
            {presentation.secondaryLabel}
          </button>
          <button
            type="button"
            className="result-review"
            onClick={() => setVisible(false)}
          >
            得点表を見る
          </button>
        </div>
      </div>
    </div>
  );
}
