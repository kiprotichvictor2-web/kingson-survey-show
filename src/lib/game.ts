export type Team = "A" | "B";
export type Answer = { text: string; points: number };
export type Question = { id: string; prompt: string; answers: Answer[] };
export type TileState = "hidden" | "scored" | "shown";
export type Phase = "play" | "steal" | "awarded";

export type GameState = {
  version: 2;
  questions: Question[];
  currentId: string;
  usedIds: string[];
  tiles: TileState[];
  bank: number;
  scores: Record<Team, number>;
  teamNames: Record<Team, string>;
  active: Team;
  controlTeam: Team; // team that had control before the steal
  strikes: number;
  phase: Phase;
  lastAward: { team: Team; points: number; reason: string } | null;
  round: number;
  gameOver: boolean;
};

import { DEFAULT_QUESTIONS } from "./questions";
export { DEFAULT_QUESTIONS };

const hidden = (): TileState[] => Array(6).fill("hidden");
export const other = (t: Team): Team => (t === "A" ? "B" : "A");

export function initialState(questions: Question[] = DEFAULT_QUESTIONS, startId?: string, rand = Math.random()): GameState {
  const start = (questions.find((x) => x.id === startId) ?? questions[Math.floor(rand * questions.length) % questions.length])!;
  return {
    version: 2,
    questions: structuredClone(questions),
    currentId: start.id,
    usedIds: [start.id],
    tiles: hidden(),
    bank: 0,
    scores: { A: 0, B: 0 },
    teamNames: { A: "TEAM A", B: "TEAM B" },
    active: "A",
    controlTeam: "A",
    strikes: 0,
    phase: "play",
    lastAward: null,
    round: 1,
    gameOver: false,
  };
}

export type Action =
  | { type: "reveal"; index: number }
  | { type: "showAll" }
  | { type: "strike" }
  | { type: "undoStrike" }
  | { type: "stealFail" }
  | { type: "setActive"; team: Team }
  | { type: "award"; team: Team }
  | { type: "next"; id?: string; random?: boolean; rand?: number }
  | { type: "resetRound" }
  | { type: "newMatch"; rand?: number }
  | { type: "reshuffle"; rand?: number }
  | { type: "endGame" }
  | { type: "resumeGame" }
  | { type: "editQuestion"; question: Question }
  | { type: "renameTeam"; team: Team; name: string }
  | { type: "adjustScore"; team: Team; delta: number };

export const currentQuestion = (s: GameState) =>
  (s.questions.find((x) => x.id === s.currentId) ?? s.questions[0])!;

