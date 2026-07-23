/**
 * Pure matching logic for the app-wide voice command registry. Phrases are
 * matched on whole words after punctuation/case normalization; a trailing
 * " *" makes a phrase a prefix that captures the remaining words (original
 * casing preserved) as the command's value.
 */

import { tokenize } from './spoken-words';

export interface VoiceCommand {
  /** Lowercase phrases; a trailing " *" captures the remainder as `value`. */
  readonly phrases: readonly string[];
  /** Usage hint for "what can I say", e.g. 'name <medication>'. */
  readonly hint?: string;
  /** Execute; optionally return a feedback message to announce. */
  run(value?: string): string | void;
}

export type VoiceScopeKind = 'global' | 'screen' | 'dialog';

export interface VoiceScope {
  readonly id: string;
  readonly kind: VoiceScopeKind;
  readonly commands: readonly VoiceCommand[];
}

export interface VoiceMatch {
  readonly command: VoiceCommand;
  readonly value?: string;
}

export const KIND_PRIORITY: Record<VoiceScopeKind, number> = {
  global: 0,
  screen: 1,
  dialog: 2,
};

interface PhraseMatch {
  words: number;
  value?: string;
}

/**
 * Tokenized transcript that remembers which raw whitespace-separated word
 * each token came from, so a wildcard tail can be rebuilt from the original
 * text ("I'll be there." stays intact instead of becoming "I ll be there").
 */
interface SpokenText {
  tokens: string[];
  /** For each token, the index of the raw word it came from. */
  source: number[];
  raw: string[];
}

function readSpokenText(transcript: string): SpokenText {
  const raw = transcript.split(/\s+/).filter(Boolean);
  const tokens: string[] = [];
  const source: number[] = [];
  raw.forEach((word, wordIndex) => {
    for (const token of tokenize(word)) {
      tokens.push(token);
      source.push(wordIndex);
    }
  });
  return { tokens, source, raw };
}

/** Wildcard tail from the raw words, minus trailing sentence punctuation. */
function tailValue(spoken: SpokenText, phraseWords: number): string {
  const start = spoken.source[phraseWords];
  // If the tail starts mid-raw-word (e.g. "name:Aspirin"), the raw word also
  // contains phrase text — fall back to the plain token join.
  const tail =
    phraseWords > 0 && start === spoken.source[phraseWords - 1]
      ? spoken.tokens.slice(phraseWords)
      : spoken.raw.slice(start);
  return tail.join(' ').replace(/[.,!?;:]+$/, '');
}

/** Match one phrase against the tokenized transcript; longest wins upstream. */
function matchPhrase(phrase: string, spoken: SpokenText): PhraseMatch | null {
  const { tokens } = spoken;
  const wildcard = phrase.endsWith(' *');
  const words = (wildcard ? phrase.slice(0, -2) : phrase).split(' ');
  if (wildcard) {
    if (tokens.length <= words.length) return null; // needs a tail
  } else if (tokens.length !== words.length) {
    return null;
  }
  for (let i = 0; i < words.length; i += 1) {
    if (tokens[i].toLowerCase() !== words[i]) return null;
  }
  return {
    words: words.length,
    value: wildcard ? tailValue(spoken, words.length) : undefined,
  };
}

export function matchCommand(
  scopes: readonly VoiceScope[],
  transcript: string,
): VoiceMatch | null {
  const spoken = readSpokenText(transcript);
  if (spoken.tokens.length === 0) return null;

  // Highest kind priority first; among equals, most recently registered.
  const ordered = scopes
    .map((s, i) => ({ s, i }))
    .sort((a, b) => KIND_PRIORITY[b.s.kind] - KIND_PRIORITY[a.s.kind] || b.i - a.i);

  for (const { s } of ordered) {
    let best: { m: PhraseMatch; c: VoiceCommand } | null = null;
    for (const c of s.commands) {
      for (const p of c.phrases) {
        const m = matchPhrase(p, spoken);
        if (m && (!best || m.words > best.m.words)) best = { m, c };
      }
    }
    if (best) return { command: best.c, value: best.m.value };
  }
  return null;
}
