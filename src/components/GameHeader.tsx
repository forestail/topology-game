interface GameHeaderProps {
  seed: string;
  onNewGame: () => void;
  onRestart: () => void;
  onOpenRules: () => void;
}

export function GameHeader({
  seed,
  onNewGame,
  onRestart,
  onOpenRules,
}: GameHeaderProps) {
  const copySeed = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(seed);
    } catch {
      const fallback = document.createElement("textarea");
      fallback.value = seed;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.append(fallback);
      fallback.select();
      document.execCommand("copy");
      fallback.remove();
    }
  };

  return (
    <header className="game-header">
      <div className="brand-lockup">
        <span className="brand-mark" aria-hidden="true">
          T
        </span>
        <div>
          <p className="eyebrow">Spatial control study</p>
          <h1>Topology</h1>
        </div>
      </div>

      <div className="header-actions">
        <button
          className="help-button"
          onClick={onOpenRules}
          aria-label="ルール説明を開く"
        >
          <span aria-hidden="true">?</span>
          <b>ルール</b>
        </button>
        <div className="seed-control" aria-label={`Current seed ${seed}`}>
          <span className="seed-label">SEED</span>
          <code title={seed}>{seed}</code>
          <button className="icon-button" onClick={copySeed} aria-label="Copy seed">
            Copy
          </button>
          <button
            className="icon-button"
            onClick={onRestart}
            aria-label="Restart with the same seed"
            title="Restart with the same seed (R)"
          >
            Reset
          </button>
        </div>
        <button className="primary-button" onClick={onNewGame} title="New game (N)">
          New game
          <kbd>N</kbd>
        </button>
      </div>
    </header>
  );
}
