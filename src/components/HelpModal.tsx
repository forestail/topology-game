"use client";

import { useEffect, useRef } from "react";

export type HelpMode = "rules" | "tutorial";

interface HelpModalProps {
  mode: HelpMode;
  tutorialStep: number;
  onTutorialStepChange: (step: number) => void;
  onStartTutorial: () => void;
  onClose: () => void;
}

const TUTORIAL_STEP_COUNT = 4;

function NodeTypeGuide() {
  return (
    <div className="guide-node-grid">
      <div>
        <span className="guide-node guide-node-normal" aria-hidden="true" />
        <strong>Normal</strong>
        <p>基本点1。標準的なノードです。</p>
      </div>
      <div>
        <span className="guide-node guide-node-hub" aria-hidden="true" />
        <strong>Hub</strong>
        <p>基本点2。隣接先への影響力も2です。</p>
      </div>
      <div>
        <span className="guide-node guide-node-relay" aria-hidden="true" />
        <strong>Relay</strong>
        <p>基本点1。関係する接続ボーナスが2点になります。</p>
      </div>
    </div>
  );
}

function TutorialContent({ step }: { step: number }) {
  if (step === 0) {
    return (
      <>
        <div className="tutorial-turns" aria-hidden="true">
          <span className="tutorial-player">P</span>
          <i />
          <span className="tutorial-cpu">C</span>
          <i />
          <span className="tutorial-player">P</span>
          <i />
          <span className="tutorial-cpu">C</span>
        </div>
        <h2 id="help-title">24個のノードを取り合います</h2>
        <p className="help-lead">
          あなたが先手です。白いノードを1つ選ぶと、CPUも1つ選びます。
          すべてのノードが埋まるまで交互に続けます。
        </p>
        <div className="guide-callout">
          最後に「基本点＋接続点＋影響点」が高い側の勝利です。
        </div>
        <p className="tutorial-note">
          盤面は15種類の地形から生成されます。橋・迂回路・中央の要所が毎回変わるため、まず全体の形を観察しましょう。
        </p>
      </>
    );
  }

  if (step === 1) {
    return (
      <>
        <h2 id="help-title">形でノードの役割を見分けます</h2>
        <p className="help-lead">
          色だけでなく、円・二重円・四角の形にも意味があります。
        </p>
        <NodeTypeGuide />
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <h2 id="help-title">得点は3種類の合計です</h2>
        <div className="tutorial-score-list">
          <div>
            <span>01</span>
            <p>
              <strong>基本点</strong>
              取得したNormal・Relayは1点、Hubは2点。
            </p>
          </div>
          <div>
            <span>02</span>
            <p>
              <strong>接続点</strong>
              同じ所有者を結ぶ線は1点。Relayを含む線は2点。
            </p>
          </div>
          <div>
            <span>03</span>
            <p>
              <strong>影響点</strong>
              各ノードの周囲で影響力を比較し、強い側が1点。
            </p>
          </div>
        </div>
        <p className="tutorial-note">
          影響力はNormal・Relayが1、Hubが2。同点ならどちらも得点しません。
        </p>
      </>
    );
  }

  return (
    <>
      <h2 id="help-title">迷ったら得点の根拠を確認できます</h2>
      <p className="help-lead">
        SCORE LEDGERのPまたはCの点数を押すと、得点対象がNETWORK
        MAP上で強調されます。
      </p>
      <div className="tutorial-tools">
        <div>
          <span className="tutorial-tool-icon">P 8</span>
          <p>
            <strong>点数を押す</strong>
            ノード・線・影響対象をハイライト
          </p>
        </div>
        <div>
          <span className="tutorial-tool-icon">CPU</span>
          <p>
            <strong>難易度を選ぶ</strong>
            Easy / Standard / Hardを切り替え
          </p>
        </div>
      </div>
      <p className="tutorial-note">
        Nで新規ゲーム、Rで同じ盤面を再開、Escでハイライトを解除できます。
      </p>
    </>
  );
}

