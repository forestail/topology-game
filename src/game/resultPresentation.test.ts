import { describe, expect, it } from "vitest";
import { getResultPresentation } from "./resultPresentation";

describe("getResultPresentation", () => {
  it("presents a player win as a positive victory margin", () => {
    const result = getResultPresentation("player", 34, 29);
    expect(result.tone).toBe("victory");
    expect(result.title).toBe("勝利");
    expect(result.marginLabel).toBe("+5 pts");
  });

  it("presents a CPU win as a negative player margin", () => {
    const result = getResultPresentation("cpu", 26, 31);
    expect(result.tone).toBe("defeat");
    expect(result.title).toBe("敗北");
    expect(result.marginLabel).toBe("−5 pts");
  });

  it("presents a draw without a score margin", () => {
    const result = getResultPresentation("draw", 30, 30);
    expect(result.tone).toBe("draw");
    expect(result.title).toBe("引き分け");
    expect(result.marginLabel).toBe("EVEN");
  });
});
