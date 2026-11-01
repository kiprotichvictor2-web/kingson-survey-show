export type Team = "A" | "B";
export type Answer = { text: string; points: number };
export type Question = { id: string; prompt: string; answers: Answer[] };
export type TileState = "hidden" | "scored" | "shown";
export type Phase = "play" | "steal" | "awarded";

export type GameState = {
  version: 1;
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

const q = (id: string, prompt: string, a: [string, number][]): Question => ({
  id,
  prompt,
  answers: a.map(([text, points]) => ({ text, points })),
});

export const DEFAULT_QUESTIONS: Question[] = [
  q("q1", "Name something people do right after waking up", [["Check their phone", 32], ["Use the bathroom", 22], ["Brush teeth", 16], ["Drink coffee or tea", 13], ["Stretch", 10], ["Hit snooze", 7]]),
  q("q2", "Name a popular food at a celebration", [["Cake", 34], ["Pizza", 20], ["Jollof / fried rice", 15], ["Chicken", 13], ["Grilled meat", 10], ["Ice cream", 8]]),
  q("q3", "Name something people forget to pack when travelling", [["Phone charger", 30], ["Toothbrush", 22], ["Socks / underwear", 16], ["Passport / ID", 13], ["Medicine", 11], ["Sunglasses", 8]]),
  q("q4", "Name something you find in almost every kitchen", [["Fridge", 29], ["Stove", 23], ["Knives", 16], ["Microwave", 13], ["Sink", 11], ["Kettle", 8]]),
  q("q5", "Name a reason people arrive late", [["Traffic", 35], ["Overslept", 24], ["Lost their keys", 13], ["Bad weather", 11], ["The kids", 9], ["Got lost", 8]]),
  q("q6", "Name something people take to the beach", [["Towel", 31], ["Sunscreen", 25], ["Swimsuit", 17], ["Umbrella", 12], ["Snacks", 9], ["Ball", 6]]),
  q("q7", "Name a household chore people hate", [["Washing dishes", 30], ["Laundry", 22], ["Cleaning the bathroom", 19], ["Ironing", 13], ["Vacuuming", 9], ["Taking out trash", 7]]),
  q("q8", "Name something that makes a party great", [["Music", 33], ["Food", 26], ["Good friends", 17], ["Dancing", 12], ["Drinks", 7], ["Games", 5]]),
  q("q9", "Name an animal you'd see on a farm", [["Cow", 32], ["Chicken", 24], ["Pig", 17], ["Horse", 12], ["Goat", 9], ["Sheep", 6]]),
  q("q10", "Name something people do on a Sunday", [["Go to church", 30], ["Sleep in", 24], ["Family meal", 18], ["Watch TV", 13], ["Relax", 9], ["Clean the house", 6]]),
  q("q11", "Name something you'd find in a school bag", [["Books", 30], ["Pens", 25], ["Lunchbox", 17], ["Pencil case", 12], ["Water bottle", 10], ["Calculator", 6]]),
  q("q12", "Name a gift people give on birthdays", [["Money", 28], ["Clothes", 22], ["Perfume", 17], ["Phone / gadget", 14], ["Flowers", 11], ["Jewelry", 8]]),
  q("q13", "Name something people do on their phone in bed", [["Scroll social media", 36], ["Watch videos", 23], ["Text friends", 16], ["Set an alarm", 12], ["Play games", 8], ["Read the news", 5]]),
  q("q14", "Name a reason kids get in trouble at school", [["Talking in class", 31], ["Fighting", 22], ["No homework", 18], ["Being late", 13], ["Using a phone", 10], ["Being rude", 6]]),
];

const hidden = (): TileState[] => Array(6).fill("hidden");
export const other = (t: Team): Team => (t === "A" ? "B" : "A");

export function initialState(questions: Question[] = DEFAULT_QUESTIONS): GameState {
  return {
    version: 1,
    questions: structuredClone(questions),
    currentId: questions[0].id,
    usedIds: [questions[0].id],
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
  | { type: "newMatch" }
  | { type: "endGame" }
  | { type: "resumeGame" }
  | { type: "editQuestion"; question: Question }
  | { type: "renameTeam"; team: Team; name: string }
  | { type: "adjustScore"; team: Team; delta: number };

export const currentQuestion = (s: GameState) =>
  s.questions.find((x) => x.id === s.currentId) ?? s.questions[0];

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
      if (strikes === 3)
        return { ...s, strikes, phase: "steal", controlTeam: s.active, active: other(s.active) };
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
        const pool = unused.length ? unused : s.questions.filter((x) => x.id !== s.currentId);
        if (!pool.length) return s;
        id = a.random
          ? pool[Math.floor((a.rand ?? Math.random()) * pool.length) % pool.length].id
          : pool[0].id;
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
      const fresh = initialState(s.questions);
      return { ...fresh, teamNames: s.teamNames };
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
    return s?.version === 1 && Array.isArray(s.questions) ? s : null;
  } catch {
    return null;
  }
}
