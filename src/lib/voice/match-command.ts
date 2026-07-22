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

const KIND_PRIORITY: Record<VoiceScopeKind, number> = {
  global: 0,
  screen: 1,
  dialog: 2,
};

interface PhraseMatch {
  words: number;
  value?: string;
}

/** Match one phrase against the tokenized transcript; longest wins upstream. */
function matchPhrase(phrase: string, tokens: string[]): PhraseMatch | null {
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
    value: wildcard ? tokens.slice(words.length).join(' ') : undefined,
  };
}

export function matchCommand(
  scopes: readonly VoiceScope[],
  transcript: string,
): VoiceMatch | null {
  const tokens = tokenize(transcript);
  if (tokens.length === 0) return null;

  // Highest kind priority first; among equals, most recently registered.
  const ordered = scopes
    .map((s, i) => ({ s, i }))
    .sort((a, b) => KIND_PRIORITY[b.s.kind] - KIND_PRIORITY[a.s.kind] || b.i - a.i);

  for (const { s } of ordered) {
    let best: { m: PhraseMatch; c: VoiceCommand } | null = null;
    for (const c of s.commands) {
      for (const p of c.phrases) {
        const m = matchPhrase(p, tokens);
        if (m && (!best || m.words > best.m.words)) best = { m, c };
      }
    }
    if (best) return { command: best.c, value: best.m.value };
  }
  return null;
}
