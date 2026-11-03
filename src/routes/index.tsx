import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  currentQuestion,
  initialState,
  loadState,
  reducer,
  STORAGE_KEY,
  winner,
  type Action,
  type GameState,
  type Question,
  type Team,
} from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KINGSON SURVEY SHOW — Live Game Show" },
      { name: "description", content: "Host a family survey game show live: reveal answers, track strikes and team scores from one tab." },
      { property: "og:title", content: "KINGSON SURVEY SHOW" },
      { property: "og:description", content: "A one-host survey game show built for TikTok LIVE." },
    ],
  }),
  component: Game,
});

type Wrapped = { s: GameState; hydrated: boolean };
function wrapped(w: Wrapped, a: Action | { type: "__load"; s: GameState }): Wrapped {
  if (a.type === "__load") return { s: a.s, hydrated: true };
  return { ...w, s: reducer(w.s, a) };
}

const btn = "rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-35 disabled:cursor-not-allowed";
const btnGold = `${btn} bg-primary text-primary-foreground hover:brightness-110`;
const btnBlue = `${btn} bg-secondary text-secondary-foreground hover:brightness-110`;
const btnGhost = `${btn} border border-border bg-muted text-foreground hover:bg-card`;
const btnDanger = `${btn} bg-destructive text-destructive-foreground hover:brightness-110`;
type TimerState = { duration: number; remaining: number; running: boolean; endsAt: number | null };
const TIMER_KEY = "kingson-survey-show-timer-v1";
const ROUND_KEY = "kingson-survey-show-round-v1";
type RoundMode = "classic" | "double" | "triple" | "bonus";
type BonusAnswer = { text: string; points: number };
type BonusQuestion = { prompt: string; answers: BonusAnswer[] };
const bonusQuestion = (prompt: string, answers: [string,string,string,string,string]): BonusQuestion => ({
  prompt, answers: answers.map((text, i) => ({ text, points: [64,51,37,27,21][i] })),
});
// A separate, large bonus bank. These prompts are not reused from the regular survey bank.
const BONUS_DEFAULTS: BonusQuestion[] = [
  bonusQuestion("Name something people do when they hear surprising news.", ["Ask if it is true","Tell someone else","Gasp or shout","Check their phone","Laugh"]),
  bonusQuestion("What might you see at a traditional celebration?", ["Dancing","Special clothes","Music","Food","Speeches"]),
  bonusQuestion("Name something people do to cheer up a friend.", ["Make them laugh","Give advice","Buy them a treat","Listen to them","Take them out"]),
  bonusQuestion("What is something people do when they win a prize?", ["Celebrate","Thank people","Take photos","Tell family","Share online"]),
  bonusQuestion("Name something you would find backstage at a concert.", ["Microphones","Musical instruments","Speakers","Dressing room","Stage crew"]),
  bonusQuestion("What might make someone cancel a party?", ["Bad weather","Illness","Not enough money","Venue problem","Few guests"]),
  bonusQuestion("Name something people collect as a hobby.", ["Coins","Stamps","Shoes","Action figures","Sports cards"]),
  bonusQuestion("What is something you might see in a beauty salon?", ["Hair dryers","Mirrors","Chairs","Nail polish","Hair products"]),
  bonusQuestion("Name something people do before taking a group photo.", ["Smile","Arrange themselves","Fix their hair","Choose a pose","Check the camera"]),
  bonusQuestion("What might a person do after receiving a love message?", ["Smile","Reply quickly","Read it again","Show a friend","Feel shy"]),
  bonusQuestion("Name something that makes a live show exciting.", ["Audience reactions","Funny moments","Surprise guests","Music","Competition"]),
  bonusQuestion("What might people do during a blackout at a party?", ["Use phone lights","Sing together","Tell stories","Light candles","Go outside"]),
  bonusQuestion("Name something people do when they meet a celebrity.", ["Ask for a photo","Say hello","Ask for an autograph","Get excited","Record a video"]),
  bonusQuestion("What is something you might see at a street festival?", ["Food stalls","Live music","Dancers","Crowds","Decorations"]),
  bonusQuestion("Name something people do to prepare for a big performance.", ["Rehearse","Choose an outfit","Practice lines","Warm up","Calm their nerves"]),
  bonusQuestion("What might make a person laugh during a serious moment?", ["A funny face","A silly noise","An unexpected comment","Remembering a joke","Someone stumbling"]),
  bonusQuestion("Name something people do when they cannot find their way.", ["Ask for directions","Use a map","Check GPS","Call someone","Look for signs"]),
  bonusQuestion("What is something a good team needs to succeed?", ["Teamwork","Communication","Practice","Trust","A good leader"]),
  bonusQuestion("Name something people do after a long day.", ["Rest","Take a shower","Eat","Watch something","Talk to family"]),
  bonusQuestion("What might you find at a community talent show?", ["Singers","Dancers","Comedians","Poets","Musicians"]),
  bonusQuestion("Name something people do to make a guest feel welcome.", ["Greet them warmly","Offer a seat","Serve refreshments","Introduce everyone","Show them around"]),
  bonusQuestion("What is something that can spoil a live broadcast?", ["Poor internet","Power outage","Bad sound","Technical problems","Background noise"]),
  bonusQuestion("Name something people do when their favorite song plays.", ["Sing along","Dance","Turn it louder","Record a video","Call a friend"]),
  bonusQuestion("What might people bring to a picnic besides food?", ["Blanket","Drinks","Games","Music speaker","Camera"]),
  bonusQuestion("Name something that makes a great host.", ["Sense of humor","Confidence","Good listening","Energy","Quick thinking"]),
  bonusQuestion("What might someone do to celebrate a personal achievement?", ["Treat themselves","Tell family","Take photos","Go out","Give thanks"]),
  bonusQuestion("Name something people do while waiting for an important announcement.", ["Check the time","Talk quietly","Pray","Look at the speaker","Use their phone"]),
  bonusQuestion("What is something you might see at a school prize-giving day?", ["Trophies","Certificates","Students","Parents","Speeches"]),
  bonusQuestion("Name something people do when they feel embarrassed.", ["Blush","Laugh nervously","Look away","Apologize","Cover their face"]),
  bonusQuestion("Name something people pack for a weekend trip.", ["Clothes","Toothbrush","Phone charger","Shoes","Travel documents"]),
  bonusQuestion("What might make someone late for work?", ["Traffic","Oversleeping","Public transport delay","Bad weather","Looking for keys"]),
  bonusQuestion("Name something people do to relax on a day off.", ["Sleep in","Watch movies","Visit friends","Go for a walk","Listen to music"]),
  bonusQuestion("What might you find in a busy restaurant?", ["Tables","Waiters","Menus","Food","Customers"]),
  bonusQuestion("Name something people often forget when leaving home.", ["Keys","Phone","Wallet","Lunch","Umbrella"]),
  bonusQuestion("What do people do when they receive unexpected visitors?", ["Welcome them","Offer a seat","Make tea","Tidy up","Prepare food"]),
  bonusQuestion("Name something you might see at a wedding.", ["Bride and groom","Wedding cake","Flowers","Dancing","Photographer"]),
  bonusQuestion("What might people do during a power cut at home?", ["Light candles","Use a torch","Check the fuse","Use phone light","Go outside"]),
  bonusQuestion("Name something people enjoy doing with friends.", ["Chatting","Eating together","Playing games","Going out","Watching films"]),
  bonusQuestion("What might you buy at a supermarket?", ["Food","Drinks","Cleaning products","Toiletries","Snacks"]),
  bonusQuestion("Name something that helps people wake up in the morning.", ["Alarm clock","Coffee","Shower","Sunlight","Someone calling"]),
  bonusQuestion("What might you hear at a football match?", ["Crowd cheering","Whistle","Commentary","Singing","Booing"]),
  bonusQuestion("Name something people do before going to bed.", ["Brush teeth","Set alarm","Pray","Check phone","Change clothes"]),
  bonusQuestion("What might someone do after making a mistake?", ["Apologize","Correct it","Explain what happened","Ask for help","Learn from it"]),
  bonusQuestion("Name something you would take to the beach.", ["Towel","Sunscreen","Swimwear","Sunglasses","Water"]),
  bonusQuestion("What can make a family gathering memorable?", ["Funny stories","Good food","Games","Music","Family photos"]),
  bonusQuestion("Name something people do when they are nervous.", ["Fidget","Pace around","Bite nails","Talk quickly","Take deep breaths"]),
  bonusQuestion("What might you find inside a school bag?", ["Books","Pens","Notebooks","Lunch","Water bottle"]),
  bonusQuestion("Name something people do to celebrate a birthday.", ["Eat cake","Sing","Give presents","Have a party","Take photos"]),
  bonusQuestion("Name something people do when they hear their favorite song.", ["Sing along","Dance","Smile","Turn up the volume","Share it with a friend"]),
  bonusQuestion("What might you see at an airport?", ["Airplanes","Luggage","Passengers","Security staff","Departure screens"]),
];
const BONUS_USED_KEY = "kingson-survey-show-bonus-used-v1";
const SURVEY_USED_KEY = "kingson-survey-show-survey-used-v1";
function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}
function drawBonusQuestions(): BonusQuestion[] {
  let used: string[] = [];
  try { used = JSON.parse(localStorage.getItem(BONUS_USED_KEY) ?? "[]") as string[]; } catch { used = []; }
  const available = shuffled(BONUS_DEFAULTS.filter((q) => !used.includes(q.prompt)));
  let picked = available.slice(0, 5);
  let nextUsed = [...used, ...picked.map((q) => q.prompt)];
  if (picked.length < 5) {
    const refill = shuffled(BONUS_DEFAULTS.filter((q) => !picked.some((p) => p.prompt === q.prompt)));
    picked = [...picked, ...refill.slice(0, 5 - picked.length)];
    nextUsed = picked.map((q) => q.prompt);
  }
  localStorage.setItem(BONUS_USED_KEY, JSON.stringify(nextUsed));
  return picked;
}
function normalizeBonusQuestions(value: unknown): BonusQuestion[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: 5 }, (_, index) => {
    const fallback = BONUS_DEFAULTS[index % BONUS_DEFAULTS.length] ?? BONUS_DEFAULTS[0];
    const candidate = source[index] as Partial<BonusQuestion> | undefined;
    if (!candidate || typeof candidate.prompt !== "string" || !candidate.prompt.trim() || !Array.isArray(candidate.answers)) return structuredClone(fallback);
    const answers = Array.from({ length: 5 }, (_, answerIndex) => {
      const raw = candidate.answers?.[answerIndex] as Partial<BonusAnswer> | string | undefined;
      const defaultAnswer = fallback.answers[answerIndex];
      if (typeof raw === "string") return { text: raw, points: defaultAnswer.points };
      if (!raw || typeof raw.text !== "string") return { ...defaultAnswer };
      return { text: raw.text, points: Number.isFinite(raw.points) ? Number(raw.points) : defaultAnswer.points };
    });
    return { prompt: candidate.prompt, answers };
  });
}
function drawSurveyIds(questions: Question[]): string[] {
  let used: string[] = [];
  try { used = JSON.parse(localStorage.getItem(SURVEY_USED_KEY) ?? "[]") as string[]; } catch { used = []; }
  const available = shuffled(questions.filter((q) => !used.includes(q.id)));
  let picked = available.slice(0, 6);
  let nextUsed = [...used, ...picked.map((q) => q.id)];
  if (picked.length < 6) {
    const refill = shuffled(questions.filter((q) => !picked.some((p) => p.id === q.id)));
    picked = [...picked, ...refill.slice(0, 6 - picked.length)];
    nextUsed = picked.map((q) => q.id);
  }
  localStorage.setItem(SURVEY_USED_KEY, JSON.stringify(nextUsed));
  return picked.map((q) => q.id);
}
type BonusState = { questions: BonusQuestion[]; index: number; accepted: string[]; total: number; responses: string[]; correctCount: number; pendingAnswers?: string[]; revealed?: boolean };
const BONUS_STORAGE_KEY = "kingson-survey-show-bonus-v1";
const ROUND_QUESTIONS_KEY = "kingson-survey-show-round-questions-v1";
const RESULT_KEY = "kingson-survey-show-round-result-v1";
const GAME_STARTED_KEY = "kingson-survey-show-game-started-v1";
type RoundQuestions = { classic: string; double: string; triple: string };
type RoundQuestionsByTeam = Record<Team, RoundQuestions>;
type CountdownTarget = RoundMode | "handover";
type TeamBreakdown = { classic: number; double: number; triple: number; bonus: number; bonusExtra: number };
type FinalResults = { team: Team; breakdown: TeamBreakdown; total: number; finalMatch: boolean; champion: Team | "tie" | null; teams?: Record<Team, { breakdown: TeamBreakdown; total: number }> };
type RoundResult = { mode: Exclude<RoundMode, "bonus">; team: Team; points: number; nextTarget: RoundMode; countdownSeconds: number };


