import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  STATUSES,
  STATUS_LABELS,
  fetch_reviews,
  fetch_stats,
  fetch_words,
  post_reviews,
  type Filter,
  type ReviewRequest,
  type Status,
  type Word,
} from "./api";
import { inflections_after } from "./inflections";
import "./App.css";

// one decision in the history, about one word or a word and its inflections.
// a skip has from === to, and never reaches the server
type Change = { word: Word; from: Status; to: Status };

type Decision = {
  key:     string;
  changes: Change[];
  state:   "saving" | "saved" | "failed";
};

const DEFAULT_FILTER: Filter = { status: "unchecked", prefix: "", min_length: 4, max_length: 10 };

// approving twice in a row by accident is the expensive mistake, since it puts
// a word in a daily puzzle, so a second approve right after one is ignored
const APPROVE_COOLDOWN_MS = 600;

const REFILL_BELOW = 60;
const HISTORY_SIZE = 200;

// the keys, also shown in the legend. f and j are where the index fingers rest
const KEYS: Array<{ key: string; label: string; to: Status }> = [
  { key: "j", label: "J", to: "approved" },
  { key: "f", label: "F", to: "unsuitable" },
  { key: "k", label: "K", to: "maybe" },
  { key: "d", label: "D", to: "discarded" },
  { key: "e", label: "E", to: "egennavn" },
  { key: "a", label: "A", to: "abbreviation" },
];

const read_json = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
};

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode, the setting just isn't remembered
  }
};

let next_key = 0;
const new_key = () => `d${next_key++}`;

const lookup_url = (word: string) => `https://ordbokene.no/nob/bm/${encodeURIComponent(word)}`;

export default function App() {
  const [token, set_token] = useState(() => localStorage.getItem("admin-token") ?? "");

  const log_in  = useCallback((t: string) => { write("admin-token", t);  set_token(t);  }, []);
  const log_out = useCallback(() =>          { write("admin-token", ""); set_token(""); }, []);

  if (!token) return <Login onToken={log_in} />;

  return <Picker token={token} onLogout={log_out} />;
}

function Login({ onToken }: { onToken: (token: string) => void }) {
  const [value, set_value] = useState("");

  return (
    <main className="login">
      <h1>Ordsmed</h1>
      <p>Lim inn admin-tokenet (ADMIN_TOKEN på letekryss-generator i Railway).</p>
      <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) onToken(value.trim()); }}>
        <input autoFocus type="password" value={value} onChange={(e) => set_value(e.target.value)} placeholder="token" />
        <button type="submit">Start</button>
      </form>
    </main>
  );
}

