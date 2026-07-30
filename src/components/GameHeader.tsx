"use client";

import { useState, type FormEvent } from "react";
import { MAX_SEED_LENGTH, parseSeedInput } from "../game/seedInput";

interface GameHeaderProps {
  seed: string;
  onNewGame: () => void;
  onRestart: () => void;
  onLoadSeed: (seed: string) => void;
  onOpenRules: () => void;
}

export function GameHeader({
  seed,
  onNewGame,
  onRestart,
  onLoadSeed,
  onOpenRules,
}: GameHeaderProps) {
  const [draftSeed, setDraftSeed] = useState(seed);
  const [seedError, setSeedError] = useState<string | null>(null);

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

  const submitSeed = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = parseSeedInput(draftSeed);
    if (!result.valid) {
      setSeedError(result.error);
      return;
    }
    setSeedError(null);
    setDraftSeed(result.seed);
    if (result.seed !== seed) onLoadSeed(result.seed);
    else onRestart();
  };

  const resetCurrentSeed = (): void => {
    setDraftSeed(seed);
    setSeedError(null);
    onRestart();
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
        <form
          className={`seed-control${seedError ? " has-error" : ""}`}
          aria-label="Seed controls"
          onSubmit={submitSeed}
        >
          <label className="seed-label" htmlFor="seed-input">
            SEED
          </label>
          <input
            id="seed-input"
            value={draftSeed}
            maxLength={MAX_SEED_LENGTH + 1}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            aria-label="表示する盤面のseed"
            aria-invalid={Boolean(seedError)}
            aria-describedby={seedError ? "seed-error" : undefined}
            title="seedを貼り付けてEnterまたはLoad"
            onChange={(event) => {
              setDraftSeed(event.target.value);
              if (seedError) setSeedError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setDraftSeed(seed);
                setSeedError(null);
                event.currentTarget.blur();
              }
            }}
          />
          <button
            className="icon-button seed-copy-button"
            type="button"
            onClick={copySeed}
            aria-label="現在表示中のseedをコピー"
          >
            Copy
          </button>
          <button
            className="icon-button seed-load-button"
            type="submit"
            aria-label="入力したseedで盤面を表示"
            title="入力したseedで盤面を表示"
          >
            Load
          </button>
          <button
            className="icon-button seed-reset-button"
            type="button"
            onClick={resetCurrentSeed}
            aria-label="現在のseedで最初からやり直す"
            title="現在のseedで最初からやり直す (R)"
          >
            Reset
          </button>
          {seedError && (
            <span id="seed-error" className="seed-error" role="alert">
              {seedError}
            </span>
          )}
        </form>
        <button className="primary-button" onClick={onNewGame} title="New game (N)">
          New game
          <kbd>N</kbd>
        </button>
      </div>
    </header>
  );
}