function Game() {
  const [{ s, hydrated }, dispatch] = useReducer(wrapped, null, () => ({ s: initialState(), hydrated: false }));
  const [stageOnly, setStageOnly] = useState(false);
  const [audienceGameStarted, setAudienceGameStarted] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [themePlayerActive, setThemePlayerActive] = useState(false);
  const [gameplayMusicActive, setGameplayMusicActive] = useState(false);
  const [help, setHelp] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [strikeFlash, setStrikeFlash] = useState(0);
  const [timer, setTimer] = useState<TimerState>({ duration: 60, remaining: 60, running: false, endsAt: null });
  const [roundMode, setRoundMode] = useState<RoundMode>("classic");
  const [roundQuestions, setRoundQuestions] = useState<RoundQuestionsByTeam | null>(null);
  const [bonus, setBonus] = useState<BonusState>({ questions: BONUS_DEFAULTS, index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false });
  const [bonusGuess, setBonusGuess] = useState("");
  const [bonusFeedback, setBonusFeedback] = useState("");
  const [showCountdown, setShowCountdown] = useState<{ remaining: number; target: CountdownTarget } | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [finalResults, setFinalResults] = useState<FinalResults | null>(null);
  const [teamLeg, setTeamLeg] = useState<1 | 2>(1);
  const [roundPoints, setRoundPoints] = useState<Record<Team, TeamBreakdown>>({
    A: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 },
    B: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 },
  });
  const roundStartScoresRef = useRef<Record<Team, number>>({ A: 0, B: 0 });
  const transitionLockRef = useRef(false);

  useEffect(() => {
    const isStage = new URLSearchParams(window.location.search).get("stage") === "1";
    setStageOnly(isStage);
    if (isStage) setWelcomeOpen(false);
    const startedFlag = localStorage.getItem(GAME_STARTED_KEY) === "true";
    setAudienceGameStarted(startedFlag);
    if (!isStage) localStorage.setItem(GAME_STARTED_KEY, "false");
    const saved = loadState();

    // The audience stage tab must join the host's current match. Opening the
    // host page, however, always starts a clean match with fresh questions.
    if (!isStage) {
      localStorage.setItem(GAME_STARTED_KEY, "false");
      setAudienceGameStarted(false);
      const fresh = initialState(saved?.questions);
      if (saved?.teamNames) fresh.teamNames = saved.teamNames;
      const drawnIds = drawSurveyIds(fresh.questions);
      const assignments: RoundQuestionsByTeam = {
        A: { classic: drawnIds[0] ?? fresh.currentId, double: drawnIds[1] ?? fresh.currentId, triple: drawnIds[2] ?? fresh.currentId },
        B: { classic: drawnIds[3] ?? fresh.currentId, double: drawnIds[4] ?? fresh.currentId, triple: drawnIds[5] ?? fresh.currentId },
      };
      const started = reducer({ ...fresh, usedIds: [] }, { type: "next", id: assignments.A.classic });
      dispatch({ type: "__load", s: started });
      setRoundQuestions(assignments);
      localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments));
      setRoundMode("classic");
      localStorage.setItem(ROUND_KEY, "classic");
      const freshTimer = { duration: 60, remaining: 60, running: false, endsAt: null };
      setTimer(freshTimer);
      localStorage.setItem(TIMER_KEY, JSON.stringify(freshTimer));
      setRoundResult(null);
      localStorage.removeItem(RESULT_KEY);
      setFinalResults(null);
      localStorage.removeItem("kingson-survey-show-final-results-v1");
      setShowCountdown(null);
      localStorage.removeItem("kingson-survey-show-countdown-v1");
      setTeamLeg(1);
      setRoundPoints({
        A: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 },
        B: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 },
      });
      setAutoPlay(false);
      transitionLockRef.current = false;
      const freshBonus = { ...bonus, questions: drawBonusQuestions(), index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false };
      setBonus(freshBonus);
      localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(freshBonus));
      return;
    }

    const loadedGame = saved ?? initialState();
    dispatch({ type: "__load", s: loadedGame });
    try {
      const storedRounds = localStorage.getItem(ROUND_QUESTIONS_KEY);
      const parsed = storedRounds ? JSON.parse(storedRounds) as RoundQuestionsByTeam | RoundQuestions : null;
      const validIds = new Set(loadedGame.questions.map((question) => question.id));
      const pool = [...loadedGame.questions.filter((question) => question.id !== loadedGame.currentId)].sort(() => Math.random() - 0.5);
      const legacyA = parsed && "classic" in parsed ? parsed as RoundQuestions : null;
      const validSet = (set: RoundQuestions | undefined) => Boolean(set && validIds.has(set.classic) && validIds.has(set.double) && validIds.has(set.triple) && new Set([set.classic,set.double,set.triple]).size === 3);
      const assignments: RoundQuestionsByTeam = parsed && "A" in parsed && validSet(parsed.A) && validSet(parsed.B)
        ? parsed as RoundQuestionsByTeam
        : {
            A: legacyA && validSet(legacyA) ? legacyA : { classic: loadedGame.currentId, double: pool[0]?.id ?? loadedGame.currentId, triple: pool[1]?.id ?? pool[0]?.id ?? loadedGame.currentId },
            B: { classic: pool[2]?.id ?? pool[0]?.id ?? loadedGame.currentId, double: pool[3]?.id ?? pool[1]?.id ?? loadedGame.currentId, triple: pool[4]?.id ?? pool[2]?.id ?? loadedGame.currentId },
          };
      setRoundQuestions(assignments);
      localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments));
    } catch {
      const available = loadedGame.questions.filter((question) => question.id !== loadedGame.currentId);
      const assignments = { A: { classic: loadedGame.currentId, double: available[0]?.id ?? loadedGame.currentId, triple: available[1]?.id ?? available[0]?.id ?? loadedGame.currentId }, B: { classic: available[2]?.id ?? loadedGame.currentId, double: available[3]?.id ?? loadedGame.currentId, triple: available[4]?.id ?? loadedGame.currentId } };
      setRoundQuestions(assignments);
      localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments));
    }
    try { const savedTimer = localStorage.getItem(TIMER_KEY); if (savedTimer) setTimer(JSON.parse(savedTimer) as TimerState); } catch { /* Keep defaults. */ }
    try { const savedRound = localStorage.getItem(ROUND_KEY); if (savedRound) setRoundMode(savedRound as RoundMode); } catch { /* Keep default. */ }
    try { const savedResult = localStorage.getItem(RESULT_KEY); if (savedResult) setRoundResult(JSON.parse(savedResult) as RoundResult); } catch { /* Keep default. */ }
    try { const savedFinal = localStorage.getItem("kingson-survey-show-final-results-v1"); if (savedFinal) setFinalResults(JSON.parse(savedFinal) as FinalResults); } catch { /* Keep default. */ }
    try {
      const savedBonus = localStorage.getItem(BONUS_STORAGE_KEY);
      if (savedBonus) {
        const parsed = JSON.parse(savedBonus) as Partial<BonusState>;
        const questions = normalizeBonusQuestions(parsed.questions);
        const index = Number.isInteger(parsed.index) ? Math.min(4, Math.max(0, Number(parsed.index))) : 0;
        const safeBonus: BonusState = {
          questions, index,
          accepted: Array.isArray(parsed.accepted) ? parsed.accepted.filter((x): x is string => typeof x === "string") : [],
          total: Number.isFinite(parsed.total) ? Number(parsed.total) : 0,
          responses: Array.isArray(parsed.responses) ? Array.from({length:5},(_,i)=>typeof parsed.responses?.[i]==="string"?parsed.responses[i] as string:"") : ["","","","",""],
          pendingAnswers: Array.isArray(parsed.pendingAnswers) ? Array.from({length:5},(_,i)=>typeof parsed.pendingAnswers?.[i]==="string"?parsed.pendingAnswers[i] as string:"") : ["","","","",""],
          revealed: Boolean(parsed.revealed),
          correctCount: Number.isFinite(parsed.correctCount) ? Number(parsed.correctCount) : 0,
        };
        setBonus(safeBonus);
        localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(safeBonus));
      }
    } catch {
      const safeBonus = { ...bonus, questions: normalizeBonusQuestions(null), index: 0, accepted: [], total: 0, responses: ["","","","",""], pendingAnswers: ["","","","",""], revealed: false, correctCount: 0 };
      setBonus(safeBonus);
      localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(safeBonus));
    }
  }, []);
  // Synchronize the host tab and audience stage tab on the same computer.
  useEffect(() => {
    const syncFromOtherTab = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue) as GameState;
        if (next && Array.isArray(next.questions)) dispatch({ type: "__load", s: next });
      } catch {
        // Ignore invalid storage updates.
      }
    };
    const syncTimer = (event: StorageEvent) => { if (event.key === TIMER_KEY && event.newValue) { try { setTimer(JSON.parse(event.newValue) as TimerState); } catch { /* Ignore invalid updates. */ } } };
    const syncRound = (event: StorageEvent) => { if (event.key === ROUND_KEY && event.newValue) setRoundMode(event.newValue as RoundMode); };
    const syncBonus = (event: StorageEvent) => { if (event.key === BONUS_STORAGE_KEY && event.newValue) { try { setBonus(JSON.parse(event.newValue) as BonusState); } catch { /* Ignore invalid updates. */ } } };
    const syncCountdown = (event: StorageEvent) => { if (event.key === "kingson-survey-show-countdown-v1") { try { setShowCountdown(event.newValue ? JSON.parse(event.newValue) : null); } catch { /* Ignore invalid updates. */ } } };
    const syncGameStarted = (event: StorageEvent) => { if (event.key === GAME_STARTED_KEY) setAudienceGameStarted(event.newValue === "true"); };
    const syncResult = (event: StorageEvent) => { if (event.key === RESULT_KEY) { try { setRoundResult(event.newValue ? JSON.parse(event.newValue) as RoundResult : null); } catch { /* Ignore invalid updates. */ } } };
    const syncFinal = (event: StorageEvent) => { if (event.key === "kingson-survey-show-final-results-v1") { try { setFinalResults(event.newValue ? JSON.parse(event.newValue) as FinalResults : null); } catch { /* Ignore invalid updates. */ } } };
    window.addEventListener("storage", syncFromOtherTab);
    window.addEventListener("storage", syncTimer);
    window.addEventListener("storage", syncRound);
    window.addEventListener("storage", syncBonus);
    window.addEventListener("storage", syncCountdown);
    window.addEventListener("storage", syncGameStarted);
    window.addEventListener("storage", syncResult);
    window.addEventListener("storage", syncFinal);
    return () => {
      window.removeEventListener("storage", syncFromOtherTab);
      window.removeEventListener("storage", syncTimer);
      window.removeEventListener("storage", syncRound);
      window.removeEventListener("storage", syncBonus);
      window.removeEventListener("storage", syncCountdown);
      window.removeEventListener("storage", syncGameStarted);
      window.removeEventListener("storage", syncResult);
      window.removeEventListener("storage", syncFinal);
    };
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }, [s, hydrated]);
  const changeRound = (mode: RoundMode) => {
    if (mode === roundMode) return;
    // Keep one assigned survey question for each main round throughout this match.
    // Returning to Classic/Double/Triple restores that exact question with a clean board.
    if (mode !== "bonus" && roundQuestions) {
      const questionId = roundQuestions[s.active][mode];
      const freshGame = reducer(s, { type: "next", id: questionId });
      dispatch({ type: "__load", s: { ...freshGame, active: s.active, controlTeam: s.active } });
    }
    setRoundMode(mode);
    localStorage.setItem(ROUND_KEY, mode);
    if (mode === "bonus") {
      const freshBonus = { ...bonus, questions: drawBonusQuestions(), index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false };
      setBonus(freshBonus);
      localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(freshBonus));
      setBonusGuess("");
      setBonusFeedback("");
    }
    const freshTimer = { duration: 60, remaining: 60, running: false, endsAt: null };
    setTimer(freshTimer);
    localStorage.setItem(TIMER_KEY, JSON.stringify(freshTimer));
  };
  const updateBonus = (next: BonusState) => { setBonus(next); localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(next)); };
  const submitBonusGuess = () => {
    const guess = bonusGuess.trim();
    if (!guess) return;
    const pendingAnswers = [...(bonus.pendingAnswers ?? ["", "", "", "", ""])];
    const questionIndex = bonus.index;
    if (!timer.running || bonus.revealed) { setBonusFeedback("The Bonus Mission timer has finished."); return; }
    if (pendingAnswers[questionIndex]) { setBonusFeedback("An answer has already been recorded for this question."); setBonusGuess(""); return; }
    pendingAnswers[questionIndex] = guess;
    const nextIndex = pendingAnswers.findIndex((answer) => !answer);
    updateBonus({ ...bonus, pendingAnswers, index: nextIndex < 0 ? 4 : nextIndex });
    setBonusFeedback("Answer recorded privately. The answer and points will be revealed when time is up.");
    setBonusGuess("");
  };
  const finishBonusMission = () => {
    if (bonus.revealed) return;
    const pendingAnswers = bonus.pendingAnswers ?? ["", "", "", "", ""];
    let correctCount = 0;
    let total = 0;
    const responses = bonus.questions.map((question, index) => {
      const guess = pendingAnswers[index]?.trim();
      if (!guess) return "No answer";
      const match = question.answers.find((answer) => answerMatches(guess, answer.text));
      if (!match) return "No answer";
      correctCount += 1; total += match.points; return match.text;
    });
    const extraBonus = correctCount >= 3 ? 500 : 0;
    const team = s.active;
    const pointsEarned = total + extraBonus;
    const accepted = bonus.questions.flatMap((question, index) => {
      const guess = pendingAnswers[index]?.trim();
      const match = guess ? question.answers.find((answer) => answerMatches(guess, answer.text)) : undefined;
      return match ? [index + ":" + normText(match.text)] : [];
    });
    updateBonus({ ...bonus, index: 4, pendingAnswers, responses, accepted, total, correctCount, revealed: true });
    if (pointsEarned > 0) actRef.current({ type: "adjustScore", team, delta: pointsEarned });
    setBonusFeedback("Bonus Mission complete: " + correctCount + "/5 correct. " + total + " points" + (extraBonus ? " + 500 bonus points." : "."));
    if (correctCount > 0) playAudienceApplause();
    if (extraBonus) playRoundWinFanfare();
    const breakdown = { ...(roundPoints[team] ?? { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 }), bonus: total, bonusExtra: extraBonus };
    const finalMatch = teamLeg === 2;
    const totalScore = s.scores[team] + pointsEarned;
    const opponent: Team = team === "A" ? "B" : "A";
    const teams = finalMatch ? { [team]: { breakdown, total: totalScore }, [opponent]: { breakdown: roundPoints[opponent] ?? { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 }, total: s.scores[opponent] } } as Record<Team, { breakdown: TeamBreakdown; total: number }> : undefined;
    const final = { team, breakdown, total: totalScore, finalMatch, champion: finalMatch ? (totalScore > s.scores[opponent] ? team : totalScore < s.scores[opponent] ? opponent : "tie") : null, ...(teams ? { teams } : {}) };
    if (finalMatch) setGameplayMusicActive(false);
    setFinalResults(final);
    localStorage.setItem("kingson-survey-show-final-results-v1", JSON.stringify(final));
    setAutoPlay(false);
    if (finalMatch) playRoundWinFanfare();
  };
  const updateTimer = (next: TimerState) => {
    setTimer(next);
    localStorage.setItem(TIMER_KEY, JSON.stringify(next));
  };

  const beginCountdown = (target: CountdownTarget, seconds: number) => {
    transitionLockRef.current = true;
    const next = { remaining: seconds, target };
    setShowCountdown(next);
    localStorage.setItem("kingson-survey-show-countdown-v1", JSON.stringify(next));
  };
  const playNow = () => {
    setThemePlayerActive(false);
    setGameplayMusicActive(true);
    setAudienceGameStarted(true);
    localStorage.setItem(GAME_STARTED_KEY, "true");
    roundStartScoresRef.current = { ...s.scores };
    setRoundResult(null);
    setFinalResults(null);
    setTeamLeg(1);
    setRoundPoints({ A: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 }, B: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 } });
    setAutoPlay(true);
    beginCountdown(roundMode === "bonus" ? "classic" : roundMode, 3);
  };
  const finishMainRound = (mode: Exclude<RoundMode, "bonus">, nextTarget: RoundMode, countdownSeconds: number) => {
    const scoringTeam = s.phase === "steal" ? s.controlTeam : s.active;
    const settled = s.phase === "awarded" ? s : reducer(s, { type: "award", team: scoringTeam });
    if (settled !== s) dispatch({ type: "__load", s: settled });
    const team = scoringTeam;
    const points = Math.max(0, settled.scores[team] - roundStartScoresRef.current[team]);
    setRoundPoints((previous) => ({ ...previous, [team]: { ...previous[team], [mode]: points } }));
    setTimer((current) => ({ ...current, running: false, endsAt: null }));
    localStorage.setItem(TIMER_KEY, JSON.stringify({ ...timer, running: false, endsAt: null }));
    const result = { mode, team, points, nextTarget, countdownSeconds };
    setRoundResult(result);
    localStorage.setItem(RESULT_KEY, JSON.stringify(result));
    playRoundWinFanfare();
    playAudienceApplause();
  };
  useEffect(() => {
    if (!roundResult || stageOnly) return;
    const timeout = window.setTimeout(() => {
      const next = roundResult.nextTarget;
      const seconds = roundResult.countdownSeconds;
      setRoundResult(null);
      localStorage.removeItem(RESULT_KEY);
      beginCountdown(next, seconds);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [roundResult, stageOnly]);
  useEffect(() => {
    if (!finalResults || finalResults.finalMatch || stageOnly || showCountdown) return;
    const timeout = window.setTimeout(() => beginCountdown("handover", 30), 3000);
    return () => window.clearTimeout(timeout);
  }, [finalResults, stageOnly, showCountdown]);
  useEffect(() => {
    if (!showCountdown || stageOnly) return;
    const interval = window.setInterval(() => {
      setShowCountdown((current) => {
        if (!current) return null;
        if (current.remaining > 1) {
          const next = { ...current, remaining: current.remaining - 1 };
          localStorage.setItem("kingson-survey-show-countdown-v1", JSON.stringify(next));
          return next;
        }
        localStorage.removeItem("kingson-survey-show-countdown-v1");
        if (current.target === "handover") {
          const nextTeam: Team = stateRef.current.active === "A" ? "B" : "A";
          const currentState = stateRef.current;
          const questionId = roundQuestions?.[nextTeam].classic;
          const switched = questionId ? reducer({ ...currentState, active: nextTeam, controlTeam: nextTeam, phase: "play" }, { type: "next", id: questionId }) : { ...currentState, active: nextTeam, controlTeam: nextTeam, phase: "play" as const };
          dispatch({ type: "__load", s: switched });
          setRoundMode("classic");
          localStorage.setItem(ROUND_KEY, "classic");
          setTeamLeg(2);
          setFinalResults(null);
          localStorage.removeItem("kingson-survey-show-final-results-v1");
          setRoundPoints((previous) => ({ ...previous, [nextTeam]: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 } }));
          const freshBonus = { ...bonus, index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false };
          setBonus(freshBonus);
          localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(freshBonus));
          setAutoPlay(true);
          roundStartScoresRef.current = { ...switched.scores };
          const started = { duration: 60, remaining: 60, running: true, endsAt: Date.now() + 60000 };
          updateTimer(started);
        } else if (current.target === "bonus") {
          changeRound("bonus");
          setAutoPlay(false);
          roundStartScoresRef.current = { ...stateRef.current.scores };
          updateTimer({ duration: 60, remaining: 60, running: true, endsAt: Date.now() + 60000 });
        } else {
          if (current.target !== roundMode) changeRound(current.target);
          roundStartScoresRef.current = { ...stateRef.current.scores };
          const started = { duration: 60, remaining: 60, running: true, endsAt: Date.now() + 60000 };
          updateTimer(started);
        }
        transitionLockRef.current = false;
        return null;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [showCountdown, stageOnly, roundMode]);
  useEffect(() => {
    if (!autoPlay || stageOnly || showCountdown || roundResult || transitionLockRef.current || roundMode === "bonus") return;

    const timeExpired = !timer.running && timer.remaining === 0;
    // When the clock expires, bank the playing team's points first. The
    // awarded phase then drives the same orderly reveal used after 3 strikes.
    if (timeExpired && s.phase !== "awarded") {
      actRef.current({ type: "award", team: s.active });
      return;
    }

    const nextHidden = s.tiles.findIndex((tile) => tile === "hidden");
    if (s.phase === "awarded" && nextHidden >= 0) {
      const revealTimer = window.setTimeout(() => {
        actRef.current({ type: "reveal", index: nextHidden });
      }, 2000);
      return () => window.clearTimeout(revealTimer);
    }

    const allRevealed = s.tiles.length > 0 && s.tiles.every((tile) => tile !== "hidden");
    if (s.phase === "awarded" && allRevealed) {
      transitionLockRef.current = true;
      const postRevealPause = window.setTimeout(() => {
        transitionLockRef.current = false;
        if (roundMode === "classic") finishMainRound("classic", "double", 3);
        else if (roundMode === "double") finishMainRound("double", "triple", 3);
        else if (roundMode === "triple") finishMainRound("triple", "bonus", 5);
      }, 2000);
      return () => {
        window.clearTimeout(postRevealPause);
        transitionLockRef.current = false;
      };
    }
    if (allRevealed) {
      if (roundMode === "classic") finishMainRound("classic", "double", 3);
      else if (roundMode === "double") finishMainRound("double", "triple", 3);
      else if (roundMode === "triple") finishMainRound("triple", "bonus", 5);
    }
  }, [s, s.tiles, timer.running, timer.remaining, autoPlay, showCountdown, roundResult, roundMode, stageOnly]);  useEffect(() => {
    if (stageOnly || roundMode !== "bonus" || timer.running || timer.remaining !== 0 || bonus.revealed) return;
    finishBonusMission();
  }, [stageOnly, roundMode, timer.running, timer.remaining, bonus, teamLeg]);
  // Both tabs count down from the same end time, so background-tab throttling
  // cannot pause the audience display.
  useEffect(() => {
    if (!timer.running || !timer.endsAt) return;
    const tick = () => setTimer((current) => {
      if (!current.running || !current.endsAt) return current;
      const remaining = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000));
      return { ...current, remaining, running: remaining > 0, endsAt: remaining > 0 ? current.endsAt : null };
    });
    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [timer.running, timer.endsAt]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const playCorrectBell = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      [880, 1174.66].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42 + index * 0.08);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + index * 0.08);
        oscillator.stop(now + 0.55 + index * 0.08);
      });
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playWrongBuzzer = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(145, now);
      oscillator.frequency.exponentialRampToValueAtTime(85, now + 0.38);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gain.gain.setValueAtTime(0.22, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playRoundWinFanfare = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        const start = now + index * 0.13;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.45);
      });
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playGrandWinnerFanfare = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      // A bold rising brass-like chord followed by a bright high note.
      const notes = [
        { frequency: 392, start: 0, duration: 0.72 },
        { frequency: 493.88, start: 0, duration: 0.72 },
        { frequency: 587.33, start: 0, duration: 0.72 },
        { frequency: 783.99, start: 0.48, duration: 1.05 },
        { frequency: 1046.5, start: 0.82, duration: 1.25 },
      ];
      notes.forEach(({ frequency, start, duration }) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, now + start);
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.19, now + start + 0.04);
        gain.gain.setValueAtTime(0.19, now + start + duration * 0.55);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + start);
        oscillator.stop(now + start + duration + 0.03);
      });
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playAudienceApplause = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;

      // A short synthetic crowd swell with many crisp applause claps.
      const crowdLength = 2.4;
      const crowdBuffer = context.createBuffer(1, Math.floor(context.sampleRate * crowdLength), context.sampleRate);
      const crowdData = crowdBuffer.getChannelData(0);
      for (let i = 0; i < crowdData.length; i++) {
        const fadeIn = Math.min(1, i / (context.sampleRate * 0.18));
        const fadeOut = Math.min(1, (crowdData.length - i) / (context.sampleRate * 0.45));
        crowdData[i] = (Math.random() * 2 - 1) * fadeIn * fadeOut;
      }
      const crowd = context.createBufferSource();
      const crowdFilter = context.createBiquadFilter();
      const crowdGain = context.createGain();
      crowd.buffer = crowdBuffer;
      crowdFilter.type = "bandpass";
      crowdFilter.frequency.setValueAtTime(720, now);
      crowdFilter.Q.setValueAtTime(0.65, now);
      crowdGain.gain.setValueAtTime(0.0001, now);
      crowdGain.gain.exponentialRampToValueAtTime(0.075, now + 0.35);
      crowdGain.gain.exponentialRampToValueAtTime(0.0001, now + crowdLength);
      crowd.connect(crowdFilter);
      crowdFilter.connect(crowdGain);
      crowdGain.connect(context.destination);
      crowd.start(now);
      crowd.stop(now + crowdLength);

      for (let i = 0; i < 34; i++) {
        const start = now + Math.random() * 1.9;
        const duration = 0.035 + Math.random() * 0.045;
        const length = Math.floor(context.sampleRate * duration);
        const buffer = context.createBuffer(1, length, context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < length; j++) {
          data[j] = (Math.random() * 2 - 1) * (1 - j / length);
        }
        const clap = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        clap.buffer = buffer;
        filter.type = "highpass";
        filter.frequency.setValueAtTime(1100 + Math.random() * 1500, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12 + Math.random() * 0.1, start + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        clap.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        clap.start(start);
        clap.stop(start + duration);
      }
    } catch {
      // Sound is optional; the game should still work if audio is unavailable.
    }
  };

  const playShowIntro = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;

      // Original royal game-show instrumental: bright melody, warm chords and a rising drum pulse.
      const melody = [
        [392,0,.55],[523.25,.42,.55],[659.25,.84,.55],[783.99,1.26,.72],
        [659.25,2.05,.42],[783.99,2.42,.42],[880,2.79,.42],[1046.5,3.18,1.05],
        [783.99,4.35,.38],[880,4.72,.38],[1046.5,5.09,1.25],
      ] as [number,number,number][];
      melody.forEach(([frequency,start,duration]) => {
        const oscillator=context.createOscillator(); const gain=context.createGain();
        oscillator.type="triangle"; oscillator.frequency.setValueAtTime(frequency,now+start);
        gain.gain.setValueAtTime(.0001,now+start); gain.gain.exponentialRampToValueAtTime(.105,now+start+.035);
        gain.gain.exponentialRampToValueAtTime(.0001,now+start+duration);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now+start); oscillator.stop(now+start+duration+.02);
      });
      // Layered royal chords give the intro a fuller, song-like sound.
      const chords=[[261.63,329.63,392],[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66]];
      chords.forEach((chord,ci)=>chord.forEach((frequency)=>{
        const start=now+ci*1.45+.08; const oscillator=context.createOscillator(); const gain=context.createGain();
        oscillator.type="sine"; oscillator.frequency.setValueAtTime(frequency,start);
        gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(.045,start+.12);
        gain.gain.exponentialRampToValueAtTime(.0001,start+1.32);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start+1.34);
      }));
      // A steady cinematic low pulse builds toward the final flourish.
      for(let i=0;i<18;i++){
        const start=now+.25+i*.31; const oscillator=context.createOscillator(); const gain=context.createGain();
        oscillator.type="sine"; oscillator.frequency.setValueAtTime(i>12?82:65,start);
        gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(i>12?.12:.075,start+.012);
        gain.gain.exponentialRampToValueAtTime(.0001,start+.16);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start+.17);
      }
      [392,493.88,587.33,783.99,987.77].forEach((frequency)=>{
        const start=now+6.05; const oscillator=context.createOscillator(); const gain=context.createGain();
        oscillator.type="triangle"; oscillator.frequency.setValueAtTime(frequency,start);
        gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(.14,start+.07);
        gain.gain.exponentialRampToValueAtTime(.0001,start+1.35);
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start+1.38);
      });
      window.setTimeout(()=>playAudienceApplause(),6500);
    } catch {
      // The show can still begin if audio is unavailable.
    }
  };

  // Keep the same Suno player mounted behind preparation after the welcome screen closes.
  // PLAY NOW removes the player to stop the music.
  const enterShow = () => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setThemePlayerActive(true);
    setWelcomeOpen(false);
  };

  const playTeamEntranceSound = (team: Team) => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      // A short, layered game-show fanfare with a melody and supporting harmony.
      const melody = team === "A"
        ? [523.25, 659.25, 783.99, 1046.5, 783.99]
        : [587.33, 739.99, 880, 1174.66, 880];
      melody.forEach((frequency, index) => {
        const start = now + index * 0.14;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.13, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.36);
      });
      // Add a warm musical chord beneath the final note.
      const chord = team === "A" ? [261.63, 329.63, 392] : [293.66, 369.99, 440];
      chord.forEach((frequency) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, now + 0.48);
        gain.gain.setValueAtTime(0.0001, now + 0.48);
        gain.gain.exponentialRampToValueAtTime(0.055, now + 0.54);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + 0.48);
        oscillator.stop(now + 1.18);
      });
    } catch {
      // Sound is optional; team selection must always work without audio.
    }
  };

  const playCountdownTick = (secondsLeft: number) => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(620 + (5 - secondsLeft) * 75, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.11);
    } catch {
      // Sound is optional; the countdown remains visible if audio is unavailable.
    }
  };

  const playTimeUpSound = () => {
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current ?? new AudioContextClass();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const now = context.currentTime;
      [0, 0.2].forEach((offset) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(190, now + offset);
        oscillator.frequency.exponentialRampToValueAtTime(95, now + offset + 0.28);
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.34);
      });
    } catch {
      // Sound is optional; the timer still ends normally if audio is unavailable.
    }
  };

  // Play countdown sounds only in the host tab, avoiding duplicate audio on the stage tab.
  const previousTimerRef = useRef({ remaining: timer.remaining, running: timer.running });
  useEffect(() => {
    const previous = previousTimerRef.current;
    if (!stageOnly) {
      if (timer.running && timer.remaining > 0 && timer.remaining <= 5 && timer.remaining !== previous.remaining) {
        playCountdownTick(timer.remaining);
      }
      if (previous.running && !timer.running && timer.remaining === 0 && previous.remaining > 0) {
        playTimeUpSound();
      }
    }
    previousTimerRef.current = { remaining: timer.remaining, running: timer.running };
  }, [timer.remaining, timer.running, stageOnly]);

  const act = (a: Action) => {
    if (a.type === "setActive" && s.active !== a.team && !stageOnly) {
      playTeamEntranceSound(a.team);
      playAudienceApplause();
    }
    if (a.type === "strike" && s.phase !== "awarded") {
      setStrikeFlash((n) => n + 1);
      playWrongBuzzer();
    }
    if (a.type === "reveal" && s.tiles[a.index] === "hidden") {
      playCorrectBell();
    }
    const nextState = reducer(s, a);
    if (a.type === "strike" && nextState.strikes >= 3 && nextState.phase === "awarded") {
      // Freeze the round clock while the revealed answers remain on screen.
      updateTimer({ ...timer, running: false, endsAt: null });
    }
    if (s.phase !== "awarded" && nextState.phase === "awarded") {
      playRoundWinFanfare();
      playAudienceApplause();
    }
    if (a.type === "endGame" && !s.gameOver && nextState.gameOver) {
      playGrandWinnerFanfare();
      playAudienceApplause();
    }
    if (a.type === "reveal" && roundMode !== "classic" && roundMode !== "bonus" && s.tiles[a.index] === "hidden" && s.phase !== "awarded") {
      const multiplier = roundMode === "double" ? 2 : 3;
      const extra = (q.answers[a.index]?.points ?? 0) * (multiplier - 1);
      if (s.phase === "steal" && nextState.lastAward) {
        dispatch({ type: "__load", s: { ...nextState, scores: { ...nextState.scores, [s.active]: nextState.scores[s.active] + extra }, lastAward: { ...nextState.lastAward, points: nextState.lastAward.points + extra } } });
      } else {
        dispatch({ type: "__load", s: { ...nextState, bank: nextState.bank + extra } });
      }
    } else dispatch(a);
  };
  const actRef = useRef(act);
  actRef.current = act;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select")) return;
      const k = e.key.toLowerCase();
      if (/^[1-6]$/.test(k)) actRef.current({ type: "reveal", index: Number(k) - 1 });
      else if (k === "n") actRef.current({ type: "next" });
      else if (k === "r") actRef.current({ type: "next", random: true });
 else if (k === "s") setStageOnly((v) => !v);
      else if (k === "escape") { setStageOnly(false); setHelp(false); setEditing(false); }
      else if (k === "h" || k === "?") setHelp((v) => !v);
      else return;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // helper to read latest state inside the key handler
  const stateRef = useRef(s);
  stateRef.current = s;

  const q = currentQuestion(s);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {!stageOnly && gameplayMusicActive && (
        <iframe
          title="Kingson Survey Show gameplay background music"
          src="https://suno.com/embed/67769172-521c-46da-98fe-5c9964ef3724?autoplay=1"
          className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
          allow="autoplay; encrypted-media"
          loading="eager"
          aria-hidden="true"
        />
      )}
      {!stageOnly && (
        <div className={(welcomeOpen ? "fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-[#090411] px-5 py-10 text-center" : "pointer-events-none fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-hidden bg-[#090411] px-5 py-10 text-center opacity-0")}>
          {themePlayerActive && (
            <iframe
              title="Kingson Survey Show background theme"
              src="https://suno.com/embed/10c14861-bbd4-45d8-a940-31e366f88733?autoplay=1"
              className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
              allow="autoplay; encrypted-media"
              loading="eager"
              aria-hidden="true"
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,33,132,0.48),transparent_58%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(234,179,8,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(192,132,252,.12) 1px, transparent 1px)", backgroundSize: "54px 54px" }} />
          <div className="relative z-10 mx-auto w-full max-w-3xl">
            <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full border-2 border-yellow-300/80 bg-gradient-to-br from-purple-950 via-black to-purple-900 shadow-[0_0_65px_rgba(168,85,247,.38)]">
              <LionCrest className="h-28 w-28" />
            </div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.45em] text-purple-200">The ultimate live game show</p>
            <h1 className="font-display text-4xl font-black uppercase leading-tight tracking-wider text-white drop-shadow-[0_0_24px_rgba(234,179,8,.35)] sm:text-6xl">
              Welcome to <span className="text-gold">Kingson</span><br />Survey Show
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              Think fast. Guess big. Bring your team and get ready for the battle of the answers!
            </p>
            <button
              type="button"
              onClick={enterShow}
              className="mt-10 inline-flex min-w-52 items-center justify-center gap-3 rounded-full border border-yellow-200/70 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-600 px-12 py-5 text-xl font-black uppercase tracking-[0.22em] text-slate-950 shadow-[0_0_35px_rgba(234,179,8,.42)] transition duration-300 hover:scale-105 hover:shadow-[0_0_55px_rgba(234,179,8,.65)] active:scale-95"
            >
              <span>▶</span> Play
            </button>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">One stage · Two teams · One champion</p>
          </div>
        </div>
      )}
      <div className={stageOnly ? "flex h-screen items-center justify-center bg-background" : "mx-auto flex flex-col gap-4 p-3 sm:max-w-[1500px] sm:flex-row sm:items-start lg:p-5"}>
        <div className={(stageOnly ? "aspect-[9/16] w-[min(100vw,56.25vh)] max-h-screen" : "mx-auto aspect-[9/16] w-full max-w-[560px] sm:mx-0 sm:w-[min(32vw,320px)] sm:flex-none lg:w-[min(38vw,440px)]") + " relative"}>
          {(!stageOnly && !audienceGameStarted) ? (
            <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-yellow-300/60 bg-[#090411] px-6 text-center shadow-[0_0_45px_rgba(234,179,8,.2)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(91,33,132,0.5),transparent_62%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <LionCrest className="mb-5 h-28 w-28" />
                <p className="text-xs font-black uppercase tracking-[0.35em] text-purple-200">Kingson Survey Show</p>
                <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-wide text-white">Are you ready?</h2>
                <p className="mt-3 max-w-xs text-sm text-slate-300">Press below when your teams and audience are ready to begin.</p>
                <button type="button" className={btnGold + " mt-8 min-w-56 px-8 py-5 text-xl shadow-[0_0_30px_rgba(234,179,8,.35)]"} onClick={playNow}>▶ PLAY NOW</button>
              </div>
            </div>
          ) : (
            <Stage audienceWaiting={stageOnly && !audienceGameStarted} s={s} q={q} strikeFlash={strikeFlash} timer={timer} onReveal={(i) => act({ type: "reveal", index: i })} roundMode={roundMode} bonus={bonus} roundResult={roundResult} finalResults={finalResults} showCountdown={showCountdown} />
          )}
          {showCountdown && showCountdown.target !== "handover" && <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"><div className="font-display text-[min(24vw,24cqh)] font-black leading-none text-gold drop-shadow-[0_0_35px_rgba(245,190,82,.7)]">{showCountdown.remaining}</div><div className="mt-3 font-display text-[min(4vw,4cqh)] tracking-[.3em] text-white">{showCountdown.target === "bonus" ? "GET READY FOR THE KINGSON BONUS ROUND" : "GET READY!"}</div></div>}
        </div>
        {stageOnly ? (
          <button onClick={() => setStageOnly(false)} className="fixed bottom-2 right-2 rounded bg-muted/40 px-2 py-1 text-xs text-muted-foreground opacity-30 hover:opacity-100">
            Exit stage view (Esc) · Host controls are in the other tab
          </button>
        ) : (
          <HostPanel
            s={s}
            q={q}
            act={act}
            onStage={() => window.open(`${window.location.pathname}?stage=1`, "_blank", "noopener,noreferrer")}
            onHelp={() => setHelp(true)}
            onNewMatch={() => setConfirmNew(true)}
            onPlayNow={playNow}
            roundMode={roundMode}
            onRoundChange={changeRound}
            timer={timer}
            bonus={bonus}
            onBonusChange={updateBonus}
            bonusGuess={bonusGuess}
            setBonusGuess={setBonusGuess}
            bonusFeedback={bonusFeedback}
            submitBonusGuess={submitBonusGuess}
          />
        )}
      </div>

      {help && <HelpOverlay onClose={() => setHelp(false)} />}
      {confirmNew && (
        <Modal onClose={() => setConfirmNew(false)} title="Start a new match?">
          <p className="text-muted-foreground">Both team scores go back to 0 and all questions become unused. Your edited questions are kept.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setConfirmNew(false)}>Cancel</button>
            <button className={btnDanger} onClick={() => { const fresh = reducer(s, { type: "newMatch" }); const drawnIds = drawSurveyIds(fresh.questions); const assignments: RoundQuestionsByTeam = { A: { classic: drawnIds[0] ?? fresh.currentId, double: drawnIds[1] ?? fresh.currentId, triple: drawnIds[2] ?? fresh.currentId }, B: { classic: drawnIds[3] ?? fresh.currentId, double: drawnIds[4] ?? fresh.currentId, triple: drawnIds[5] ?? fresh.currentId } }; const started = reducer({ ...fresh, usedIds: [] }, { type: "next", id: assignments.A.classic }); dispatch({ type: "__load", s: started }); setRoundQuestions(assignments); localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments)); setTeamLeg(1); setFinalResults(null); localStorage.setItem(GAME_STARTED_KEY, "false"); setAudienceGameStarted(false); localStorage.removeItem("kingson-survey-show-final-results-v1"); setRoundPoints({ A: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 }, B: { classic: 0, double: 0, triple: 0, bonus: 0, bonusExtra: 0 } }); setAutoPlay(false); setRoundResult(null); setShowCountdown(null); setRoundMode("classic"); localStorage.setItem(ROUND_KEY, "classic"); const freshBonus = { ...bonus, questions: drawBonusQuestions(), index: 0, accepted: [], total: 0, responses: ["", "", "", "", ""], correctCount: 0, pendingAnswers: ["", "", "", "", ""], revealed: false }; setBonus(freshBonus); localStorage.setItem(BONUS_STORAGE_KEY, JSON.stringify(freshBonus)); setTimer({ duration: 60, remaining: 60, running: false, endsAt: null }); localStorage.setItem(TIMER_KEY, JSON.stringify({ duration: 60, remaining: 60, running: false, endsAt: null })); setGameplayMusicActive(false); setThemePlayerActive(true); setWelcomeOpen(false); setConfirmNew(false); }}>Yes, new match</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