function Picker({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [filter, set_filter] = useState<Filter>(() => read_json("filter", DEFAULT_FILTER));
  useEffect(() => write("filter", JSON.stringify(filter)), [filter]);

  const [queue, set_queue]         = useState<Word[]>([]);
  const [remaining, set_remaining] = useState<number | null>(null);
  const [history, set_history]     = useState<Decision[]>([]);
  const [stats, set_stats]         = useState<Partial<Record<Status, number>> | null>(null);
  const [selected, set_selected]   = useState<number | null>(null);
  const [toast, set_toast]         = useState<string | null>(null);
  const [loading, set_loading]     = useState(false);

  const [session, set_session] = useState({ decided: 0, started_at: 0 });
  const [cooling, set_cooling] = useState(false);

  // the highest id loaded, so the next page starts after it. reset with the filter
  const after_id   = useRef(0);
  const exhausted  = useRef(false);
  const generation = useRef(0);

  // reviews go to the server one at a time, in the order they were made
  const saving = useRef<Promise<void>>(Promise.resolve());

  const fail = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) return onLogout();

    set_toast(error instanceof Error ? error.message : String(error));
  }, [onLogout]);

  const load_more = useCallback(async (reset: boolean) => {
    if (reset) {
      generation.current++;
      after_id.current  = 0;
      exhausted.current = false;
      set_queue([]);
    }
    if (exhausted.current) return;

    const this_generation = generation.current;
    set_loading(true);
    try {
      const page = await fetch_words(token, filter, after_id.current);
      if (this_generation !== generation.current) return;

      after_id.current  = page.words.at(-1)?.id ?? after_id.current;
      exhausted.current = page.words.length === 0;
      set_queue((q) => [...q, ...page.words.filter((w) => !q.some((x) => x.id === w.id))]);
      set_remaining(page.remaining);
    } catch (error) {
      fail(error);
    } finally {
      if (this_generation === generation.current) set_loading(false);
    }
  }, [token, filter, fail]);

  const load_history = useCallback(async () => {
    try {
      const { reviews } = await fetch_reviews(token);

      // the latest decision for each word, as it stands now
      const seen = new Set<number>();
      const decisions: Decision[] = [];
      for (const r of reviews) {
        if (seen.has(r.word_id)) continue;
        seen.add(r.word_id);

        const word = { id: r.word_id, word: r.word, checked: r.status_now };
        decisions.push({ key: new_key(), changes: [{ word, from: r.from_status, to: r.status_now }], state: "saved" });
      }
      set_history(decisions);
    } catch (error) {
      fail(error);
    }
  }, [token, fail]);

  const load_stats = useCallback(() => fetch_stats(token).then(set_stats, fail), [token, fail]);

  useEffect(() => {
    load_more(true);
  }, [load_more]);

  useEffect(() => {
    load_history();
    load_stats();
  }, [load_history, load_stats]);

  useEffect(() => {
    if (!loading && queue.length < REFILL_BELOW && !exhausted.current && after_id.current > 0) load_more(false);
  }, [queue.length, loading, load_more]);

  useEffect(() => {
    if (!toast) return;

    const t = setTimeout(() => set_toast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // sends the changes, and marks the decision saved or failed. a conflict
  // means the list is out of date, so it's loaded again
  const save = (key: string, changes: Change[]) => {
    const reviews: ReviewRequest[] = changes
      .filter((c) => c.from !== c.to)
      .map((c) => ({ id: c.word.id, from_status: c.from, to_status: c.to }));
    if (reviews.length === 0) return;

    const mark = (state: Decision["state"]) =>
      set_history((h) => h.map((d) => (d.key === key ? { ...d, state } : d)));

    saving.current = saving.current.then(() =>
      post_reviews(token, reviews).then(
        () => mark("saved"),
        (error) => {
          mark("failed");
          fail(error);
          if (error instanceof ApiError && error.status === 409) {
            load_more(true);
            load_history();
          }
        },
      ),
    );
  };

  const count_decision = () => {
    set_session((s) => ({ decided: s.decided + 1, started_at: s.started_at || Date.now() }));
    if ((session.decided + 1) % 25 === 0) load_stats();
  };

  const current     = queue[0];
  const inflections = current ? inflections_after(current, queue.slice(1)) : [];

  /**
   * decides the current word, or with `group`, the current word and its
   * inflections: the word gets `to` and the inflections `group_to`
   */
  const decide = (to: Status, group?: { group_to: Status }) => {
    if (!current) return;

    const words   = group ? [current, ...inflections] : [current];
    const changes = words.map((word, i) => ({ word, from: word.checked, to: i === 0 || !group ? to : group.group_to }));
    const key     = new_key();

    set_queue((q) => q.filter((w) => !words.some((x) => x.id === w.id)));
    set_history((h) => [{ key, changes, state: "saving" as const }, ...h].slice(0, HISTORY_SIZE));
    set_remaining((r) => (r === null ? r : Math.max(0, r - words.length)));
    count_decision();
    save(key, changes);
  };

  const skip = () => {
    if (!current) return;

    set_queue((q) => q.slice(1));
    set_history((h) => [{ key: new_key(), changes: [{ word: current, from: current.checked, to: current.checked }], state: "saved" as const }, ...h]);
  };

  /**
   * takes back the newest decision: the words get their old status, and go
   * back to the front of the queue if they belong in it
   */
  const undo = () => {
    const [last, ...rest] = history;
    if (!last) return;

    set_history(rest);
    set_selected(null);

    const back = last.changes.map((c) => ({ word: c.word, from: c.to, to: c.from }));
    save(new_key(), back);

    const returning = back
      .filter((c) => c.to === filter.status)
      .map((c) => ({ ...c.word, checked: c.to }));
    set_queue((q) => [...returning, ...q.filter((w) => !returning.some((r) => r.id === w.id))]);
    set_remaining((r) => (r === null ? r : r + returning.length));
  };

  /**
   * changes an older decision without undoing the ones after it
   */
  const redecide = (index: number, to: Status) => {
    const decision = history[index];
    if (!decision) return;

    const changes = decision.changes.map((c, i) => ({ word: c.word, from: c.to, to: i === 0 ? to : c.to }));
    const key     = new_key();

    set_history((h) =>
      h.map((d, i) => (i === index ? { key, changes: d.changes.map((c, j) => (j === 0 ? { ...c, to } : c)), state: "saving" as const } : d)),
    );
    set_selected(null);
    save(key, changes);
  };

  const last_approve = useRef(0);

  const choose = (to: Status) => {
    if (selected !== null) return redecide(selected, to);

    if (to === "approved") {
      if (Date.now() - last_approve.current < APPROVE_COOLDOWN_MS) return;

      last_approve.current = Date.now();
      set_cooling(true);
      setTimeout(() => set_cooling(false), APPROVE_COOLDOWN_MS);
    }
    decide(to);
  };

  const on_key = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
      if (e.key === "Escape") (e.target as HTMLElement).blur();
      return;
    }

    const key = e.key.toLowerCase();
    const binding = KEYS.find((k) => k.key === key);

    if (binding)                                    choose(binding.to);
    else if (key === " ")                           skip();
    else if (key === "z" || key === "backspace")    undo();
    else if (key === "g" && inflections.length > 0) decide("approved", { group_to: "unsuitable" });
    else if (key === "h" && inflections.length > 0) decide("unsuitable", { group_to: "unsuitable" });
    else if (key === "o" && current)                window.open(lookup_url(current.word), "ordbok");
    else if (key === "arrowdown")                   set_selected((s) => Math.min((s ?? -1) + 1, history.length - 1));
    else if (key === "arrowup")                     set_selected((s) => (s === null || s === 0 ? null : s - 1));
    else if (key === "escape")                      set_selected(null);
    else return;

    e.preventDefault();
  };

  const on_key_ref = useRef(on_key);
  on_key_ref.current = on_key;
  useEffect(() => {
    const listener = (e: KeyboardEvent) => on_key_ref.current(e);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);

  const minutes = session.started_at ? (Date.now() - session.started_at) / 60000 : 0;
  const rate    = minutes > 0.5 ? Math.round(session.decided / minutes) : null;

  const target = selected !== null ? history[selected]?.changes[0] : null;

  return (
    <div className="picker">
      <header className="bar">
        <span className="brand">Ordsmed</span>

        <label>
          viser
          <select value={filter.status} onChange={(e) => set_filter({ ...filter, status: e.target.value as Status })}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label>
          begynner med
          <input value={filter.prefix} onChange={(e) => set_filter({ ...filter, prefix: e.target.value })} size={8} />
        </label>
        <label>
          lengde
          <input type="number" min={1} max={15} value={filter.min_length} onChange={(e) => set_filter({ ...filter, min_length: Number(e.target.value) || 1 })} />
          –
          <input type="number" min={1} max={15} value={filter.max_length} onChange={(e) => set_filter({ ...filter, max_length: Number(e.target.value) || 15 })} />
        </label>

        <span className="spacer" />

        <span className="stat">{remaining ?? "…"} igjen</span>
        <span className="stat gold">{stats ? stats.approved ?? 0 : "…"} fasitord</span>
        <span className="stat">{session.decided} denne økta{rate !== null ? ` · ${rate}/min` : ""}</span>
        <button className="link" onClick={onLogout}>logg ut</button>
      </header>

      <main className="stage">
        {target ? (
          <div className="current editing">
            <div className="hint">endrer et tidligere valg · Esc for å gå tilbake</div>
            <div className="word">{target.word.word}</div>
            <div className="meta">nå: {STATUS_LABELS[target.to]}</div>
          </div>
        ) : current ? (
          <div className="current" key={current.id}>
            <div className="word">{current.word}</div>
            <div className="meta">
              {current.word.length} bokstaver ·{" "}
              <a href={lookup_url(current.word)} target="ordbok" rel="noreferrer">slå opp (O)</a>
            </div>
          </div>
        ) : (
          <div className="current empty">{loading ? "henter ord…" : "ingen flere ord med dette filteret"}</div>
        )}

        {!target && inflections.length > 0 && (
          <div className="inflections">
            <div className="forms">
              <span className="base">{current!.word}</span>
              {inflections.map((w) => (
                <span key={w.id}>{w.word}</span>
              ))}
            </div>
            <div className="actions">
              <button className="approve" onClick={() => decide("approved", { group_to: "unsuitable" })}>
                grunnform er fasitord, resten ikke <kbd>G</kbd>
              </button>
              <button className="reject" onClick={() => decide("unsuitable", { group_to: "unsuitable" })}>
                ingen er fasitord <kbd>H</kbd>
              </button>
            </div>
          </div>
        )}

        <div className="choices">
          <button className="reject big" onClick={() => choose("unsuitable")}>
            ikke fasitverdig <kbd>F</kbd>
          </button>
          <button className={`approve big${cooling ? " cooling" : ""}`} onClick={() => choose("approved")}>
            fasitord <kbd>J</kbd>
          </button>
        </div>
        <div className="choices small">
          {KEYS.filter((k) => k.to !== "approved" && k.to !== "unsuitable").map((k) => (
            <button key={k.key} onClick={() => choose(k.to)}>
              {STATUS_LABELS[k.to]} <kbd>{k.label}</kbd>
            </button>
          ))}
          {!target && (
            <button onClick={skip}>
              hopp over <kbd>␣</kbd>
            </button>
          )}
        </div>

        {!target && (
          <ol className="upcoming">
            {queue.slice(1 + inflections.length, 12).map((w, i) => (
              <li key={w.id} style={{ opacity: 0.7 - i * 0.06 }}>{w.word}</li>
            ))}
          </ol>
        )}
      </main>

      <aside className="history">
        <div className="history-head">
          <span>historikk</span>
          <button onClick={undo} disabled={history.length === 0}>
            angre siste <kbd>Z</kbd>
          </button>
        </div>
        <ol>
          {history.map((d, i) => {
            const first = d.changes[0]!;
            const skipped = d.changes.every((c) => c.from === c.to);

            return (
              <li
                key={d.key}
                className={`${i === selected ? "selected" : ""} ${d.state}`}
                onClick={() => set_selected(i === selected ? null : i)}
              >
                <span className="w">{first.word.word}</span>
                {d.changes.length > 1 && <span className="more">+{d.changes.length - 1}</span>}
                <span className={`chip ${skipped ? "skipped" : first.to}`}>
                  {skipped ? "hoppet over" : STATUS_LABELS[first.to]}
                </span>
                {d.state === "saving" && <span className="dot" title="lagrer" />}
                {d.state === "failed" && <span className="dot failed" title="ble ikke lagret" />}
              </li>
            );
          })}
        </ol>
        <p className="legend">
          ↑↓ velg et tidligere ord og trykk en bokstav for å endre det. Z angrer det siste og legger ordet tilbake i køen.
        </p>
      </aside>

      {toast && <div className="toast" onClick={() => set_toast(null)}>{toast}</div>}
    </div>
  );
}
