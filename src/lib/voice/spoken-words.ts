/**
 * Shared word-level parsing for voice transcripts: tokenization with
 * punctuation stripped, and spoken-number reading. Single home for the
 * word/number tables used by the command matcher (`match-command.ts`) and
 * the date/time parser (`spoken-datetime.ts`).
 */

/** Split into words with punctuation stripped, original casing kept. */
export const tokenize = (text: string): string[] =>
  text
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

export function normalize(text: string): string {
  return tokenize(text).join(' ').toLowerCase();
}

/** Lowercase tokens for word-level parsing (dates, times, numbers). */
export const lowerTokens = (text: string): string[] => tokenize(text.toLowerCase());

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
};

const ORDINAL_UNITS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7,
  eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12, thirteenth: 13,
  fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30,
};

/**
 * Read a number from the token stream starting at `i`. Handles digits
 * ("5", "21"), digit ordinals ("5th"), number words ("five", "twenty one"),
 * and ordinal words ("fifth", "twenty first"). Returns the value and how
 * many tokens were consumed, or null.
 */
export function readNumber(
  tokens: string[],
  i: number,
): { value: number; used: number } | null {
  const t = tokens[i];
  if (t === undefined) return null;
  const digits = /^(\d+)(?:st|nd|rd|th)?$/.exec(t);
  if (digits) return { value: Number(digits[1]), used: 1 };
  if (t in ORDINAL_UNITS) return { value: ORDINAL_UNITS[t], used: 1 };
  if (t in UNITS) return { value: UNITS[t], used: 1 };
  if (t in TENS) {
    const next = tokens[i + 1];
    if (next !== undefined && next in UNITS && UNITS[next] >= 1 && UNITS[next] <= 9) {
      return { value: TENS[t] + UNITS[next], used: 2 };
    }
    if (next !== undefined && next in ORDINAL_UNITS && ORDINAL_UNITS[next] <= 9) {
      return { value: TENS[t] + ORDINAL_UNITS[next], used: 2 };
    }
    return { value: TENS[t], used: 1 };
  }
  return null;
}

/** First number found among the words, so "7 hours" and "level five" work. */
export function parseSpokenNumber(text: string): number | null {
  const tokens = lowerTokens(text);
  for (let i = 0; i < tokens.length; i += 1) {
    const n = readNumber(tokens, i);
    if (n) return n.value;
  }
  return null;
}
