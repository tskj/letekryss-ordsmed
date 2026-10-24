import type { Word } from "./api";

// endings of the inflected forms of nouns, verbs and adjectives. the word
// list has a word's inflections right after it, in id order
const ENDINGS = [
  "a", "as", "e", "en", "ene", "enes", "ens", "er", "ere", "ers", "es", "est", "este",
  "et", "ets", "r", "s", "t", "te", "de", "ende",
];

/**
 * the words right after `word` in the queue that are it with an inflection
 * ending, like KAKEN and KAKENE after KAKE
 */
export const inflections_after = (word: Word, rest: Word[]): Word[] => {
  const forms: Word[] = [];

  for (const next of rest) {
    const ending = next.word.startsWith(word.word) ? next.word.slice(word.word.length) : null;
    if (ending === null || !ENDINGS.includes(ending)) break;

    forms.push(next);
  }

  return forms;
};