function LionCrest({ className = "" }: { className?: string }) {
  return <svg viewBox="0 0 160 160" role="img" aria-label="Golden crowned lion mascot" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="lionGold" x1="30" y1="18" x2="130" y2="145" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF1A8"/><stop offset=".38" stopColor="#F5C451"/><stop offset=".72" stopColor="#B87919"/><stop offset="1" stopColor="#FFE08A"/></linearGradient></defs>
    <path d="M80 29 94 17 105 31 121 25 124 43 140 51 130 68 140 84 125 96 128 115 108 116 98 135 80 126 62 135 52 116 32 115 35 96 20 84 30 68 20 51 36 43 39 25 55 31 66 17 80 29Z" fill="url(#lionGold)" stroke="#FFF0B0" strokeWidth="2.5"/>
    <path d="M49 35 56 14 68 29 80 8 92 29 105 14 111 36 80 43 49 35Z" fill="url(#lionGold)" stroke="#FFE7A0" strokeWidth="2.5"/>
    <path d="M44 57 58 43 80 39 102 43 116 57 110 94 98 116 80 127 62 116 50 94Z" fill="#2B153C" stroke="url(#lionGold)" strokeWidth="4"/>
    <path d="M55 66 69 61 76 68 69 73 57 72M105 66 91 61 84 68 91 73 103 72" stroke="#FFE29A" strokeWidth="4" strokeLinecap="round"/>
    <path d="M65 86 80 78 95 86 91 98 80 104 69 98Z" fill="url(#lionGold)" stroke="#FFF0B0" strokeWidth="2"/>
    <path d="M80 104v8M66 112q14 10 28 0" stroke="#FFE29A" strokeWidth="3" strokeLinecap="round"/>
    <path d="M45 80 31 94 47 101M115 80 129 94 113 101" stroke="#F5C451" strokeWidth="5" strokeLinecap="round"/>
  </svg>;
}

