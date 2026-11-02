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

function Game() {
  const [{ s, hydrated }, dispatch] = useReducer(wrapped, null, () => ({ s: initialState(), hydrated: false }));
  const [stageOnly, setStageOnly] = useState(false);
  const [help, setHelp] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [strikeFlash, setStrikeFlash] = useState(0);
  const [timer, setTimer] = useState<TimerState>({ duration: 30, remaining: 30, running: false, endsAt: null });

  useEffect(() => {
    const saved = loadState();
    dispatch({ type: "__load", s: saved ?? initialState() });
    setStageOnly(new URLSearchParams(window.location.search).get("stage") === "1");
    try { const savedTimer = localStorage.getItem(TIMER_KEY); if (savedTimer) setTimer(JSON.parse(savedTimer) as TimerState); } catch { /* Keep defaults. */ }
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
    window.addEventListener("storage", syncFromOtherTab);
    window.addEventListener("storage", syncTimer);
    return () => { window.removeEventListener("storage", syncFromOtherTab); window.removeEventListener("storage", syncTimer); };
  }, []);
  useEffect(() => { if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }, [s, hydrated]);
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

  const act = (a: Action) => {
    if (a.type === "strike" && s.phase !== "awarded") {
      setStrikeFlash((n) => n + 1);
    }
    if (a.type === "reveal" && s.tiles[a.index] === "hidden") playCorrectBell();
    dispatch(a);
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
          <Stage s={s} q={q} strikeFlash={strikeFlash} timer={timer} onReveal={(i) => act({ type: "reveal", index: i })} />
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
            <button className={btnDanger} onClick={() => { act({ type: "newMatch" }); setConfirmNew(false); }}>Yes, new match</button>
          </div>
        </Modal>
      )}
    </main>
  );
}

/* ---------------- STAGE ---------------- */

