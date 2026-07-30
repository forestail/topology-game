import type { Winner } from "./types";

type FinishedWinner = Exclude<Winner, null>;

export interface ResultPresentation {
  tone: "victory" | "defeat" | "draw";
  eyebrow: string;
  title: string;
  message: string;
  marginLabel: string;
  primaryLabel: string;
  secondaryLabel: string;
}

export function getResultPresentation(
  winner: FinishedWinner,
  playerScore: number,
  cpuScore: number,
): ResultPresentation {
  const margin = Math.abs(playerScore - cpuScore);

  if (winner === "player") {
    return {
      tone: "victory",
      eyebrow: "Network secured",
      title: "勝利",
      message: "あなたのネットワークが盤面を制しました。",
      marginLabel: `+${margin} pts`,
      primaryLabel: "次の盤面へ",
      secondaryLabel: "同じ盤面で再戦",
    };
  }

  if (winner === "cpu") {
    return {
      tone: "defeat",
      eyebrow: "Network lost",
      title: "敗北",
      message: "CPUがより強いネットワークを構築しました。",
      marginLabel: `−${margin} pts`,
      primaryLabel: "同じ盤面で再戦",
      secondaryLabel: "新しい盤面へ",
    };
  }

  return {
    tone: "draw",
    eyebrow: "Balanced network",
    title: "引き分け",
    message: "両者のネットワークは同点です。",
    marginLabel: "EVEN",
    primaryLabel: "次の盤面へ",
    secondaryLabel: "同じ盤面で再戦",
  };
}
