import { useEffect, useRef, useState } from "react";
import "./supabase";
import "./App.css";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ciyjaidifryfmubgxnsq.supabase.co";
let supabase: any;

type Word = { id: number; word: string; checked: string };

function App() {
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem("supabase-key") ?? ""
  );
  useEffect(() => {
    localStorage.setItem("supabase-key", supabaseKey);
  }, [supabaseKey]);

  const [filter, setFilter] = useState(
    localStorage.getItem("filter-key") ?? ""
  );
  useEffect(() => {
    localStorage.setItem("filter-key", filter);
  }, [filter]);

  const [mode, setMode] = useState("unchecked");

  const angre = useRef<Word[]>([]);

  const [words, setWords] = useState<Word[]>([]);
  const word = words[0];

  const onAccept = async () => {
    setWords(words.filter((w) => w.id !== word.id));
    angre.current?.push(word);
    setFasitTempDisabled(true);
    await supabase
      .from("words_no")
      .update({ checked: "confirmed" })
      .eq("id", word.id);
  };
  const onReject = async () => {
    setWords(words.filter((w) => w.id !== word.id));
    angre.current?.push(word);
    await supabase
      .from("words_no")
      .update({ checked: "unsuitable" })
      .eq("id", word.id);
  };
  const onUndo = async () => {
    const toAngre = angre.current?.pop();
    if (toAngre) {
      await supabase
        .from("words_no")
        .update({ checked: "unchecked" })
        .eq("id", toAngre.id);
      restart(mode);
    }
  };

  const [fasit_is_temporarily_disabled, setFasitTempDisabled] = useState(false);
  useEffect(() => {
    if (fasit_is_temporarily_disabled) {
      setTimeout(() => setFasitTempDisabled(false), 1000);
    }
  }, [fasit_is_temporarily_disabled]);

  useEffect(() => {
    const listener = (e: any) => {
      if (e.key === "j") {
        if (!fasit_is_temporarily_disabled) onAccept();
      }
      if (e.key === "f") {
        onReject();
      }
      if (e.key === "z") {
        onUndo();
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [fasit_is_temporarily_disabled, onAccept, onReject, onUndo]);

  const candidate_words = [
    `${word?.word}`,
    `${word?.word}en`,
    `${word?.word}ene`,
    `${word?.word}enes`,
    `${word?.word}ens`,
    `${word?.word}er`,
    `${word?.word}ers`,
    `${word?.word}s`,
  ];

  const is_bøyning = candidate_words.every((c) =>
    words
      .slice(0, candidate_words.length)
      .map((w) => w.word)
      .includes(c)
  );

  const restart = async (m?: string, f?: string) => {
    if (!supabase) supabase = createClient(supabaseUrl, supabaseKey);

    const filterNumber = parseInt(f ?? filter, 10);
    let { data: words_no } = await supabase
      .from("words_no")
      .select("*")
      .eq("checked", m ?? mode)
      .order("id")
      .ilike(
        "word",
        (f ?? filter) && !isNaN(filterNumber)
          ? "_".repeat(filterNumber)
          : f ?? filter
          ? `${f ?? filter}%`
          : "%"
      );

    if (words_no?.length === 0) {
      setWords([]);
    } else {
      setWords(words_no as any);
      angre.current = angre.current.filter(
        (w) => !words_no.map((x: any) => x.id).includes(w.id)
      );
    }
  };

  useEffect(() => {
    if (supabaseKey) restart();
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <div
          style={{
            position: "fixed",
            top: 0,
          }}
        >
          <input
            value={supabaseKey}
            onChange={(e) => setSupabaseKey(e.target.value)}
          />
          <button onClick={() => restart()}>start!</button>
        </div>
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
          }}
        >
          <div>
            filter:
            <input
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                restart(mode, e.target.value);
              }}
            />
          </div>
          <div>
            modus:
            <select
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                restart(e.target.value);
              }}
            >
              <option value="unchecked">uklassifiserte ord</option>
              <option value="unsuitable">forkastede ord</option>
              <option value="confirmed">godkjente fasitord</option>
              <option value="discarded">ikke-ord</option>
              <option value="maybe">kanskje?</option>
            </select>
          </div>
        </div>
        {words
          .slice(1, 10)
          .reverse()
          .map((w, i) => (
            <div
              style={{
                fontWeight: "lighter",
                opacity: 1 / (10 - i) - 0.01,
              }}
              key={w.word + w.id + i}
            >
              {w.word}
            </div>
          ))}
        {word && <div>{word.word}</div>}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            maxWidth: "100vw",
            width: 500,
            marginTop: 50,
          }}
        >
          <button
            style={{
              padding: 10,
              minWidth: 80,
              backgroundColor: "orangered",
              color: "black",
              userSelect: "none",
            }}
            onClick={onReject}
          >
            ikke fasitverdig (F)
          </button>
          <button
            style={{
              padding: 10,
              minWidth: 80,
              backgroundColor: "green",
              color: "white",
              userSelect: "none",
            }}
            disabled={fasit_is_temporarily_disabled}
            onClick={onAccept}
          >
            Legg til fasit! (J)
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          {is_bøyning && (
            <>
              {candidate_words.map((w, i) => (
                <div
                  key={w + i}
                  style={{
                    color: i === 0 ? "green" : "orangered",
                  }}
                >
                  {w}
                </div>
              ))}
              <button
                style={{
                  backgroundColor: "orangered",
                  color: "black",
                  marginRight: 20,
                }}
                onClick={async () => {
                  let ids = [word.id];
                  await supabase
                    .from("words_no")
                    .update({ checked: "unsuitable" })
                    .eq("id", word.id);
                  for (const w of words.slice(1, candidate_words.length)) {
                    await supabase
                      .from("words_no")
                      .update({ checked: "unsuitable" })
                      .eq("id", w.id);
                    ids.push(w.id);
                  }
                  setWords(words.filter((w) => !ids.includes(w.id)));
                }}
              >
                nei til alle
              </button>
              <button
                style={{
                  backgroundColor: "green",
                  color: "white",
                }}
                onClick={async () => {
                  let ids = [word.id];
                  await supabase
                    .from("words_no")
                    .update({ checked: "confirmed" })
                    .eq("id", word.id);
                  for (const w of words.slice(1, candidate_words.length)) {
                    await supabase
                      .from("words_no")
                      .update({ checked: "unsuitable" })
                      .eq("id", w.id);
                    ids.push(w.id);
                  }
                  setWords(words.filter((w) => !ids.includes(w.id)));
                }}
              >
                klassifiser automatisk!
              </button>
            </>
          )}
        </div>
        <div
          style={{
            position: "fixed",
            left: 0,
            bottom: 50,
            display: "flex",
          }}
        >
          <button
            style={{
              padding: 10,
              minWidth: 80,
            }}
            onClick={onUndo}
          >
            Angre (Z)
          </button>
          {angre.current
            .slice(-2)
            .reverse()
            .map((w, i) => (
              <div
                style={{
                  opacity: 1 / (i + 1) - 0.3,
                  fontSize: 15,
                  marginLeft: 10,
                }}
                key={w.id}
              >
                {w.word}
              </div>
            ))}
        </div>
        <div
          style={{
            position: "fixed",
            right: 0,
            bottom: 0,
            display: "flex",
          }}
        >
          <button
            style={{ padding: 10, minWidth: 80 }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              angre.current?.push(word);
              await supabase
                .from("words_no")
                .update({ checked: "discarded" })
                .eq("id", word.id);
            }}
          >
            ikke-ord
          </button>
          <button
            style={{ padding: 10, minWidth: 80, marginRight: 10 }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              angre.current?.push(word);
              await supabase
                .from("words_no")
                .update({ checked: "maybe" })
                .eq("id", word.id);
            }}
          >
            kanskje?
          </button>
          <button
            style={{
              padding: 10,
              minWidth: 80,
            }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              angre.current?.push(word);
              await supabase
                .from("words_no")
                .update({ checked: "egennavn" })
                .eq("id", word.id);
            }}
          >
            Egennavn
          </button>
          <button
            style={{
              padding: 10,
              minWidth: 80,
            }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              angre.current?.push(word);
              await supabase
                .from("words_no")
                .update({ checked: "abbreviation" })
                .eq("id", word.id);
            }}
          >
            Forkortelse
          </button>
        </div>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            display: "flex",
          }}
        >
          <button
            style={{
              padding: 10,
              minWidth: 80,
            }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              angre.current?.push(word);
            }}
          >
            Skip
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