/* ---------------- STAGE ---------------- */

function Stage({ audienceWaiting, s, q, strikeFlash, timer, onReveal, roundMode, bonus, roundResult, finalResults, showCountdown }: { audienceWaiting: boolean; s: GameState; q: Question; strikeFlash: number; timer: TimerState; onReveal: (i: number) => void; roundMode: RoundMode; bonus: BonusState; roundResult: RoundResult | null; finalResults: FinalResults | null; showCountdown: { remaining: number; target: CountdownTarget } | null }) {
  const [flash, setFlash] = useState(false);
  const safeBonusQuestions = normalizeBonusQuestions(bonus.questions);
  const activeBonusQuestion = safeBonusQuestions[Math.min(4, Math.max(0, bonus.index))] ?? BONUS_DEFAULTS[0];
  useEffect(() => {
    if (!strikeFlash) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [strikeFlash]);

  const w = winner(s);
  return (
    <section className="stage-bg kingson-arena relative h-full w-full overflow-hidden rounded-2xl border border-border select-none" style={{ containerType: "size" }}>
      {audienceWaiting && <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_38%,rgba(126,34,206,.45),transparent_58%),linear-gradient(145deg,#090411,#170b25_55%,#08050e)] px-6 text-center">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)",backgroundSize:"34px 34px"}} />
        <div className="relative z-10 mb-5 flex h-36 w-36 items-center justify-center rounded-full border-2 border-yellow-300/80 bg-black/50 shadow-[0_0_65px_rgba(168,85,247,.38)]"><LionCrest className="h-28 w-28" /></div>
        <div className="relative z-10 font-display font-black uppercase tracking-[.12em] text-white" style={{fontSize:"clamp(2rem,7cqh,4rem)",lineHeight:1.08}}>GET READY<br/><span className="gold-text">FOR THE GAME!</span></div>
        <div className="relative z-10 mt-5 max-w-[85%] font-display uppercase tracking-[.16em] text-purple-200" style={{fontSize:"clamp(.8rem,2.5cqh,1.2rem)"}}>Kingson Survey Show is about to begin</div>
        <div className="relative z-10 mt-8 flex items-center gap-2 text-yellow-200/80" style={{fontSize:"clamp(.65rem,2cqh,.9rem)"}}><span className="h-2 w-2 animate-pulse rounded-full bg-yellow-300"/> STAY TUNED</div>
      </div>}
      <style>{`
@keyframes ks-drift{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(2%,-3%,0) scale(1.08)}}
@keyframes ks-sweep{0%{transform:translateX(-120%) rotate(18deg);opacity:0}15%{opacity:.6}100%{transform:translateX(240%) rotate(18deg);opacity:0}}
@keyframes ks-tile-in{0%{transform:rotateX(70deg) scale(.88);opacity:.2}70%{transform:rotateX(-5deg) scale(1.02);opacity:1}100%{transform:rotateX(0) scale(1);opacity:1}}
@keyframes ks-glow{0%,100%{box-shadow:0 0 14px rgba(245,185,66,.16)}50%{box-shadow:0 0 28px rgba(245,185,66,.4)}}
@keyframes ks-title{0%,100%{text-shadow:0 0 10px rgba(245,185,66,.25)}50%{text-shadow:0 0 22px rgba(50,190,255,.55),0 0 34px rgba(245,185,66,.3)}}
.kingson-arena{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(91,33,132,.48),transparent 48%),radial-gradient(ellipse at 8% 8%,rgba(176,112,26,.22),transparent 34%),linear-gradient(135deg,#05070d,#101827 48%,#07090f)}
.kingson-arena:before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.14;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:42px 42px}
.kingson-arena:after{content:'';position:absolute;top:-35%;bottom:-35%;left:-35%;width:20%;pointer-events:none;z-index:1;background:linear-gradient(90deg,transparent,rgba(192,132,252,.16),rgba(255,210,120,.16),transparent);filter:blur(12px);animation:ks-sweep 12s ease-in-out infinite}
.ks-orb{position:absolute;width:24cqh;aspect-ratio:1;border-radius:50%;pointer-events:none;filter:blur(34px);opacity:.17;animation:ks-drift 9s ease-in-out infinite}
.ks-title-glow{animation:ks-title 4s ease-in-out infinite}
.ks-question{border:1px solid rgba(245,190,82,.62);background:linear-gradient(110deg,rgba(12,19,31,.92),rgba(65,32,94,.88),rgba(29,22,39,.92));box-shadow:0 10px 35px rgba(0,0,0,.3),0 0 24px rgba(245,185,66,.11),inset 0 1px rgba(255,255,255,.12);backdrop-filter:blur(12px)}
.ks-tile{position:relative;overflow:hidden;border:1px solid rgba(245,190,82,.45);box-shadow:0 8px 18px rgba(0,0,0,.3),inset 0 1px rgba(255,255,255,.12);transition:transform .28s ease,filter .28s ease,box-shadow .28s ease;transform-style:preserve-3d}
.ks-tile:hover:not(:disabled){transform:translateY(-3px) scale(1.015);filter:brightness(1.2);box-shadow:0 12px 28px rgba(0,0,0,.4),0 0 18px rgba(180,110,255,.22)}
.ks-tile.tile-closed{background:#050505}
.ks-tile.tile-open{background:#050505;animation:ks-tile-in .55s cubic-bezier(.2,.8,.2,1) both,ks-glow 3.2s ease-in-out infinite .55s}
.ks-tile.tile-shown{background:#050505;opacity:.94;animation:ks-tile-in .45s ease-out both}
.ks-podium{position:relative;overflow:hidden;background:linear-gradient(155deg,rgba(24,36,53,.92),rgba(7,12,22,.86));box-shadow:0 12px 30px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(8px);transition:transform .35s ease,box-shadow .35s ease}
.ks-podium-active{transform:translateY(-3px);box-shadow:0 0 26px rgba(168,85,247,.25),0 14px 32px rgba(0,0,0,.35),inset 0 0 22px rgba(168,85,247,.10)}
.ks-winner-screen{background:radial-gradient(ellipse at 50% 42%,rgba(91,33,132,.48),transparent 55%),rgba(3,6,13,.94);backdrop-filter:blur(14px)}
@keyframes ks-final-enter{0%{opacity:0;transform:scale(.92) translateY(18px)}100%{opacity:1;transform:scale(1) translateY(0)}}
@keyframes ks-final-pulse{0%,100%{text-shadow:0 0 12px rgba(255,220,90,.35),0 0 26px rgba(30,190,255,.22)}50%{text-shadow:0 0 24px rgba(255,220,90,.8),0 0 48px rgba(30,190,255,.6)}}
@keyframes ks-final-rays{0%{transform:rotate(0deg) scale(1.2)}100%{transform:rotate(360deg) scale(1.2)}}
@keyframes ks-final-row{0%{opacity:0;transform:translateX(-24px) scale(.97)}100%{opacity:1;transform:translateX(0) scale(1)}}
.ks-final-show{isolation:isolate;background:radial-gradient(ellipse at 50% 0%,rgba(20,190,255,.42),transparent 48%),radial-gradient(ellipse at 5% 100%,rgba(168,85,247,.34),transparent 42%),radial-gradient(ellipse at 100% 90%,rgba(236,72,153,.28),transparent 40%),linear-gradient(135deg,#070b2b 0%,#111044 45%,#071b35 100%);overflow:hidden}
.ks-final-rays{z-index:0;opacity:.28;background:repeating-conic-gradient(from 0deg at 50% 45%,rgba(255,255,255,.13) 0deg 2deg,transparent 2deg 12deg);animation:ks-final-rays 55s linear infinite;mask-image:radial-gradient(ellipse at center,#000 0%,transparent 75%)}
.ks-final-kicker,.ks-final-heading,.ks-final-team,.ks-final-total,.ks-final-champion{animation:ks-final-enter .55s cubic-bezier(.2,.8,.2,1) both}
.ks-final-heading,.ks-final-total>div:last-child{animation:ks-final-pulse 2.6s ease-in-out infinite}
.ks-final-team{background:linear-gradient(100deg,rgba(234,179,8,.2),rgba(236,72,153,.2),rgba(14,165,233,.2));box-shadow:0 0 24px rgba(250,204,21,.2)}
.ks-final-row{animation:ks-final-row .45s ease-out both;box-shadow:0 5px 16px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.16)}
.ks-final-total{background:linear-gradient(100deg,rgba(234,179,8,.28),rgba(236,72,153,.18),rgba(14,165,233,.24));box-shadow:0 0 28px rgba(250,204,21,.28),inset 0 0 20px rgba(255,255,255,.06)}
.ks-final-champion{text-shadow:0 0 22px rgba(250,204,21,.65),0 0 44px rgba(236,72,153,.35)}

@media(prefers-reduced-motion:reduce){.kingson-arena *,.kingson-arena:after{animation:none!important;transition:none!important}}
`}</style>
      <div className="ks-orb bg-cyan-400" style={{ top: "8%", left: "-7%" }} />
      <div className="ks-orb bg-amber-400" style={{ bottom: "-8%", right: "-5%", animationDelay: "-4s" }} />
      <div className="spotlight pointer-events-none absolute -top-[10%] left-[8%] h-[120%] w-[30%]" />
      <div className="spotlight pointer-events-none absolute -top-[10%] right-[8%] h-[120%] w-[30%]" style={{ animationDelay: "-4.5s" }} />

      <div className="relative flex h-full flex-col px-[2.5cqw] py-[1.2cqh]">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="ks-title-glow font-display tracking-wide leading-none" style={{ fontSize: "3.4cqh" }}>
            <LionCrest className="mr-[1cqw] inline-block h-[5cqh] w-[5cqh] align-middle" /> <span className="gold-text">KINGSON</span> <span className="text-electric">SURVEY SHOW</span>
          </div>
          <div className="flex items-center gap-[1.5cqw] font-display text-muted-foreground" style={{ fontSize: "2.6cqh" }}>
            <span>{roundMode === "bonus" ? "KINGSON BONUS ROUND" : roundMode === "triple" ? "TRIPLE POINT ROUND" : roundMode === "double" ? "DOUBLE POINT ROUND" : "CLASSIC ROUND"}</span>
            <span className={timer.remaining <= 5 && timer.running ? "text-destructive" : "text-gold"}>TIME {timer.remaining}s</span>
            
          </div>
        </div>

        {/* question */}
        <div className="ks-question mt-[1cqh] rounded-xl px-[2cqw] py-[1cqh] text-center">
          <h1 className="font-display uppercase leading-tight tracking-wide" style={{ fontSize: "4.1cqh" }}>{roundMode === "bonus" ? activeBonusQuestion.prompt : q.prompt}</h1>
        </div>

        {/* body */}
        <div className="mt-[1cqh] flex flex-1 min-h-0 flex-col gap-[.65cqh]">
          <div className="grid grid-cols-2 gap-[1.5cqw]">
            <Podium s={s} team="A" />
            <Podium s={s} team="B" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {roundMode === "bonus" ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-gold/60 bg-background/55 p-[1.5cqw] text-center">
                <div className="font-display text-gold" style={{fontSize:"3.5cqh"}}>BONUS QUESTION {bonus.index + 1} / 5</div>
                <div className="mt-[1cqh] font-display text-electric" style={{fontSize:"2.5cqh"}}>UP TO 200 POINTS AVAILABLE</div>
                <div className="mt-[1.2cqh] grid w-full flex-1 min-h-0 grid-cols-1 grid-rows-5 gap-[.7cqh]">
                  {Array.from({ length: 5 }, (_, i) => {
                    const submitted = bonus.pendingAnswers?.[i]?.trim() ?? "";
                    const matched = submitted ? safeBonusQuestions[i].answers.find(a => answerMatches(submitted, a.text)) : undefined;
                    const expected = [...safeBonusQuestions[i].answers].sort((a, b) => b.points - a.points)[0];
                    const showExpected = bonus.revealed && submitted && (!matched || (expected && matched.text !== expected.text));
                    const points = bonus.revealed && matched ? matched.points : 0;
                    return <div key={i} className="flex min-h-0 items-center gap-[2cqw] rounded-xl border-2 border-gold/50 bg-slate-950/75 px-[2cqw] py-[.45cqh]">
                      <span className="flex h-[6.2cqh] aspect-square shrink-0 items-center justify-center rounded-full bg-amber-400/15 font-mono font-semibold tabular-nums text-gold" style={{fontSize:"3.2cqh"}}>{i + 1}</span>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="break-words font-sans font-medium tracking-wide text-white" style={{fontSize:"2.8cqh",lineHeight:1.08}}>{submitted || "WAITING FOR ANSWER"}</div>
                        {showExpected && expected && <div className="mt-[.25cqh] break-words font-sans font-semibold tracking-wide text-emerald-300" style={{fontSize:"2.45cqh",lineHeight:1.05}}>CORRECT ANSWER: {expected.text}</div>}
                      </div>
                      <span className="shrink-0 rounded-lg bg-amber-400/15 px-[2cqw] py-[.5cqh] font-display font-black text-gold" style={{fontSize:"3.2cqh"}}>{bonus.revealed && matched ? "+" + points : "—"}</span>
                    </div>;
                  })}
                </div>
                <div className="mt-[1.5cqh] text-muted-foreground" style={{fontSize:"2.3cqh"}}>{bonus.revealed ? "BONUS MISSION COMPLETE · " + bonus.correctCount + "/5 CORRECT" + (bonus.correctCount >= 3 ? " · +500 BONUS POINTS" : "") : "ANSWERS REVEAL WHEN THE 60-SECOND TIMER ENDS"}</div>
              </div>
            ) : <>
            {roundResult && (
              <div className="mb-[1cqh] flex shrink-0 items-center justify-center gap-[1.2cqw] rounded-xl border-2 border-gold/70 bg-black/85 px-[2cqw] py-[.7cqh] text-center">
                <span className="font-display text-white" style={{fontSize:"2.8cqh"}}>{s.teamNames[roundResult.team]} · ROUND SCORE</span>
                <span className="font-display gold-text" style={{fontSize:"5.2cqh",lineHeight:1}}>+{roundResult.points}</span>
                <span className="font-display text-gold" style={{fontSize:"2.3cqh"}}>{roundResult.mode.toUpperCase()} {roundResult.mode === "classic" ? "×1" : roundResult.mode === "double" ? "×2" : "×3"}</span>
              </div>
            )}
            <div className="mb-[.7cqh] flex items-center justify-center gap-[1cqw]">
              <span className="font-display text-muted-foreground" style={{ fontSize: "2.4cqh" }}>ROUND BANK</span>
              <span key={s.bank} className="pop font-display gold-text" style={{ fontSize: "5cqh", lineHeight: 1 }}>{s.bank}</span>
            </div>
            <div className="grid flex-1 min-h-0 grid-cols-1 grid-rows-6 gap-[1.1cqh]" style={{ perspective: 800 }}>
              {q.answers.map((ans, i) => {
                const t = s.tiles[i];
                return (
                  <button
                    key={`${q.id}-${i}-${t}`}
                    onClick={() => onReveal(i)}
                    disabled={t !== "hidden"}
                    className={`ks-tile flex min-h-0 items-center rounded-xl px-[3.2cqw] py-[1cqh] text-left ${t === "hidden" ? "tile-closed cursor-pointer hover:brightness-125" : t === "scored" ? "tile-open" : "tile-shown"}`}
                    aria-label={t === "hidden" ? `Reveal answer ${i + 1}` : `${ans.text} ${ans.points}`}
                  >
                    {t === "hidden" ? (
                      <span className="mx-auto flex aspect-square h-[70%] items-center justify-center rounded-full bg-background/70 font-mono font-semibold tabular-nums text-gold" style={{ fontSize: "6cqh", border: "2px solid var(--gold)" }}>{i + 1}</span>
                    ) : (
                      <>
                        <span className="mr-[2cqw] flex h-[5.5cqh] aspect-square shrink-0 items-center justify-center rounded-full bg-amber-400/15 font-mono font-semibold tabular-nums text-gold" style={{ fontSize: "3.8cqh" }}>{i + 1}</span>
                        <span className="min-w-0 flex-1 whitespace-normal break-words font-sans font-semibold tracking-wide uppercase text-white" style={{ fontSize: `${Math.max(1.65, Math.min(4.1, 4.1 * 42 / Math.max(1, ans.text.length)))}cqh`, lineHeight: 1.02, overflowWrap: "anywhere" }}>{ans.text}</span>
                        <span className={`ml-[2cqw] flex h-[6.2cqh] min-w-[6.2cqh] shrink-0 items-center justify-center rounded-lg px-[1cqw] font-display font-black ${t === "scored" ? "bg-primary-foreground text-primary" : "bg-slate-950/70 text-gold"}`} style={{ fontSize: "4cqh" }}>{ans.points}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            {/* strikes */}
            <div className="mt-[.4cqh] flex h-[3.5cqh] shrink-0 items-center justify-center gap-[1.5cqw]">
              {!s.lastAward && [0, 1, 2].map((i) => (
                <div key={i} className={`flex aspect-square h-full items-center justify-center rounded-lg border-2 font-display ${i < s.strikes ? "pop border-destructive bg-destructive/20 text-destructive" : "border-border text-border"}`} style={{ fontSize: "7cqh", lineHeight: 1 }}>✕</div>
              ))}
            </div>
            </>}
          </div>
          <Podium s={s} team="B" />
        </div>

        {s.lastAward && !s.gameOver && (
          <div key={s.round + s.lastAward.reason} className="pop absolute bottom-[3.5cqh] left-1/2 -translate-x-1/2 rounded-full gold-frame bg-background/90 px-[3cqw] py-[1cqh] font-display" style={{ fontSize: "3cqh" }}>
            <span className="text-muted-foreground">{s.lastAward.reason.toUpperCase()} · </span>
            <span className="gold-text">+{s.lastAward.points} {s.teamNames[s.lastAward.team]}</span>
          </div>
        )}
      </div>

      {showCountdown?.target === "handover" && (
        <div className="ks-final-show absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-5 py-4 text-center">
          <div className="ks-final-rays pointer-events-none absolute inset-0" />
          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center">
            <div className="mx-auto mb-5 flex items-center justify-center"><LionCrest className="h-[15cqh] w-[15cqh]" /></div>
            <div className="font-display font-black uppercase tracking-[.12em] text-white" style={{fontSize:"clamp(2rem,7cqh,4rem)",lineHeight:1.08}}>NEXT TEAM,<br/><span className="gold-text">GET READY!</span></div>
            <div className="mt-5 font-display uppercase tracking-[.16em] text-purple-200" style={{fontSize:"clamp(1rem,3cqh,1.6rem)"}}>{s.teamNames[s.active === "A" ? "B" : "A"]}</div>
            <div className="mt-7 font-display font-black leading-none text-gold drop-shadow-[0_0_35px_rgba(245,190,82,.7)]" style={{fontSize:"clamp(5rem,24cqh,11rem)"}}>{showCountdown.remaining}</div>
            <div className="mt-4 font-display uppercase tracking-[.22em] text-white" style={{fontSize:"clamp(.8rem,2.8cqh,1.3rem)"}}>SECONDS TO TAKE THE STAGE</div>
          </div>
        </div>
      )}
      {finalResults && showCountdown?.target !== "handover" && (
        <div className="ks-final-show absolute inset-0 z-50 flex flex-col items-center justify-start overflow-y-auto px-[2.5cqw] py-[1.5cqh] text-center">
          <div className="ks-final-rays pointer-events-none absolute inset-0" />
          <div className="relative z-10 flex min-h-full w-full max-w-5xl flex-col items-center justify-center gap-[1cqh]">
            <div className="mx-auto flex items-center justify-center"><LionCrest className="h-[4.5cqh] w-[4.5cqh]" /></div>
            <div className="ks-final-kicker font-display tracking-[.18em] text-purple-200" style={{fontSize:"clamp(.65rem,1.8cqh,1.2rem)"}}>✦ KINGSON SURVEY SHOW ✦</div>
            <div className="ks-final-heading font-display font-black tracking-wide text-white" style={{fontSize:"clamp(1.2rem,4cqh,3rem)",lineHeight:1.02}}>{finalResults.finalMatch ? "FINAL SCOREBOARD" : "TEAM RESULTS"}</div>
            {bonus.revealed && (
              <div className="mx-auto grid w-full max-w-4xl grid-cols-5 gap-[.5cqw] rounded-lg border border-yellow-300/50 bg-black/65 p-[.7cqw] text-center">
                {bonus.questions.map((question,index)=><div key={index} className="min-w-0 rounded bg-white/5 px-1 py-1">
                  <div className="font-display text-yellow-200" style={{fontSize:"clamp(.55rem,1.25cqh,.9rem)"}}>Q{index+1}</div>
                  <div className="truncate text-white" style={{fontSize:"clamp(.55rem,1.3cqh,.95rem)"}}>{bonus.questions[index].answers.find(answer=>answer.text===bonus.responses[index])?.text ?? "No answer"}</div>
                  <div className="font-display font-bold text-yellow-200" style={{fontSize:"clamp(.6rem,1.5cqh,1rem)"}}>{question.answers.find(answer=>answer.text===bonus.responses[index])?.points ?? 0} PTS</div>
                </div>)}
              </div>
            )}
            <div className={"mx-auto grid w-full max-w-4xl gap-[1cqw] "+(finalResults.finalMatch && finalResults.teams ? "grid-cols-2" : "grid-cols-1 max-w-2xl")}>
              {(finalResults.finalMatch && finalResults.teams
                ? ([finalResults.champion === "tie" ? finalResults.team : finalResults.champion as Team, (finalResults.champion === "tie" ? (finalResults.team === "A" ? "B" : "A") : finalResults.champion === "A" ? "B" : "A")] as Team[]).map(team=>({team,...finalResults.teams![team]}))
                : [{team:finalResults.team,breakdown:finalResults.breakdown,total:finalResults.total}]
              ).map((entry,rank)=>(
                <div key={entry.team} className={"min-w-0 rounded-xl border-2 p-[1cqw] "+(rank===0?"border-yellow-300 bg-yellow-400/10":"border-purple-300/60 bg-purple-950/75")}>
                  <div className="font-display text-yellow-200" style={{fontSize:"clamp(.7rem,1.8cqh,1.25rem)"}}>{finalResults.finalMatch ? (finalResults.champion === "tie" ? "🤝 TIED" : rank===0?"🏆 1ST PLACE":"2ND PLACE") : "TEAM SCORE"}</div>
                  <div className="truncate font-display font-black text-white" style={{fontSize:"clamp(.9rem,2.5cqh,1.8rem)"}}>{s.teamNames[entry.team]}</div>
                  <div className="my-[.5cqh] grid grid-cols-[1fr_auto] gap-x-1 text-left">
                    {([[ "CLASSIC",entry.breakdown.classic ],[ "DOUBLE ×2",entry.breakdown.double ],[ "TRIPLE ×3",entry.breakdown.triple ],[ "BONUS MISSION",entry.breakdown.bonus ],[ "500-POINT REWARD",entry.breakdown.bonusExtra ]] as [string,number][]).map(([label,points])=>(
                      <div key={label} className="col-span-2 grid grid-cols-[1fr_auto] items-center gap-1 border-b border-white/15 py-[.35cqh]">
                        <div className="font-display text-white" style={{fontSize:"clamp(.62rem,1.55cqh,1.05rem)"}}>{label}</div>
                        <div className="font-display font-black text-yellow-100 tabular-nums" style={{fontSize:"clamp(.7rem,1.8cqh,1.2rem)"}}>{points.toLocaleString()} <span className="text-yellow-200/80" style={{fontSize:"clamp(.5rem,1.1cqh,.75rem)"}}>PTS</span></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-[.5cqh] flex items-center justify-between gap-1 rounded-lg border border-yellow-300 bg-black/50 px-[1cqw] py-[.6cqh]">
                    <div className="font-display font-black text-white" style={{fontSize:"clamp(.7rem,1.8cqh,1.2rem)"}}>TOTAL</div>
                    <div className="font-display font-black text-yellow-200 tabular-nums" style={{fontSize:"clamp(1rem,3.3cqh,2.3rem)",lineHeight:1}}>{entry.total.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            {finalResults.finalMatch ? <div className="ks-final-champion font-display font-black text-yellow-200" style={{fontSize:"clamp(1rem,3.6cqh,2.6rem)"}}>{finalResults.champion === "tie" ? "🏆 IT'S A TIE! 🏆" : "🏆 CHAMPION: " + s.teamNames[finalResults.champion as Team] + " 🏆"}</div> : <div className="inline-flex items-center gap-2 rounded-full border border-purple-300/70 bg-purple-950/90 px-4 py-1 font-display text-white" style={{fontSize:"clamp(.7rem,1.8cqh,1.2rem)"}}>TEAM B PREPARES IN <span className="font-black text-yellow-300">{showCountdown?.target === "handover" ? showCountdown.remaining : 30}</span> SECONDS</div>}
          </div>
        </div>
      )}

      {flash && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-destructive/15">
          <span className="pop font-display text-destructive" style={{ fontSize: "40cqh", lineHeight: 1, textShadow: "0 0 40px var(--destructive)" }}>✕</span>
        </div>
      )}

      {s.gameOver && (
        <div className="ks-winner-screen absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-display text-electric" style={{ fontSize: "4cqh" }}>THE LION CROWN GOES TO…</div>
          <div className="pop font-display gold-text mt-[2cqh]" style={{ fontSize: "14cqh", lineHeight: 1 }}>
            {w === "tie" ? "IT'S A TIE!" : s.teamNames[w]}
          </div>
          <div className="mt-[3cqh] font-display" style={{ fontSize: "5cqh" }}>
            {s.teamNames.A} <span className="text-gold">{s.scores.A}</span>
            <span className="mx-[2cqw] text-muted-foreground">—</span>
            <span className="text-gold">{s.scores.B}</span> {s.teamNames.B}
          </div>
        </div>
      )}
    </section>
  );
}

function Podium({ s, team }: { s: GameState; team: Team }) {
  const active = s.active === team && !s.gameOver;
  return (
    <div className={`ks-podium flex min-h-0 flex-row items-center justify-center gap-[2cqw] rounded-xl border-2 px-[2cqw] py-[.5cqh] ${active ? "ks-podium-active glow-active border-electric" : "border-border opacity-80"}`}>
      <div className="font-display text-center uppercase tracking-wide" style={{ fontSize: "2.5cqh" }}>{s.teamNames[team]}</div>
      <div key={s.scores[team]} className="pop font-mono font-bold tabular-nums gold-text" style={{ fontSize: "4.6cqh", lineHeight: 1 }}>{s.scores[team]}</div>
      <div className={`rounded-full px-[1cqw] font-display ${active ? "bg-electric text-accent-foreground" : "text-transparent"}`} style={{ fontSize: "1.8cqh" }}>
        {active ? "PLAYING" : ""}
      </div>
    </div>
  );
}

/* ---------------- HOST ---------------- */

function HostPanel({ s, q, act, onStage, onHelp, onNewMatch, onPlayNow, roundMode, onRoundChange, bonus, onBonusChange, bonusGuess, setBonusGuess, bonusFeedback, submitBonusGuess, timer }: {
  s: GameState; q: Question; act: (a: Action) => void; onStage: () => void; onHelp: () => void; onNewMatch: () => void; onPlayNow: () => void;
  roundMode: RoundMode; onRoundChange: (mode: RoundMode) => void; timer: TimerState; bonus: BonusState; onBonusChange: (next: BonusState) => void; bonusGuess: string; setBonusGuess: (value: string) => void; bonusFeedback: string; submitBonusGuess: () => void;
}) {
  const safeBonusQuestions = normalizeBonusQuestions(bonus.questions);
  const safeBonusIndex = Math.min(4, Math.max(0, Number.isInteger(bonus.index) ? bonus.index : 0));
  const activeBonusQuestion = safeBonusQuestions[safeBonusIndex] ?? BONUS_DEFAULTS[0];
  return (
    <section className="mt-0 min-w-0 rounded-2xl border-2 border-dashed border-border bg-card p-3 sm:max-h-[calc(100vh-2.5rem)] sm:flex-1 sm:overflow-y-auto lg:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl tracking-wide text-gold">HOST CONTROLS <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">not part of the show — open Stage view in a second tab when streaming</span></h2>
        <div className="flex flex-wrap gap-2">
          <button className={btnGhost} onClick={onHelp}>How to play (H)</button>
          <button className={btnBlue} onClick={onStage}>Stage view (S)</button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-electric/40 bg-muted p-3">
        <h3 className="mb-2 font-display text-lg text-gold">SHOW ROUNDS</h3>
        <div className="flex flex-wrap gap-2">
          {([["classic","Round 1 · Classic ×1"],["double","Round 2 · Double ×2"],["triple","Round 3 · Triple ×3"],["bonus","Kingson Bonus Round"]] as [RoundMode,string][]).map(([mode,label]) => <button key={mode} className={roundMode===mode?btnGold:btnGhost} onClick={()=>onRoundChange(mode)}>{label}</button>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{roundMode==="classic"?"Normal survey points.":roundMode==="double"?"Every correct board answer earns double points.":roundMode==="triple"?"Every correct board answer earns triple points.":"Five host-checked questions. Each answer has a different value; five answers total 200 points."}</p>
        <div className="mt-3 rounded-lg border border-gold/40 bg-card px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current question · Host view</div>
          <div className="mt-1 font-semibold leading-relaxed text-foreground">{roundMode === "bonus" ? activeBonusQuestion.prompt : q.prompt}</div>
          <div className="mt-1 text-xs text-muted-foreground">{roundMode === "bonus" ? `Bonus question ${safeBonusIndex + 1} of 5` : "This is the question currently shown to the audience."}</div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Round */}
        <div className="rounded-xl bg-muted p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Automatic team & strikes</h3>
          <div className="text-sm">
            <p>Playing team: <b className="text-electric">{s.teamNames[s.active]}</b></p>
            {s.phase === "play" && <p className="mt-2">Strikes: <b className="text-destructive">{s.strikes}/3</b> · Wrong answers add strikes automatically. Three strikes end the round.</p>}
            {s.phase === "awarded" && <p className="mt-2 text-muted-foreground">Round finished. The remaining answers are revealed automatically before the next round.</p>}
          </div>
          
        </div>

        {/* Bank */}
        <div className="rounded-xl bg-muted p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Round bank: <span className="text-gold text-base">{s.bank}</span></h3>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button className={btnGhost} disabled={s.tiles.every((t) => t !== "hidden")} onClick={() => act({ type: "showAll" })}>Show remaining answers</button>
            <button className={btnGhost} onClick={() => act({ type: "resetRound" })}>Reset this round</button>
          </div>
          <h3 className="mb-2 mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Scores (manual fix)</h3>
          {(["A", "B"] as Team[]).map((t) => (
            <div key={t} className="mb-2 flex items-center gap-2">
              <input aria-label={`Team ${t} name`} className="w-28 flex-1 rounded-md border border-input bg-card px-2 py-1 text-sm" value={s.teamNames[t]}
                onChange={(e) => act({ type: "renameTeam", team: t, name: e.target.value.toUpperCase() })} />
              <span className="w-12 text-right font-display text-gold">{s.scores[t]}</span>
              <button className={btnGhost} onClick={() => act({ type: "adjustScore", team: t, delta: -5 })}>−5</button>
              <button className={btnGhost} onClick={() => act({ type: "adjustScore", team: t, delta: 5 })}>+5</button>
            </div>
          ))}
        </div>

        {/* Match actions — question selection is automatic */}
        <div className="rounded-xl bg-muted p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Match controls</h3>
          {s.bank > 0 && s.phase !== "awarded" && <p className="mb-3 text-xs text-destructive">Bank has {s.bank} unbanked points — moving on discards them.</p>}
          <div className="grid grid-cols-1 gap-2">
            {s.gameOver
              ? <button className={btnGhost} onClick={() => act({ type: "resumeGame" })}>Hide winner</button>
              : <button className={btnGold} onClick={() => act({ type: "endGame" })}>End game · show winner</button>}
            <button className={btnDanger} onClick={onNewMatch}>New match…</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Questions are selected and shuffled automatically for every new match.</p>
        </div>
      </div>

      {roundMode === "bonus" && (
        <div className="mt-4 rounded-xl border-2 border-gold/60 bg-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-xl text-gold">KINGSON BONUS ROUND · HOST ONLY</h3><b className="text-gold">BONUS TOTAL: {bonus.total} pts · {bonus.correctCount}/5 CORRECT</b></div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gold">Question {Math.min(safeBonusIndex + 1, 5)} of 5</span>
            <span className="text-xs text-muted-foreground">A correct answer automatically opens the next question.</span>
            <button className={btnGhost} onClick={()=>onBonusChange({...bonus,index:0,accepted:[],total:0,responses:["","","","",""],pendingAnswers:["","","","",""],revealed:false,correctCount:0})}>Reset bonus round</button>
          </div>
          <label className="mt-3 block text-xs font-bold uppercase text-muted-foreground">Question shown to viewers</label>
          <input className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2" value={activeBonusQuestion.prompt} onChange={e=>{const questions=[...safeBonusQuestions];questions[safeBonusIndex]={...questions[safeBonusIndex],prompt:e.target.value};onBonusChange({...bonus,questions});}} />
          <label className="mt-3 block text-xs font-bold uppercase text-muted-foreground">Private accepted answers · edit these before the show</label>
          <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {(activeBonusQuestion ?? BONUS_DEFAULTS[0]).answers.map((answer,i)=><div key={i} className="flex min-w-0 gap-1"><input aria-label={"Bonus accepted answer "+(i+1)} className="min-w-0 flex-1 rounded-md border border-input bg-card px-2 py-2 text-sm" value={answer.text} onChange={e=>{const questions=[...safeBonusQuestions];const answers=[...questions[safeBonusIndex].answers];answers[i]={...answer,text:e.target.value};questions[safeBonusIndex]={...questions[safeBonusIndex],answers};onBonusChange({...bonus,questions});}} /><span className="flex w-16 items-center justify-center rounded-md border border-border bg-card px-1 py-2 text-sm font-semibold text-gold">{answer.points}</span></div>)}
          </div>
          <p className={"mt-2 text-xs font-semibold " + (activeBonusQuestion.answers.reduce((sum,a)=>sum+a.points,0)===200?"text-gold":"text-destructive")}>Answer points total: {activeBonusQuestion.answers.reduce((sum,a)=>sum+a.points,0)} / 200</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2" placeholder="Type the viewer's answer…" value={bonusGuess} disabled={Boolean(bonus.pendingAnswers?.[safeBonusIndex]) || bonus.revealed || !timer.running} onChange={e=>setBonusGuess(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();submitBonusGuess();}}} />
            <button className={btnGold} disabled={!bonusGuess.trim() || Boolean(bonus.pendingAnswers?.[safeBonusIndex]) || bonus.revealed || !timer.running} onClick={submitBonusGuess}>Record answer</button>
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">60-second mission timer: {timer.remaining}s · {(bonus.pendingAnswers ?? []).filter(Boolean).length} / 5 answers recorded privately</p>
          {bonusFeedback && <p className="mt-2 text-sm font-semibold text-gold">{bonusFeedback}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Current team: {s.teamNames[s.active]}. The audience never sees this answer key. Each question's five answer values should total exactly 200 points.</p>
        </div>
      )}
      {roundMode !== "bonus" && <AnswerKey s={s} q={q} act={act} />}
    </section>
  );
}

/* ---------------- HOST ANSWER KEY (private) ---------------- */

const normText = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
const isSubseq = (needle: string, hay: string) => {
  let i = 0;
  for (const c of hay) if (c === needle[i]) i++;
  return i >= needle.length;
};
function answerMatches(query: string, answer: string): boolean {
  const q = normText(query);
  const a = normText(answer);
  if (!q) return false;
  if (a.includes(q) || q.includes(a)) return true;
  const qw = q.split(" ");
  const aw = a.split(" ");
  if (qw.some((w) => w.length > 2 && aw.some((x) => x.includes(w) || w.includes(x)))) return true;
  const qc = q.replace(/ /g, "");
  const ac = a.replace(/ /g, "");
  return qc.length >= 3 && isSubseq(qc, ac);
}

function AnswerKey({ s, q, act }: { s: GameState; q: Question; act: (a: Action) => void }) {
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState("");
  const checking = normText(guess).length > 0;
  const hits = q.answers.map((a) => answerMatches(guess, a.text));
  const hitCount = hits.filter(Boolean).length;

  const submitGuess = () => {
    const answer = guess.trim();
    if (!answer) return;

    const matchingIndexes = q.answers
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => answerMatches(answer, a.text))
      .map(({ i }) => i);
    const hiddenMatches = matchingIndexes.filter((i) => s.tiles[i] === "hidden");

    if (hiddenMatches.length === 1) {
      act({ type: "reveal", index: hiddenMatches[0] });
      setFeedback(`Correct! “${q.answers[hiddenMatches[0]].text}” is on the board.`);
      setGuess("");
      return;
    }

    if (hiddenMatches.length > 1) {
      setFeedback("This answer could match more than one tile. Please tap the correct highlighted answer.");
      return;
    }

    if (matchingIndexes.length > 0) {
      setFeedback("That answer is already on the board. Try another answer.");
      setGuess("");
      return;
    }

    act({ type: "strike" });
    setFeedback("Not on the board — strike added.");
    setGuess("");
  };

  return (
    <div className="mt-4 rounded-xl border-2 border-dashed border-destructive/60 bg-muted/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg tracking-wide text-gold">
          HOST ANSWER KEY <span className="ml-1 rounded bg-destructive px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-widest text-destructive-foreground">Private</span>
        </h3>
        <span className="text-xs text-muted-foreground">Hidden in Stage view — viewers never see this.</span>
      </div>

      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground" htmlFor="viewer-guess">
        Type a viewer's answer, then press Enter
      </label>
      <div className="flex gap-2">
        <input
          id="viewer-guess"
          type="text"
          value={guess}
          onChange={(e) => { setGuess(e.target.value); setFeedback(""); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitGuess();
            }
          }}
          placeholder="Type or paste what a viewer said…"
          className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={!checking}
          onClick={submitGuess}
          className={btnGold}
        >
          Check answer
        </button>
      </div>
      {feedback && (
        <p className="mt-2 text-sm font-semibold" role="status">
          {feedback}
        </p>
      )}
      {!feedback && checking && (
        <p className="mt-1 text-xs text-muted-foreground">
          {hitCount > 0 ? `${hitCount} possible board match${hitCount > 1 ? "es" : ""} highlighted — press Enter to check.` : "No board match found yet — press Enter to check."}
        </p>
      )}

      <ol className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {q.answers.map((a, i) => {
          const revealed = s.tiles[i] !== "hidden";
          const hit = checking && hits[i];
          return (
            <li key={i}>
              <button
                disabled={revealed}
                onClick={() => act({ type: "reveal", index: i })}
                className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition ${
                  hit
                    ? "border-gold bg-primary/15 ring-2 ring-gold"
                    : checking
                      ? "border-border opacity-45"
                      : "border-border bg-card hover:bg-secondary/40"
                } disabled:opacity-40`}
              >
                <span className="font-display text-gold">{i + 1}</span>
                <span className="flex-1 truncate font-semibold">{a.text}</span>
                <span className="font-display text-gold">{a.points}</span>
                {revealed && <span className="text-xs text-muted-foreground">✓ shown</span>}
                {hit && !revealed && <span className="rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">match?</span>}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-muted-foreground">
        Press Enter or Check answer to submit. A single match reveals automatically; an unmatched answer adds a strike. Ambiguous matches are left for you to confirm.
      </p>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl gold-frame bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 font-display text-2xl tracking-wide text-gold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function HelpOverlay({ onClose }: { onClose: () => void }) {
  const keys: [string, string][] = [
    ["1 – 6", "Reveal answer tiles 1 to 6"],
    ["N", "Move to the next unused question (host control)"],
    ["R", "Choose a random question (host control)"],
    ["S", "Open or close Stage view"],
    ["H / ?", "Open or close these rules"],
    ["Esc", "Close this panel / leave Stage view"],
  ];
  return (
    <Modal title="How to Play · Official Game Rules" onClose={onClose}>
      <div className="space-y-4 text-sm leading-relaxed">
        <section>
          <h3 className="mb-1 font-display text-base text-gold">1. Start the show</h3>
          <p>The audience sees “GET READY” until the host presses <b>PLAY NOW</b>. A 3-second countdown starts the match. Keep the Host Controls open in one tab and the Stage view in another tab on the same browser/device.</p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">2. Team order and match format</h3>
          <p>The starting team plays all four stages first: <b>Classic → Double → Triple → Kingson Bonus Mission</b>. After its results, the other team gets a <b>30-second handover</b> and then plays its own four stages. The scores from both team turns are compared on the final scoreboard.</p>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">3. Classic, Double and Triple rounds</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Each round has one survey question with six hidden answer tiles and a 60-second timer.</li>
            <li>The host reads the question. Viewers suggest answers in the live comments.</li>
            <li>When an answer matches a tile, the host reveals it. Its survey points go into the round bank.</li>
            <li>Classic awards normal points; Double multiplies the points by 2; Triple multiplies them by 3.</li>
            <li>The round ends when all six answers are revealed or the 60-second timer runs out. A short results screen and countdown lead into the next stage.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">4. Strikes and automatic answer reveal</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>A wrong answer earns a strike. After three strikes, the round automatically ends and the playing team keeps its round bank.</li>
            <li>All remaining hidden answers automatically reveal so the audience can see the complete board.</li>
            <li>The round results appear briefly, then the automatic countdown starts the next round.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">5. Kingson Bonus Mission</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>This is five questions in a row, not a six-tile board. The host types and checks one viewer answer for each question.</li>
            <li>Each question has five accepted answers with different point values adding up to 200. A matched answer earns its listed value; a wrong answer earns zero.</li>
            <li>Answer at least three of the five bonus questions correctly to earn an extra 500 points.</li>
            <li>The host-only answer key stays hidden from the audience. The next bonus question opens after each answer is checked.</li>
          </ul>
        </section>
        <section>
          <h3 className="mb-1 font-display text-base text-gold">6. Winner</h3>
          <p>After both teams have completed all four stages, the final scoreboard shows each team's round breakdown, total points and the champion. The highest total wins; equal totals are a tie.</p>
        </section>
        <p className="rounded-lg border border-gold/40 bg-muted p-3 text-xs text-muted-foreground"><b className="text-gold">Host reminder:</b> The host manages answers and scoring from Host Controls. Viewers play along by suggesting answers in the live comments; they do not need to press game buttons.</p>
      </div>
      <h3 className="mt-5 mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Keyboard shortcuts · Host controls</h3>
      <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        {keys.map(([k, d]) => <div key={k}><kbd className="rounded bg-muted px-2 py-0.5 font-mono text-gold">{k}</kbd> {d}</div>)}
      </div>
      <div className="mt-5 text-right"><button className={btnGold} onClick={onClose}>Got it</button></div>
    </Modal>
  );
}

function EditDialog({ q, onClose, onSave }: { q: Question; onClose: () => void; onSave: (q: Question) => void }) {
  const [draft, setDraft] = useState<Question>(() => structuredClone(q));
  const total = draft.answers.reduce((a, b) => a + (Number(b.points) || 0), 0);
  return (
    <Modal title="Edit question" onClose={onClose}>
      <label className="text-xs font-bold uppercase text-muted-foreground">Question</label>
      <textarea className="mt-1 w-full rounded-md border border-input bg-muted p-2" rows={2} value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} />
      <div className="mt-3 space-y-2">
        {draft.answers.map((a, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-5 pt-1.5 text-muted-foreground">{i + 1}</span>
            <input aria-label={`Answer ${i + 1}`} className="flex-1 rounded-md border border-input bg-muted px-2 py-1" value={a.text}
              onChange={(e) => { const answers = [...draft.answers]; answers[i] = { ...a, text: e.target.value }; setDraft({ ...draft, answers }); }} />
            <input aria-label={`Points ${i + 1}`} type="number" min={0} className="w-20 rounded-md border border-input bg-muted px-2 py-1" value={a.points}
              onChange={(e) => { const answers = [...draft.answers]; answers[i] = { ...a, points: Math.max(0, Number(e.target.value) || 0) }; setDraft({ ...draft, answers }); }} />
          </div>
        ))}
      </div>
      <p className={`mt-2 text-sm ${total === 100 ? "text-muted-foreground" : "text-destructive"}`}>Total: {total} {total !== 100 && "(surveys usually total 100)"}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnGold} onClick={() => onSave(draft)}>Save</button>
      </div>
    </Modal>
  );
}