function awardTo(s: GameState, team: Team, reason: string): GameState {
  const points = s.bank;
  return {
    ...s,
    scores: { ...s.scores, [team]: s.scores[team] + points },
    bank: 0,
    phase: "awarded",
    active: team,
    lastAward: { team, points, reason },
  };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case "reveal": {
      if (a.index < 0 || a.index > 5 || s.tiles[a.index] !== "hidden") return s;
      const ans = currentQuestion(s).answers[a.index];
      const tiles = [...s.tiles];
      if (s.phase === "awarded") {
        tiles[a.index] = "shown"; // reveal for audience, no points
        return { ...s, tiles };
      }
      tiles[a.index] = "scored";
      const next = { ...s, tiles, bank: s.bank + (ans?.points ?? 0) };
      if (s.phase === "steal") return awardTo(next, s.active, "Steal successful");
      return next;
    }
    case "showAll":
      return { ...s, tiles: s.tiles.map((t) => (t === "hidden" ? "shown" : t)) };
    case "strike": {
      if (s.phase === "awarded") return s;
      if (s.phase === "steal") return awardTo(s, s.controlTeam, "Steal failed");
      const strikes = Math.min(3, s.strikes + 1);
      if (strikes === 3) {
        const revealed = { ...s, strikes, tiles: s.tiles.map(() => "shown" as TileState) };
        return awardTo(revealed, s.active, "Three strikes");
      }
      return { ...s, strikes };
    }
    case "undoStrike": {
      if (s.phase === "steal")
        return { ...s, strikes: 2, phase: "play", active: s.controlTeam };
      if (s.phase !== "play") return s;
      return { ...s, strikes: Math.max(0, s.strikes - 1) };
    }
    case "stealFail":
      return s.phase === "steal" ? awardTo(s, s.controlTeam, "Steal failed") : s;
    case "setActive":
      if (s.phase !== "play") return s;
      return { ...s, active: a.team, controlTeam: a.team };
    case "award":
      if (s.phase === "awarded") return s;
      return awardTo(s, a.team, "Round banked");
    case "next": {
      let id = a.id;
      if (!id) {
        const unused = s.questions.filter((x) => !s.usedIds.includes(x.id));
        // Next: only unused. Random: prefer unused, else anything but the current one.
        const pool = unused.length ? unused : a.random ? s.questions.filter((x) => x.id !== s.currentId) : [];
        if (!pool.length) return s;
        id = pool[Math.floor((a.rand ?? Math.random()) * pool.length) % pool.length]!.id;
      }
      if (!s.questions.some((x) => x.id === id)) return s;
      return {
        ...s,
        currentId: id,
        usedIds: s.usedIds.includes(id) ? s.usedIds : [...s.usedIds, id],
        tiles: hidden(),
        bank: 0,
        strikes: 0,
        phase: "play",
        active: s.controlTeam === s.active ? s.active : s.controlTeam,
        lastAward: null,
        round: s.round + 1,
      };
    }
    case "resetRound": {
      // undo any points this round already awarded so nothing is double counted
      const scores = { ...s.scores };
      if (s.lastAward) scores[s.lastAward.team] -= s.lastAward.points;
      return {
        ...s,
        scores,
        tiles: hidden(),
        bank: 0,
        strikes: 0,
        phase: "play",
        active: s.lastAward && s.lastAward.reason !== "Round banked" ? s.controlTeam : s.phase === "steal" ? s.controlTeam : s.active,
        lastAward: null,
      };
    }
    case "newMatch": {
      const fresh = initialState(s.questions, undefined, a.rand ?? Math.random());
      return { ...fresh, teamNames: s.teamNames };
    }
    case "reshuffle": {
      const cleared = { ...s, usedIds: [s.currentId] };
      return reducer(cleared, { type: "next", random: true, rand: a.rand });
    }
    case "endGame":
      return { ...s, gameOver: true };
    case "resumeGame":
      return { ...s, gameOver: false };
    case "editQuestion": {
      const questions = s.questions.map((x) => (x.id === a.question.id ? a.question : x));
      let bank = s.bank;
      if (a.question.id === s.currentId)
        bank = s.tiles.reduce((sum, t, i) => sum + (t === "scored" && s.phase !== "awarded" ? a.question.answers[i]?.points ?? 0 : 0), 0);
      return { ...s, questions, bank: s.phase === "awarded" ? 0 : bank };
    }
    case "renameTeam":
      return { ...s, teamNames: { ...s.teamNames, [a.team]: a.name.slice(0, 18) || `TEAM ${a.team}` } };
    case "adjustScore":
      return { ...s, scores: { ...s.scores, [a.team]: Math.max(0, s.scores[a.team] + a.delta) } };
  }
}

export function winner(s: GameState): Team | "tie" {
  if (s.scores.A === s.scores.B) return "tie";
  return s.scores.A > s.scores.B ? "A" : "B";
}

export const STORAGE_KEY = "kingson-survey-show-v1";
export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !Array.isArray(s.questions)) return null;
    if (s.version === 2) {
      // Preserve any host-edited questions, but always add newly shipped
      // defaults so older browser saves grow with the survey bank.
      const have = new Set(s.questions.map((x: Question) => x.id));
      const questions = [...s.questions, ...structuredClone(DEFAULT_QUESTIONS.filter((x) => !have.has(x.id)))];
      return { ...s, questions, usedIds: Array.isArray(s.usedIds) ? s.usedIds : [s.currentId] };
    }
    if (s.version === 1) return migrateV1(s);
    return null;
  } catch {
    return null;
  }
}

/** v1 saves had 14 questions; keep their (possibly edited) questions and game, add new bank questions. */
export function migrateV1(s: Omit<GameState, "version"> & { version: 1 }): GameState {
  const have = new Set(s.questions.map((x) => x.id));
  const questions = [...s.questions, ...structuredClone(DEFAULT_QUESTIONS.filter((x) => !have.has(x.id)))];
  return { ...s, version: 2, questions, usedIds: Array.isArray(s.usedIds) ? s.usedIds : [s.currentId] };
}
