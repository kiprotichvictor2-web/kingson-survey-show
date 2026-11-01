import { describe, it, expect } from "vitest";
import { migrateV1, initialState as init0, reducer, DEFAULT_QUESTIONS, winner, type Action, type GameState } from "@/lib/game";

const initialState = () => init0(DEFAULT_QUESTIONS, "q1");
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
    expect(s.currentId).not.toBe("q1");
  });
  it("reset round undoes this round's award only", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "award", team: "A" }, { type: "next" }, { type: "reveal", index: 0 }, { type: "award", team: "A" }, { type: "resetRound" });
    expect(s.scores.A).toBe(32);
  });
  it("new match zeroes scores", () => {
    const s = run(initialState(), { type: "reveal", index: 0 }, { type: "award", team: "A" }, { type: "newMatch" });
    expect(s.scores).toEqual({ A: 0, B: 0 });
  });
  it("bank has 60+ unique prompts, 6 answers, 100 points, no recycled answer sets", () => {
    expect(DEFAULT_QUESTIONS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(DEFAULT_QUESTIONS.map((q) => q.prompt.toLowerCase())).size).toBe(DEFAULT_QUESTIONS.length);
    expect(new Set(DEFAULT_QUESTIONS.map((q) => q.id)).size).toBe(DEFAULT_QUESTIONS.length);
    expect(new Set(DEFAULT_QUESTIONS.map((q) => q.answers.map((a) => a.text).join("|"))).size).toBe(DEFAULT_QUESTIONS.length);
    for (const q of DEFAULT_QUESTIONS) {
      expect(q.answers).toHaveLength(6);
      expect(q.answers.reduce((a, b) => a + b.points, 0)).toBe(100);
    }
  });
  it("next never repeats until the bank is exhausted, then stops", () => {
    let s = init0();
    const seen = new Set([s.currentId]);
    for (let i = 1; i < DEFAULT_QUESTIONS.length; i++) {
      s = reducer(s, { type: "next" });
      expect(seen.has(s.currentId)).toBe(false);
      seen.add(s.currentId);
    }
    const end = reducer(s, { type: "next" });
    expect(end).toBe(s);
    const r = reducer(s, { type: "reshuffle" });
    expect(r.currentId).not.toBe(s.currentId);
    expect(r.usedIds).toHaveLength(2);
  });
  it("random never picks the current question", () => {
    let s = initialState();
    for (let i = 0; i < 200; i++) {
      const n = reducer(s, { type: "next", random: true });
      expect(n.currentId).not.toBe(s.currentId);
      s = n;
    }
  });
  it("new match starts on a random question", () => {
    const ids = new Set(Array.from({ length: 30 }, (_, i) => init0(DEFAULT_QUESTIONS, undefined, i / 30).currentId));
    expect(ids.size).toBeGreaterThan(1);
  });
  it("migrates v1 saves keeping edits and adding new questions", () => {
    const old = { ...initialState(), version: 1 as const, questions: [{ ...DEFAULT_QUESTIONS[0]!, prompt: "EDITED" }] };
    const m = migrateV1(old);
    expect(m.version).toBe(2);
    expect(m.questions[0]!.prompt).toBe("EDITED");
    expect(m.questions.length).toBe(DEFAULT_QUESTIONS.length);
  });
  it("winner handles tie", () => {
    expect(winner(initialState())).toBe("tie");
  });
});
