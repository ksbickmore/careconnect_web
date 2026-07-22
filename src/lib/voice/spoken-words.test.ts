import { normalize, parseSpokenNumber } from './spoken-words';

describe('normalize', () => {
  it('lowercases, strips punctuation, collapses whitespace', () => {
    expect(normalize('  Confirm, Taken!  ')).toBe('confirm taken');
    expect(normalize('Set pain to 5.')).toBe('set pain to 5');
  });
});

describe('parseSpokenNumber', () => {
  it('parses digits and word numbers zero through twenty', () => {
    expect(parseSpokenNumber('5')).toBe(5);
    expect(parseSpokenNumber('five')).toBe(5);
    expect(parseSpokenNumber('twenty')).toBe(20);
    expect(parseSpokenNumber('zero')).toBe(0);
    expect(parseSpokenNumber('banana')).toBeNull();
  });

  it('finds the first number among surrounding words', () => {
    expect(parseSpokenNumber('7 hours')).toBe(7);
    expect(parseSpokenNumber('level five')).toBe(5);
    expect(parseSpokenNumber('5 out of 10')).toBe(5);
    expect(parseSpokenNumber('to 5 please')).toBe(5);
    expect(parseSpokenNumber('hours')).toBeNull();
  });

  it('combines tens and units', () => {
    expect(parseSpokenNumber('twenty one')).toBe(21);
  });
});
