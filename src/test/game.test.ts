import { describe, it, expect } from "vitest";
import { initialState, reducer, DEFAULT_QUESTIONS, winner, type Action, type GameState } from "@/lib/game";

const run = (s: GameState, ...acts: Action[]) => acts.reduce(reducer, s);

describe("game rules", () => {
  it("has at least 12 questions each totalling 100 with 6 answers", () => {
    expect(DEFAULT_QUESTIONS.length).toBeGreaterThanOrEqual(12);
    for (const q of DEFAULT_QUESTIONS) {
      expect(q.answers).toHaveLength(6);
      expect(q.answers.reduce((a, b) => a + b.points, 0)).toBe(100);
    }
  });
  it("reveal adds to bank once only", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "reveal", index: 0 });
    expect(s.bank).toBe(32);
  });
  it("award banks points once", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "reveal", index: 1 }, { type: "award", team: "A" }, { type: "award", team: "A" });
    expect(s.scores.A).toBe(54);
    expect(s.bank).toBe(0);
  });
  it("three strikes opens steal for other team; success gives bank to stealer", () => {
    let s = run(initialState(), { type: "reveal", index: 0 }, { type: "strike" }, { type: "strike" }, { type: "strike" });
    expect(s.phase).toBe("steal");
    expect(s.active).toBe("B");
    s = reducer(s, { type: "reveal", index: 1 });
    expect(s.scores).toEqual({ A: 0, B: 54 });
  });
  it("failed steal gives bank to original team", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "strike" }, { type: "strike" }, { type: "strike" }, { type: "stealFail" });
    expect(s.scores).toEqual({ A: 32, B: 0 });
  });
  it("revealing after award does not add points", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "award", team: "A" }, { type: "reveal", index: 2 });
    expect(s.scores.A).toBe(32);
  });
  it("next question resets round but keeps scores", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "award", team: "B" }, { type: "strike" }, { type: "next" });
    expect(s.scores.B).toBe(32);
    expect(s.strikes).toBe(0);
    expect(s.tiles.every((t) => t === "hidden")).toBe(true);
    expect(s.currentId).toBe("q2");
  });
  it("reset round undoes this round's award only", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "award", team: "A" }, { type: "next" }, { type: "reveal", index: 0 }, { type: "award", team: "A" }, { type: "resetRound" });
    expect(s.scores.A).toBe(32);
  });
  it("new match zeroes scores", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "award", team: "A" }, { type: "newMatch" });
    expect(s.scores).toEqual({ A: 0, B: 0 });
  });
  it("winner handles tie", () => {
    expect(winner(initialState())).toBe("tie");
  });
});
