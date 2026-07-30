import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadTerrainUnderlayVisible,
  saveTerrainUnderlayVisible,
} from "./storage";

function installStorage(initialValue: string | null = null) {
  let value = initialValue;
  const localStorage = {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
  vi.stubGlobal("window", { localStorage });
  return localStorage;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("terrain underlay visibility storage", () => {
  it("defaults to visible when no preference exists", () => {
    installStorage();
    expect(loadTerrainUnderlayVisible()).toBe(true);
  });

  it("loads a saved hidden preference", () => {
    installStorage("false");
    expect(loadTerrainUnderlayVisible()).toBe(false);
  });

  it("saves the current preference", () => {
    const localStorage = installStorage();
    saveTerrainUnderlayVisible(false);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "topology:terrainUnderlayVisible",
      "false",
    );
  });
});
