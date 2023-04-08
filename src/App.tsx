import React, { useEffect, useRef, useState } from "react";
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

  const [numberOfLetters, setNumberOfLetters] = useState("");
  const [mode, setMode] = useState("unchecked");

  const angre = useRef<Word>(null);
  const [angret, setAngret] = useState<Word | null>(null);

  const [words, setWords] = useState<Word[]>([]);
  const word = words[0];

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

  console.log(words.slice(0, candidate_words.length));

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
          <button
            onClick={async () => {
              supabase = createClient(supabaseUrl, supabaseKey);

              let { data: words_no } = await supabase
                .from("words_no")
                .select("*")
                .eq("checked", mode)
                .order("id")
                .ilike(
                  "word",
                  numberOfLetters
                    ? "_".repeat(parseInt(numberOfLetters, 10))
                    : "%"
                );

              if (words_no?.length === 0) {
                alert("no more data");
              } else {
                setWords(words_no as any);
              }
            }}
          >
            init
          </button>
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
            antall bokstaver:
            <input
              value={numberOfLetters}
              onChange={(e) => setNumberOfLetters(e.target.value)}
            />
          </div>
          <div>
            modus:
            <input value={mode} onChange={(e) => setMode(e.target.value)} />
          </div>
        </div>
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
            style={{ padding: 10, minWidth: 80 }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              (angre.current as any) = word;
              setAngret(null);
              await supabase
                .from("words_no")
                .update({ checked: "discarded" })
                .eq("id", word.id);
            }}
          >
            Nei
          </button>
          <button
            style={{ padding: 10, minWidth: 80 }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              (angre.current as any) = word;
              setAngret(null);
              await supabase
                .from("words_no")
                .update({ checked: "unsuitable" })
                .eq("id", word.id);
            }}
          >
            yes but NO
          </button>
          <button
            style={{ padding: 10, minWidth: 80 }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              (angre.current as any) = word;
              setAngret(null);
              await supabase
                .from("words_no")
                .update({ checked: "maybe" })
                .eq("id", word.id);
            }}
          >
            Kanskje?
          </button>
          <button
            style={{ padding: 10, minWidth: 80 }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              (angre.current as any) = word;
              setAngret(null);
              await supabase
                .from("words_no")
                .update({ checked: "confirmed" })
                .eq("id", word.id);
            }}
          >
            Ja!
          </button>
        </div>
        <div style={{ marginTop: 10 }}>
          {is_bøyning && candidate_words.map((w) => <div>{w}</div>)}
          <button
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
              setWords(words.filter((w) => ids.includes(w.id)));
            }}
          >
            LET's GO
          </button>
        </div>
        <div
          style={{
            position: "fixed",
            left: 0,
            bottom: 0,
            display: "flex",
          }}
        >
          <button
            style={{
              padding: 10,
              minWidth: 80,
            }}
            onClick={async () => {
              if (angre.current) {
                await supabase
                  .from("words_no")
                  .update({ checked: "unchecked" })
                  .eq("id", angre.current.id);
                setAngret(angre.current);
              }
            }}
          >
            Angre
          </button>
          {angret && <div>angret: {angret.word}</div>}
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
            style={{
              padding: 10,
              minWidth: 80,
            }}
            onClick={async () => {
              setWords(words.filter((w) => w.id !== word.id));
              (angre.current as any) = word;
              setAngret(null);
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
              (angre.current as any) = word;
              setAngret(null);
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
              (angre.current as any) = word;
              setAngret(null);
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