function RulesContent() {
  return (
    <>
      <h2 id="help-title">遊び方・ルール</h2>
      <p className="help-lead">
        PlayerとCPUで24個のノードを交互に取得し、ネットワークから得られる合計点を競います。
      </p>

      <section className="rules-section">
        <h3>ゲームの流れ</h3>
        <ol>
          <li>Playerが先手。白い未取得ノードを1つ選びます。</li>
          <li>CPUが自動で未取得ノードを1つ選びます。</li>
          <li>24個すべて取得すると終了。合計点が高い側の勝利です。</li>
        </ol>
      </section>

      <section className="rules-section">
        <h3>ノードの種類</h3>
        <NodeTypeGuide />
      </section>

      <section className="rules-section">
        <h3>毎回変わる盤面の地形</h3>
        <p>
          seedごとに複数の候補盤面を生成し、接続性・分岐・迂回路・ボトルネックを評価して、戦略性の高い1枚を採用します。
          Hubは接続の中心、Relayは橋や分岐などの要所に置かれます。
        </p>
        <ul>
          <li>
            <strong>橋を争う地形</strong>：群島・砂時計・背骨・双峰・三角州・十字路・三叉・星座
          </li>
          <li>
            <strong>迂回路を読む地形</strong>：環状路・梯子・要塞・両岸・三日月・多層盆地
          </li>
          <li>
            <strong>中心を争う地形</strong>：中央核。周辺拠点との配分が重要です。
          </li>
        </ul>
      </section>

      <section className="rules-section">
        <h3>得点方法</h3>
        <dl className="rules-score-list">
          <div>
            <dt>基本点</dt>
            <dd>所有ノードの点数を合計します。</dd>
          </div>
          <div>
            <dt>接続点</dt>
            <dd>
              同じ所有者のノードを結ぶ線1本につき1点。Relayを端点に含む線は2点です。
            </dd>
          </div>
          <div>
            <dt>影響点</dt>
            <dd>
              各ノードについて隣接ノードの影響力を比較します。Normal・Relayは1、Hubは2。強い側に1点、同点なら0点です。取得済みノードも判定対象です。
            </dd>
          </div>
        </dl>
      </section>

      <section className="rules-section">
        <h3>操作と補助機能</h3>
        <ul>
          <li>クリック、またはTab・矢印キー＋Enterでノードを取得。</li>
          <li>SCORE LEDGERの点数を押すと、得点根拠を盤面に表示。</li>
          <li>CPU難易度はEasy・Standard・Hardから選択。</li>
          <li>Nで新規ゲーム、Rで同じseedを再開、Escで選択解除。</li>
        </ul>
      </section>
    </>
  );
}

export function HelpModal({
  mode,
  tutorialStep,
  onTutorialStepChange,
  onStartTutorial,
  onClose,
}: HelpModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => {
      dialogRef.current
        ?.querySelector<HTMLElement>("button")
        ?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
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
  }, [onClose]);

  const lastStep = tutorialStep === TUTORIAL_STEP_COUNT - 1;

  return (
    <div
      className="help-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`help-dialog help-dialog-${mode}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        <header className="help-dialog-header">
          <div>
            <span className="help-dialog-mark" aria-hidden="true">
              T
            </span>
            <span>
              {mode === "tutorial"
                ? `チュートリアル ${tutorialStep + 1} / ${TUTORIAL_STEP_COUNT}`
                : "Topology ガイド"}
            </span>
          </div>
          <button type="button" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </header>

        <div className="help-dialog-body">
          {mode === "tutorial" ? (
            <TutorialContent step={tutorialStep} />
          ) : (
            <RulesContent />
          )}
        </div>

        {mode === "tutorial" ? (
          <footer className="help-dialog-footer">
            <div className="tutorial-progress" aria-hidden="true">
              {Array.from({ length: TUTORIAL_STEP_COUNT }, (_, index) => (
                <span
                  key={index}
                  className={index === tutorialStep ? "is-current" : ""}
                />
              ))}
            </div>
            <div>
              {tutorialStep > 0 && (
                <button
                  className="help-secondary-button"
                  type="button"
                  onClick={() => onTutorialStepChange(tutorialStep - 1)}
                >
                  戻る
                </button>
              )}
              <button
                className="help-primary-button"
                type="button"
                onClick={() =>
                  lastStep
                    ? onClose()
                    : onTutorialStepChange(tutorialStep + 1)
                }
              >
                {lastStep ? "ゲームを始める" : "次へ"}
              </button>
            </div>
          </footer>
        ) : (
          <footer className="help-dialog-footer rules-footer">
            <button
              className="help-secondary-button"
              type="button"
              onClick={onStartTutorial}
            >
              チュートリアルを見る
            </button>
            <button
              className="help-primary-button"
              type="button"
              onClick={onClose}
            >
              閉じる
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