function Stage({ s, q, strikeFlash, timer, onReveal }: { s: GameState; q: Question; strikeFlash: number; timer: TimerState; onReveal: (i: number) => void }) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!strikeFlash) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 900);
    return () => clearTimeout(t);
  }, [strikeFlash]);

  const w = winner(s);
  return (
    <section className="stage-bg relative h-full w-full overflow-hidden rounded-2xl border border-border select-none" style={{ containerType: "size" }}>
      <div className="spotlight pointer-events-none absolute -top-[10%] left-[8%] h-[120%] w-[30%]" />
      <div className="spotlight pointer-events-none absolute -top-[10%] right-[8%] h-[120%] w-[30%]" style={{ animationDelay: "-4.5s" }} />

      <div className="relative flex h-full flex-col px-[3cqw] py-[2.2cqh]">
        {/* header */}
        <div className="flex items-center justify-between">
          <div className="font-display tracking-wide leading-none" style={{ fontSize: "3.4cqh" }}>
            <span className="gold-text">KINGSON</span> <span className="text-electric">SURVEY SHOW</span>
          </div>
          <div className="flex items-center gap-[1.5cqw] font-display text-muted-foreground" style={{ fontSize: "2.6cqh" }}>
            <span>ROUND {s.round}</span>
            <span className={timer.remaining <= 5 && timer.running ? "text-destructive" : "text-gold"}>TIME {timer.remaining}s</span>
            {s.phase === "steal" && <span className="pop rounded-md bg-destructive px-[1cqw] text-destructive-foreground">STEAL! {s.teamNames[s.active]}</span>}
          </div>
        </div>

        {/* question */}
        <div className="mt-[2cqh] rounded-xl gold-frame bg-background/60 px-[2cqw] py-[1.8cqh] text-center">
          <h1 className="font-display uppercase leading-tight tracking-wide" style={{ fontSize: "4.6cqh" }}>{q.prompt}</h1>
        </div>

        {/* body */}
        <div className="mt-[2.5cqh] grid flex-1 grid-cols-[1fr_3.2fr_1fr] gap-[2cqw] min-h-0">
          <Podium s={s} team="A" />
          <div className="flex min-h-0 flex-col">
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
                    className={`flex items-center rounded-xl px-[1.5cqw] text-left ${t === "hidden" ? "tile-closed cursor-pointer hover:brightness-125" : t === "scored" ? "tile-open" : "tile-shown"}`}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 text-center">
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
    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 bg-card/70 transition ${active ? "glow-active border-electric" : "border-border opacity-80"}`}>
      <div className="font-display text-center uppercase tracking-wide" style={{ fontSize: "3.4cqh" }}>{s.teamNames[team]}</div>
      <div key={s.scores[team]} className="pop font-display gold-text" style={{ fontSize: "12cqh", lineHeight: 1.1 }}>{s.scores[team]}</div>
      <div className={`mt-[1cqh] rounded-full px-[1cqw] font-display ${active ? "bg-electric text-accent-foreground" : "text-transparent"}`} style={{ fontSize: "2.2cqh" }}>
        {s.phase === "steal" && active ? "STEALING" : "PLAYING"}
      </div>
    </div>
  );
}

/* ---------------- HOST ---------------- */

function HostPanel({ s, q, act, timer, onTimerChange, onStage, onHelp, onEdit, onNewMatch }: {
  s: GameState; q: Question; act: (a: Action) => void; timer: TimerState; onTimerChange: (timer: TimerState) => void; onStage: () => void; onHelp: () => void; onEdit: () => void; onNewMatch: () => void;
}) {
  const unused = s.questions.filter((x) => !s.usedIds.includes(x.id)).length;
  return (
    <section className="mt-4 rounded-2xl border-2 border-dashed border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl tracking-wide text-gold">HOST CONTROLS <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">not part of the show — open Stage view in a second tab when streaming</span></h2>
        <div className="flex gap-2">
          <button className={btnGhost} onClick={onHelp}>How to play (H)</button>
          <button className={btnBlue} onClick={onStage}>Stage view (S)</button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gold/50 bg-muted p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="font-display text-lg text-gold">ROUND COUNTDOWN</h3><p className="text-xs text-muted-foreground">The audience Stage screen updates automatically.</p></div>
          <div className={"font-display text-3xl tabular-nums " + (timer.remaining <= 5 && timer.running ? "text-destructive" : "text-gold")}>{timer.remaining}s</div>
          <div className="flex flex-wrap items-center gap-2">
            {[30, 20, 15, 10].map((seconds) => <button key={seconds} className={timer.duration === seconds ? btnGold : btnGhost} onClick={() => onTimerChange({ duration: seconds, remaining: seconds, running: false, endsAt: null })}>{seconds}s</button>)}
            <button className={btnBlue} onClick={() => onTimerChange(timer.running ? { ...timer, running: false, endsAt: null } : { ...timer, running: true, endsAt: Date.now() + timer.remaining * 1000 })} disabled={timer.remaining === 0}>{timer.running ? "Pause" : "Start"}</button>
            <button className={btnGhost} onClick={() => onTimerChange({ ...timer, remaining: timer.duration, running: false, endsAt: null })}>Reset</button>
          </div>
        </div>
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

      <AnswerKey s={s} q={q} act={act} />
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
  const checking = normText(guess).length > 0;
  const hits = q.answers.map((a) => answerMatches(guess, a.text));
  const hitCount = hits.filter(Boolean).length;
  return (
    <div className="mt-4 rounded-xl border-2 border-dashed border-destructive/60 bg-muted/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg tracking-wide text-gold">
          HOST ANSWER KEY <span className="ml-1 rounded bg-destructive px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-widest text-destructive-foreground">Private</span>
        </h3>
        <span className="text-xs text-muted-foreground">Hidden in Stage view — viewers never see this.</span>
      </div>

      <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-muted-foreground" htmlFor="viewer-guess">
        Check a viewer's answer
      </label>
      <input
        id="viewer-guess"
        type="text"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="Type or paste what a viewer said…"
        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
      />
      {checking && (
        <p className="mt-1 text-xs text-muted-foreground">
          {hitCount > 0 ? `${hitCount} likely match${hitCount > 1 ? "es" : ""} highlighted below — tap one to reveal it.` : "No close match on the board."}
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
        Matching is approximate — similar wording and synonyms need your judgment. Checking never awards points; you reveal the official tile yourself.
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

