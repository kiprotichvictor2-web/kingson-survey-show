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
      { name: "description", content: "Host a family survey game show live: reveal answers, track strikes, steals and team scores from one tab." },
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
type BonusQuestion = { prompt: string; answers: string[] };
const BONUS_DEFAULTS: BonusQuestion[] = [
  { prompt: "Name something people do when they wake up.", answers: ["Brush their teeth", "Pray", "Check their phone", "Take a shower", "Make breakfast"] },
  { prompt: "Name something you find at a wedding.", answers: ["Cake", "Flowers", "Rings", "Music", "Dancing"] },
  { prompt: "Name a popular social media platform.", answers: ["TikTok", "Facebook", "Instagram", "YouTube", "WhatsApp"] },
  { prompt: "Name something people take on a trip.", answers: ["Clothes", "Phone", "Money", "Passport", "Toothbrush"] },
  { prompt: "Name something you can find in a kitchen.", answers: ["Spoon", "Plate", "Fridge", "Cup", "Cooking pot"] },
];
type BonusState = { questions: BonusQuestion[]; index: number; accepted: string[]; total: number };
const BONUS_STORAGE_KEY = "kingson-survey-show-bonus-v1";
const ROUND_QUESTIONS_KEY = "kingson-survey-show-round-questions-v1";
type RoundQuestions = { classic: string; double: string; triple: string };


