import { describe, expect, it } from "vitest";
import { analyzeLoss, canAnalyzeLoss } from "./lossAnalysis";
import type {
  GameEdge,
  GameNode,
  GameScore,
  ScoreBreakdown,
} from "./types";

function breakdown(
  base: number,
  connections: number,
  influence: number,
  route: number,
): ScoreBreakdown {
  return {
    base,
    connections,
    influence,
    route,
    total: base + connections + influence + route,
  };
}

function score(
  player: ScoreBreakdown,
  cpu: ScoreBreakdown,
): GameScore {
  return { player, cpu };
}

function node(
  id: string,
  owner: "player" | "cpu",
  type: GameNode["type"] = "normal",
): GameNode {
  return { id, owner, type, x: 100, y: 100 };
}

describe("loss analysis availability", () => {
  it("is available only when CPU wins", () => {
    expect(canAnalyzeLoss("cpu")).toBe(true);
    expect(canAnalyzeLoss("player")).toBe(false);
    expect(canAnalyzeLoss("draw")).toBe(false);
    expect(canAnalyzeLoss(null)).toBe(false);
  });
});

describe("analyzeLoss", () => {
  it("calculates every category difference and inspection owner", () => {
    const analysis = analyzeLoss(
      [],
      [],
      score(breakdown(12, 7, 8, 3), breakdown(14, 10, 6, 3)),
    );

    expect(analysis.categories).toEqual([
      expect.objectContaining({
        category: "base",
        playerDelta: -2,
        status: "unfavorable",
        comparisonText: "CPUが2点リード",
        inspection: { owner: "cpu", category: "base" },
      }),
      expect.objectContaining({
        category: "connections",
        playerDelta: -3,
        inspection: { owner: "cpu", category: "connections" },
      }),
      expect.objectContaining({
        category: "influence",
        playerDelta: 2,
        status: "favorable",
        inspection: { owner: "player", category: "influence" },
      }),
      expect.objectContaining({
        category: "route",
        playerDelta: 0,
        status: "even",
        inspection: { owner: "player", category: "route" },
      }),
    ]);
  });

  it("selects the largest adverse category", () => {
    const analysis = analyzeLoss(
      [],
      [],
      score(breakdown(12, 6, 3, 2), breakdown(13, 8, 8, 3)),
    );

    expect(analysis.primaryCategories).toEqual(["influence"]);
    expect(analysis.primaryTitle).toBe("影響点で5点差がつきました。");
  });

  it("keeps tied primary causes in strategic priority order", () => {
    const analysis = analyzeLoss(
      [],
      [],
      score(breakdown(12, 5, 4, 2), breakdown(12, 8, 7, 5)),
    );

    expect(analysis.primaryCategories).toEqual([
      "influence",
      "connections",
      "route",
    ]);
    expect(analysis.primaryTitle).toBe(
      "影響点・接続点・最長ルートで、それぞれ3点差がつきました。",
    );
  });

  it("describes when only CPU earned a longest-route bonus", () => {
    const nodes = [
      node("c1", "cpu"),
      node("c2", "cpu"),
      node("c3", "cpu"),
      node("p1", "player"),
    ];
    const edges: GameEdge[] = [
      { id: "e1", sourceId: "c1", targetId: "c2" },
      { id: "e2", sourceId: "c2", targetId: "c3" },
    ];
    const analysis = analyzeLoss(
      nodes,
      edges,
      score(breakdown(1, 0, 0, 0), breakdown(3, 2, 0, 1)),
    );

    expect(analysis.tacticalNotes).toContain(
      "CPUだけが最長ルートボーナスを獲得しました。CPUのルートは2接続でした。",
    );
  });

  it("describes a large CPU influence lead as observed targets", () => {
    const analysis = analyzeLoss(
      [],
      [],
      score(breakdown(10, 5, 2, 2), breakdown(10, 5, 7, 2)),
    );

    expect(analysis.primaryCategories).toEqual(["influence"]);
    expect(analysis.tacticalNotes).toContain(
      "CPUは影響点を7ターゲットで獲得し、Playerとの差は5点でした。",
    );
  });

  it("includes the observed Relay connection difference", () => {
    const nodes = [
      node("c1", "cpu", "relay"),
      node("c2", "cpu"),
      node("p1", "player"),
      node("p2", "player"),
    ];
    const edges: GameEdge[] = [
      { id: "e1", sourceId: "c1", targetId: "c2" },
    ];
    const analysis = analyzeLoss(
      nodes,
      edges,
      score(breakdown(2, 0, 0, 0), breakdown(2, 2, 0, 0)),
    );

    expect(analysis.tacticalNotes).toContain(
      "CPUはRelayを含む接続を1本形成し、Playerの0本を上回りました。",
    );
  });

  it("does not mutate nodes, edges, or score data", () => {
    const nodes = [node("c1", "cpu"), node("p1", "player")];
    const edges: GameEdge[] = [
      { id: "e1", sourceId: "c1", targetId: "p1" },
    ];
    const finalScore = score(
      breakdown(1, 0, 0, 0),
      breakdown(2, 0, 1, 0),
    );
    const before = JSON.stringify({ nodes, edges, finalScore });

    analyzeLoss(nodes, edges, finalScore);

    expect(JSON.stringify({ nodes, edges, finalScore })).toBe(before);
  });
});