function Game() {
  const [{ s, hydrated }, dispatch] = useReducer(wrapped, null, () => ({ s: initialState(), hydrated: false }));
  const [stageOnly, setStageOnly] = useState(false);
  const [help, setHelp] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [strikeFlash, setStrikeFlash] = useState(0);
  const [timer, setTimer] = useState<TimerState>({ duration: 60, remaining: 60, running: false, endsAt: null });
  const [roundMode, setRoundMode] = useState<RoundMode>("classic");
  const [roundQuestions, setRoundQuestions] = useState<RoundQuestions | null>(null);
  const [bonus, setBonus] = useState<BonusState>({ questions: BONUS_DEFAULTS, index: 0, accepted: [], total: 0 });
  const [bonusGuess, setBonusGuess] = useState("");
  const [bonusFeedback, setBonusFeedback] = useState("");

  useEffect(() => {
    const saved = loadState();
    const loadedGame = saved ?? initialState();
    dispatch({ type: "__load", s: loadedGame });
    try {
      const storedRounds = localStorage.getItem(ROUND_QUESTIONS_KEY);
      const parsed = storedRounds ? JSON.parse(storedRounds) as RoundQuestions : null;
      const validIds = new Set(loadedGame.questions.map((question) => question.id));
      if (parsed && validIds.has(parsed.classic) && validIds.has(parsed.double) && validIds.has(parsed.triple)
        && new Set([parsed.classic, parsed.double, parsed.triple]).size === 3) {
        setRoundQuestions(parsed);
      } else {
        const available = loadedGame.questions.filter((question) => question.id !== loadedGame.currentId);
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        const assignments = {
          classic: loadedGame.currentId,
          double: shuffled[0]?.id ?? loadedGame.currentId,
          triple: shuffled[1]?.id ?? shuffled[0]?.id ?? loadedGame.currentId,
        };
        setRoundQuestions(assignments);
        localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments));
      }
    } catch {
      const available = loadedGame.questions.filter((question) => question.id !== loadedGame.currentId);
      const assignments = { classic: loadedGame.currentId, double: available[0]?.id ?? loadedGame.currentId, triple: available[1]?.id ?? available[0]?.id ?? loadedGame.currentId };
      setRoundQuestions(assignments);
      localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments));
    }
    setStageOnly(new URLSearchParams(window.location.search).get("stage") === "1");
    try { const savedTimer = localStorage.getItem(TIMER_KEY); if (savedTimer) setTimer(JSON.parse(savedTimer) as TimerState); } catch { /* Keep defaults. */ }
    try { const savedRound = localStorage.getItem(ROUND_KEY); if (savedRound) setRoundMode(savedRound as RoundMode); } catch { /* Keep default. */ }
    try { const savedBonus = localStorage.getItem(BONUS_STORAGE_KEY); if (savedBonus) setBonus(JSON.parse(savedBonus) as BonusState); } catch { /* Keep defaults. */ }
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
    window.addEventListener("storage", syncFromOtherTab);
    window.addEventListener("storage", syncTimer);
    return () => { window.removeEventListener("storage", syncFromOtherTab); window.removeEventListener("storage", syncTimer); };
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }, [s, hydrated]);
  const changeRound = (mode: RoundMode) => {
    if (mode === roundMode) return;
    // Keep one assigned survey question for each main round throughout this match.
    // Returning to Classic/Double/Triple restores that exact question with a clean board.
    if (mode !== "bonus" && roundQuestions) {
      const questionId = roundQuestions[mode];
      const freshGame = reducer(s, { type: "next", id: questionId });
      dispatch({ type: "__load", s: { ...freshGame, active: s.active, controlTeam: s.active } });
    }
    setRoundMode(mode);
    localStorage.setItem(ROUND_KEY, mode);
    if (mode === "bonus") {
      const freshBonus = { ...bonus, index: 0, accepted: [], total: 0 };
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
    const match = bonus.questions[bonus.index].answers.find((answer) => answerMatches(guess, answer));
    if (!match) { setBonusFeedback("Not on the answer key. No points this time."); playWrongBuzzer(); setBonusGuess(""); return; }
    if (bonus.accepted.includes(bonus.index + ":" + normText(match))) { setBonusFeedback("That answer has already been scored."); setBonusGuess(""); return; }
    updateBonus({ ...bonus, accepted: [...bonus.accepted, bonus.index + ":" + normText(match)], total: bonus.total + 100 });
    actRef.current({ type: "adjustScore", team: s.active, delta: 100 });
    setBonusFeedback("Correct! +100 points for " + s.teamNames[s.active] + ".");
    setBonusGuess(""); playCorrectBell(); playAudienceApplause();
  };
  const updateTimer = (next: TimerState) => {
    setTimer(next);
    localStorage.setItem(TIMER_KEY, JSON.stringify(next));
  };
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

      // Bright opening theme that builds into a big game-show finish.
      const melody = [
        { frequency: 392, start: 0, duration: 0.42 },
        { frequency: 523.25, start: 0.34, duration: 0.42 },
        { frequency: 659.25, start: 0.68, duration: 0.42 },
        { frequency: 783.99, start: 1.02, duration: 0.55 },
        { frequency: 1046.5, start: 1.62, duration: 0.9 },
      ];
      melody.forEach(({ frequency, start, duration }) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, now + start);
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.16, now + start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + start);
        oscillator.stop(now + start + duration + 0.02);
      });

      // Fast, accelerating low drum-roll pulses.
      for (let i = 0; i < 14; i++) {
        const start = now + 0.85 + i * (0.105 - i * 0.0045);
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(105 - i * 2.2, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.075);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.08);
      }

      // Final triumphant chord.
      [392, 493.88, 587.33, 783.99].forEach((frequency) => {
        const start = now + 2.55;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.17, start + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.25);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + 1.28);
      });

      // Welcome the audience after the musical finish.
      window.setTimeout(() => playAudienceApplause(), 2850);
    } catch {
      // The show can still begin if audio is unavailable.
    }
  };

  // Automatically launch the intro once when the host game opens.
  // Browsers may block audible autoplay until the host interacts with the page.
  const autoIntroStartedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || stageOnly || autoIntroStartedRef.current) return;
    autoIntroStartedRef.current = true;
    playShowIntro();
  }, [hydrated, stageOnly]);

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
      if (!stageOnly && q.answers[a.index]?.text && "speechSynthesis" in window) {
        const spokenAnswer = q.answers[a.index].text;
        window.speechSynthesis.cancel();
        window.setTimeout(() => {
          const announcement = new SpeechSynthesisUtterance(`We have ${spokenAnswer} on the board!`);
          announcement.lang = "en-US";
          announcement.rate = 0.95;
          announcement.pitch = 1.05;
          announcement.volume = 1;
          window.speechSynthesis.speak(announcement);
        }, 250);
      }
    }
    const nextState = reducer(s, a);
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
      else if (k === "x") actRef.current({ type: "strike" });
      else if (k === "n") actRef.current({ type: "next" });
      else if (k === "r") actRef.current({ type: "next", random: true });
      else if (k === "a" || k === "b") actRef.current({ type: "setActive", team: k.toUpperCase() as Team });
      else if (k === " " || k === "enter") {
        e.preventDefault();
        actRef.current({ type: "award", team: stateRef.current.active });
      } else if (k === "s") setStageOnly((v) => !v);
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
      <div className={stageOnly ? "flex h-screen items-center justify-center bg-background" : "mx-auto max-w-[1500px] p-3 lg:p-5"}>
        <div className={stageOnly ? "aspect-video w-full max-h-screen max-w-[calc(100vh*16/9)]" : "aspect-video w-full"}>
          <Stage s={s} q={q} strikeFlash={strikeFlash} timer={timer} onReveal={(i) => act({ type: "reveal", index: i })} roundMode={roundMode} bonus={bonus} />
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
            timer={timer}
            onTimerChange={updateTimer}
            onStage={() => window.open(`${window.location.pathname}?stage=1`, "_blank", "noopener,noreferrer")}
            onHelp={() => setHelp(true)}
            onEdit={() => setEditing(true)}
            onNewMatch={() => setConfirmNew(true)}
            onPlayIntro={playShowIntro}
            roundMode={roundMode}
            onRoundChange={changeRound}
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
      {editing && (
        <EditDialog
          q={q}
          onClose={() => setEditing(false)}
          onSave={(question) => { act({ type: "editQuestion", question }); setEditing(false); }}
        />
      )}
      {confirmNew && (
        <Modal onClose={() => setConfirmNew(false)} title="Start a new match?">
          <p className="text-muted-foreground">Both team scores go back to 0 and all questions become unused. Your edited questions are kept.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setConfirmNew(false)}>Cancel</button>
            <button className={btnDanger} onClick={() => { act({ type: "newMatch" }); const assignments = { classic: s.currentId, double: "", triple: "" }; const pool = s.questions.filter((question) => question.id !== s.currentId).sort(() => Math.random() - 0.5); assignments.double = pool[0]?.id ?? s.currentId; assignments.triple = pool[1]?.id ?? pool[0]?.id ?? s.currentId; setRoundQuestions(assignments); localStorage.setItem(ROUND_QUESTIONS_KEY, JSON.stringify(assignments)); changeRound("classic"); setConfirmNew(false); }}>Yes, new match</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* ---------------- STAGE ---------------- */

function Stage({ s, q, strikeFlash, timer, onReveal, roundMode, bonus }: { s: GameState; q: Question; strikeFlash: number; timer: TimerState; onReveal: (i: number) => void; roundMode: RoundMode; bonus: BonusState }) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!strikeFlash) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [strikeFlash]);

  const w = winner(s);
  return (
    <section className="stage-bg kingson-arena relative h-full w-full overflow-hidden rounded-2xl border border-border select-none" style={{ containerType: "size" }}>
      <style>{`
@keyframes ks-drift{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(2%,-3%,0) scale(1.08)}}
@keyframes ks-sweep{0%{transform:translateX(-120%) rotate(18deg);opacity:0}15%{opacity:.6}100%{transform:translateX(240%) rotate(18deg);opacity:0}}
@keyframes ks-tile-in{0%{transform:rotateX(70deg) scale(.88);opacity:.2}70%{transform:rotateX(-5deg) scale(1.02);opacity:1}100%{transform:rotateX(0) scale(1);opacity:1}}
@keyframes ks-glow{0%,100%{box-shadow:0 0 14px rgba(245,185,66,.16)}50%{box-shadow:0 0 28px rgba(245,185,66,.4)}}
@keyframes ks-title{0%,100%{text-shadow:0 0 10px rgba(245,185,66,.25)}50%{text-shadow:0 0 22px rgba(50,190,255,.55),0 0 34px rgba(245,185,66,.3)}}
.kingson-arena{isolation:isolate;background:radial-gradient(ellipse at 50% 42%,rgba(14,70,91,.58),transparent 48%),radial-gradient(ellipse at 8% 8%,rgba(176,112,26,.22),transparent 34%),linear-gradient(135deg,#05070d,#101827 48%,#07090f)}
.kingson-arena:before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;opacity:.14;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:42px 42px}
.kingson-arena:after{content:'';position:absolute;top:-35%;bottom:-35%;left:-35%;width:20%;pointer-events:none;z-index:1;background:linear-gradient(90deg,transparent,rgba(90,205,255,.13),rgba(255,210,120,.16),transparent);filter:blur(12px);animation:ks-sweep 12s ease-in-out infinite}
.ks-orb{position:absolute;width:24cqh;aspect-ratio:1;border-radius:50%;pointer-events:none;filter:blur(34px);opacity:.17;animation:ks-drift 9s ease-in-out infinite}
.ks-title-glow{animation:ks-title 4s ease-in-out infinite}
.ks-question{border:1px solid rgba(245,190,82,.62);background:linear-gradient(110deg,rgba(12,19,31,.92),rgba(17,55,70,.82),rgba(29,22,39,.92));box-shadow:0 10px 35px rgba(0,0,0,.3),0 0 24px rgba(245,185,66,.11),inset 0 1px rgba(255,255,255,.12);backdrop-filter:blur(12px)}
.ks-tile{position:relative;overflow:hidden;border:1px solid rgba(245,190,82,.45);box-shadow:0 8px 18px rgba(0,0,0,.3),inset 0 1px rgba(255,255,255,.12);transition:transform .28s ease,filter .28s ease,box-shadow .28s ease;transform-style:preserve-3d}
.ks-tile:hover:not(:disabled){transform:translateY(-3px) scale(1.015);filter:brightness(1.2);box-shadow:0 12px 28px rgba(0,0,0,.4),0 0 18px rgba(55,190,255,.2)}
.ks-tile.tile-closed{background:linear-gradient(135deg,#17354a,#102333 55%,#172039)}
.ks-tile.tile-open{background:linear-gradient(115deg,rgba(151,103,30,.98),rgba(44,57,68,.98) 58%,rgba(19,89,105,.98));animation:ks-tile-in .55s cubic-bezier(.2,.8,.2,1) both,ks-glow 3.2s ease-in-out infinite .55s}
.ks-tile.tile-shown{background:linear-gradient(115deg,rgba(32,40,52,.96),rgba(18,29,43,.96));opacity:.88;animation:ks-tile-in .45s ease-out both}
.ks-podium{position:relative;overflow:hidden;background:linear-gradient(155deg,rgba(24,36,53,.92),rgba(7,12,22,.86));box-shadow:0 12px 30px rgba(0,0,0,.28),inset 0 1px rgba(255,255,255,.08);backdrop-filter:blur(8px);transition:transform .35s ease,box-shadow .35s ease}
.ks-podium-active{transform:translateY(-3px);box-shadow:0 0 26px rgba(45,185,255,.22),0 14px 32px rgba(0,0,0,.35),inset 0 0 22px rgba(45,185,255,.08)}
.ks-winner-screen{background:radial-gradient(ellipse at 50% 42%,rgba(25,105,125,.45),transparent 55%),rgba(3,6,13,.94);backdrop-filter:blur(14px)}
@media(prefers-reduced-motion:reduce){.kingson-arena *,.kingson-arena:after{animation:none!important;transition:none!important}}
`}</style>
      <div className="ks-orb bg-cyan-400" style={{ top: "8%", left: "-7%" }} />
      <div className="ks-orb bg-amber-400" style={{ bottom: "-8%", right: "-5%", animationDelay: "-4s" }} />
      <div className="spotlight pointer-events-none absolute -top-[10%] left-[8%] h-[120%] w-[30%]" />
      <div className="spotlight pointer-events-none absolute -top-[10%] right-[8%] h-[120%] w-[30%]" style={{ animationDelay: "-4.5s" }} />

      <div className="relative flex h-full flex-col px-[3cqw] py-[2.2cqh]">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="ks-title-glow font-display tracking-wide leading-none" style={{ fontSize: "3.4cqh" }}>
            <span className="gold-text">KINGSON</span> <span className="text-electric">SURVEY SHOW</span>
          </div>
          <div className="flex items-center gap-[1.5cqw] font-display text-muted-foreground" style={{ fontSize: "2.6cqh" }}>
            <span>{roundMode === "bonus" ? "KINGSON BONUS ROUND" : roundMode === "triple" ? "TRIPLE POINT ROUND" : roundMode === "double" ? "DOUBLE POINT ROUND" : "CLASSIC ROUND"}</span>
            <span className={timer.remaining <= 5 && timer.running ? "text-destructive" : "text-gold"}>TIME {timer.remaining}s</span>
            {s.phase === "steal" && <span className="pop rounded-md bg-destructive px-[1cqw] text-destructive-foreground">STEAL! {s.teamNames[s.active]}</span>}
          </div>
        </div>

        {/* question */}
        <div className="ks-question mt-[2cqh] rounded-xl px-[2cqw] py-[1.8cqh] text-center">
          <h1 className="font-display uppercase leading-tight tracking-wide" style={{ fontSize: "4.6cqh" }}>{roundMode === "bonus" ? bonus.questions[bonus.index].prompt : q.prompt}</h1>
        </div>

        {/* body */}
        <div className="mt-[2.5cqh] grid flex-1 grid-cols-[1fr_3.2fr_1fr] gap-[2cqw] min-h-0">
          <Podium s={s} team="A" />
          <div className="flex min-h-0 flex-col">
            {roundMode === "bonus" ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-gold/60 bg-background/55 text-center">
                <div className="font-display text-gold" style={{fontSize:"4cqh"}}>BONUS CHALLENGE {bonus.index + 1} / 5</div>
                <div className="mt-[2cqh] font-display text-electric" style={{fontSize:"3cqh"}}>100 POINTS PER CORRECT ANSWER</div>
                <div className="mt-[2cqh] font-display text-gold" style={{fontSize:"5cqh"}}>{bonus.accepted.filter((a) => a.startsWith(bonus.index + ":")).length} ANSWERS SCORED</div>
                <div className="mt-[1cqh] text-muted-foreground" style={{fontSize:"2.5cqh"}}>THE HOST IS CHECKING YOUR ANSWERS</div>
              </div>
            ) : <>
            <div className="mb-[1.5cqh] flex items-center justify-center gap-[1cqw]">
              <span className="font-display text-muted-foreground" style={{ fontSize: "2.4cqh" }}>ROUND BANK</span>
              <span key={s.bank} className="pop font-display gold-text" style={{ fontSize: "5cqh", lineHeight: 1 }}>{s.bank}</span>
            </div>
            <div className="grid flex-1 grid-cols-2 grid-rows-3 gap-[1.2cqw] min-h-0" style={{ perspective: 800 }}>
              {q.answers.map((ans, i) => {
                const t = s.tiles[i];
                return (
                  <button
                    key={`${q.id}-${i}-${t}`}
                    onClick={() => onReveal(i)}
                    disabled={t !== "hidden"}
                    className={`ks-tile flex items-center rounded-xl px-[1.5cqw] text-left ${t === "hidden" ? "tile-closed cursor-pointer hover:brightness-125" : t === "scored" ? "tile-open" : "tile-shown"}`}
                    aria-label={t === "hidden" ? `Reveal answer ${i + 1}` : `${ans.text} ${ans.points}`}
                  >
                    {t === "hidden" ? (
                      <span className="mx-auto flex aspect-square h-[70%] items-center justify-center rounded-full bg-background/70 font-display text-gold" style={{ fontSize: "5cqh", border: "2px solid var(--gold)" }}>{i + 1}</span>
                    ) : (
                      <>
                        <span className="flex-1 truncate font-display uppercase" style={{ fontSize: "3.6cqh" }}>{ans.text}</span>
                        <span className={`ml-[1cqw] flex h-[72%] aspect-square items-center justify-center rounded-lg font-display ${t === "scored" ? "bg-primary-foreground text-primary" : "bg-muted"}`} style={{ fontSize: "3.8cqh" }}>{ans.points}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            {/* strikes */}
            <div className="mt-[2cqh] flex h-[9cqh] items-center justify-center gap-[1.5cqw]">
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

      {flash && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-destructive/15">
          <span className="pop font-display text-destructive" style={{ fontSize: "40cqh", lineHeight: 1, textShadow: "0 0 40px var(--destructive)" }}>✕</span>
        </div>
      )}

      {s.gameOver && (
        <div className="ks-winner-screen absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-display text-electric" style={{ fontSize: "4cqh" }}>AND THE WINNER IS…</div>
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
    <div className={`ks-podium flex flex-col items-center justify-center rounded-2xl border-2 ${active ? "ks-podium-active glow-active border-electric" : "border-border opacity-80"}`}>
      <div className="font-display text-center uppercase tracking-wide" style={{ fontSize: "3.4cqh" }}>{s.teamNames[team]}</div>
      <div key={s.scores[team]} className="pop font-display gold-text" style={{ fontSize: "12cqh", lineHeight: 1.1 }}>{s.scores[team]}</div>
      <div className={`mt-[1cqh] rounded-full px-[1cqw] font-display ${active ? "bg-electric text-accent-foreground" : "text-transparent"}`} style={{ fontSize: "2.2cqh" }}>
        {s.phase === "steal" && active ? "STEALING" : "PLAYING"}
      </div>
    </div>
  );
}

/* ---------------- HOST ---------------- */

function HostPanel({ s, q, act, timer, onTimerChange, onStage, onHelp, onEdit, onNewMatch, onPlayIntro, roundMode, onRoundChange, bonus, onBonusChange, bonusGuess, setBonusGuess, bonusFeedback, submitBonusGuess }: {
  s: GameState; q: Question; act: (a: Action) => void; timer: TimerState; onTimerChange: (timer: TimerState) => void; onStage: () => void; onHelp: () => void; onEdit: () => void; onNewMatch: () => void; onPlayIntro: () => void;
  roundMode: RoundMode; onRoundChange: (mode: RoundMode) => void; bonus: BonusState; onBonusChange: (next: BonusState) => void; bonusGuess: string; setBonusGuess: (value: string) => void; bonusFeedback: string; submitBonusGuess: () => void;
}) {
  const unused = s.questions.filter((x) => !s.usedIds.includes(x.id)).length;
  return (
    <section className="mt-4 rounded-2xl border-2 border-dashed border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl tracking-wide text-gold">HOST CONTROLS <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">not part of the show — open Stage view in a second tab when streaming</span></h2>
        <div className="flex flex-wrap gap-2">
          <button className={btnGold} onClick={onPlayIntro}>▶ Play show intro</button>
          <button className={btnGhost} onClick={onHelp}>How to play (H)</button>
          <button className={btnBlue} onClick={onStage}>Stage view (S)</button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gold/50 bg-muted p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-display text-lg text-gold">ROUND COUNTDOWN</h3><p className="text-xs text-muted-foreground">The audience Stage screen updates automatically.</p></div>
          <div className={"font-display text-3xl tabular-nums " + (timer.remaining <= 5 && timer.running ? "text-destructive" : "text-gold")}>{timer.remaining}s</div>
          <div className="flex flex-wrap items-center gap-2">
            {[60, 30, 20, 15, 10].map((seconds) => <button key={seconds} className={timer.duration === seconds ? btnGold : btnGhost} onClick={() => onTimerChange({ duration: seconds, remaining: seconds, running: false, endsAt: null })}>{seconds}s</button>)}
            <button className={btnBlue} onClick={() => onTimerChange(timer.running ? { ...timer, running: false, endsAt: null } : { ...timer, running: true, endsAt: Date.now() + timer.remaining * 1000 })} disabled={timer.remaining === 0}>{timer.running ? "Pause" : "Start"}</button>
            <button className={btnGhost} onClick={() => onTimerChange({ ...timer, remaining: timer.duration, running: false, endsAt: null })}>Reset</button>
          </div>
        </div>
      </div>
      <div className="mb-4 rounded-xl border border-electric/40 bg-muted p-3">
        <h3 className="mb-2 font-display text-lg text-gold">SHOW ROUNDS</h3>
        <div className="flex flex-wrap gap-2">
          {([["classic","Round 1 · Classic ×1"],["double","Round 2 · Double ×2"],["triple","Round 3 · Triple ×3"],["bonus","Kingson Bonus Round"]] as [RoundMode,string][]).map(([mode,label]) => <button key={mode} className={roundMode===mode?btnGold:btnGhost} onClick={()=>onRoundChange(mode)}>{label}</button>)}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{roundMode==="classic"?"Normal survey points.":roundMode==="double"?"Every correct board answer earns double points.":roundMode==="triple"?"Every correct board answer earns triple points.":"Five host-checked questions. Each accepted answer earns 100 points."}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Round */}
        <div className="rounded-xl bg-muted p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Playing team</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as Team[]).map((t) => (
              <button key={t} disabled={s.phase !== "play"} onClick={() => act({ type: "setActive", team: t })}
                className={`${btn} border-2 ${s.active === t ? "border-electric bg-secondary text-secondary-foreground" : "border-border bg-card text-foreground"}`}>
                {s.teamNames[t]} ({t})
              </button>
            ))}
          </div>
          <div className="mt-3 text-sm">
            {s.phase === "play" && <>Strikes: <b className="text-destructive">{s.strikes}/3</b> · Click tiles or press 1–6.</>}
            {s.phase === "steal" && <span className="text-gold font-semibold">STEAL: {s.teamNames[s.active]} gets one guess. Reveal their answer if it's on the board, or mark it failed.</span>}
            {s.phase === "awarded" && <span className="text-muted-foreground">Round finished. Reveal leftover answers (no points) or go to the next question.</span>}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className={btnDanger} disabled={s.phase === "awarded"} onClick={() => act({ type: "strike" })}>
              {s.phase === "steal" ? "✕ Wrong steal (X)" : "✕ Strike (X)"}
            </button>
            <button className={btnGhost} disabled={s.phase === "awarded" || (s.phase === "play" && s.strikes === 0)} onClick={() => act({ type: "undoStrike" })}>Undo strike</button>
          </div>
          {s.phase === "steal" && (
            <button className={`${btnGold} mt-2 w-full`} onClick={() => act({ type: "stealFail" })}>
              Steal failed → bank {s.bank} to {s.teamNames[s.controlTeam]}
            </button>
          )}
        </div>

        {/* Bank */}
        <div className="rounded-xl bg-muted p-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Round bank: <span className="text-gold text-base">{s.bank}</span></h3>
          <div className="grid grid-cols-2 gap-2">
            {(["A", "B"] as Team[]).map((t) => (
              <button key={t} className={t === s.active ? btnGold : btnGhost} disabled={s.phase === "awarded"} onClick={() => act({ type: "award", team: t })}>
                Bank to {s.teamNames[t]}{t === s.active ? " (Space)" : ""}
              </button>
            ))}
          </div>
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

        {/* Questions */}
        <div className="rounded-xl bg-muted p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Questions · {unused} unused</h3>
            <button className="text-xs font-semibold text-electric hover:underline" onClick={onEdit}>Edit current</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className={btnBlue} onClick={() => act({ type: "next" })}>Next question (N)</button>
            <button className={btnGhost} onClick={() => act({ type: "next", random: true })}>Random (R)</button>
          </div>
          {s.bank > 0 && s.phase !== "awarded" && <p className="mt-2 text-xs text-destructive">Bank has {s.bank} unbanked points — moving on discards them.</p>}
          <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto pr-1 text-sm">
            {s.questions.map((x, i) => {
              const used = s.usedIds.includes(x.id);
              const cur = x.id === q.id;
              return (
                <li key={x.id}>
                  <button disabled={cur} onClick={() => act({ type: "next", id: x.id })}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left ${cur ? "bg-secondary text-secondary-foreground" : "hover:bg-card"}`}>
                    <span className="w-5 text-muted-foreground">{i + 1}.</span>
                    <span className={`flex-1 truncate ${used && !cur ? "text-muted-foreground line-through" : ""}`}>{x.prompt}</span>
                    <span className="text-[10px] uppercase">{cur ? "live" : used ? "used" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {s.gameOver
              ? <button className={btnGhost} onClick={() => act({ type: "resumeGame" })}>Hide winner</button>
              : <button className={btnGold} onClick={() => act({ type: "endGame" })}>End game · show winner</button>}
            <button className={btnDanger} onClick={onNewMatch}>New match…</button>
          </div>
        </div>
      </div>

      {roundMode === "bonus" && (
        <div className="mt-4 rounded-xl border-2 border-gold/60 bg-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-xl text-gold">KINGSON BONUS ROUND · HOST ONLY</h3><b className="text-gold">BONUS TOTAL: {bonus.total} pts</b></div>
          <div className="mt-3 flex flex-wrap gap-2">
            {bonus.questions.map((item,i)=><button key={i} className={bonus.index===i?btnGold:btnGhost} onClick={()=>onBonusChange({...bonus,index:i})}>Question {i+1}</button>)}
            <button className={btnBlue} onClick={()=>onBonusChange({...bonus,index:(bonus.index+1)%5})}>Next bonus question →</button>
            <button className={btnGhost} onClick={()=>onBonusChange({...bonus,index:0,accepted:[],total:0})}>Reset bonus round</button>
          </div>
          <label className="mt-3 block text-xs font-bold uppercase text-muted-foreground">Question shown to viewers</label>
          <input className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2" value={bonus.questions[bonus.index].prompt} onChange={e=>{const questions=[...bonus.questions];questions[bonus.index]={...questions[bonus.index],prompt:e.target.value};onBonusChange({...bonus,questions});}} />
          <label className="mt-3 block text-xs font-bold uppercase text-muted-foreground">Private accepted answers · edit these before the show</label>
          <div className="mt-1 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {bonus.questions[bonus.index].answers.map((answer,i)=><input key={i} aria-label={"Bonus accepted answer "+(i+1)} className="min-w-0 rounded-md border border-input bg-card px-2 py-2 text-sm" value={answer} onChange={e=>{const questions=[...bonus.questions];const answers=[...questions[bonus.index].answers];answers[i]=e.target.value;questions[bonus.index]={...questions[bonus.index],answers};onBonusChange({...bonus,questions});}} />)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input className="min-w-0 flex-1 rounded-md border border-input bg-card px-3 py-2" placeholder="Type the viewer's answer…" value={bonusGuess} onChange={e=>setBonusGuess(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();submitBonusGuess();}}} />
            <button className={btnGold} disabled={!bonusGuess.trim()} onClick={submitBonusGuess}>Check · award 100</button>
          </div>
          {bonusFeedback && <p className="mt-2 text-sm font-semibold text-gold">{bonusFeedback}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Current team: {s.teamNames[s.active]}. The audience never sees this answer key.</p>
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
  const keys: [string, string][] = [["1 – 6", "Reveal answer tile"], ["X", "Strike (or failed steal)"], ["A / B", "Choose playing team"], ["Space / Enter", "Bank round to playing team"], ["N", "Next unused question"], ["R", "Random question"], ["S", "Toggle stage view"], ["H", "This help"], ["Esc", "Close / exit stage view"]];
  return (
    <Modal title="How to play" onClose={onClose}>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>Read the survey question. Viewers shout answers in the comments for their team.</li>
        <li>Pick the playing team. When a guess is on the board, click its tile — points go into the round bank.</li>
        <li>Wrong guess? Add a strike. After 3 strikes the other team gets one steal guess.</li>
        <li>Steal right: reveal it, and the whole bank goes to the stealers. Steal wrong: the bank goes back to the original team.</li>
        <li>Or bank points any time with the bank buttons. Then show leftover answers and hit Next question.</li>
        <li>End game to announce the winner. Everything is saved in this browser, so a refresh is safe.</li>
      </ol>
      <h3 className="mt-4 mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Keyboard shortcuts</h3>
      <div className="grid grid-cols-2 gap-1 text-sm">
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

