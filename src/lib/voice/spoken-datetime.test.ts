import {
  formatSpokenDate,
  formatSpokenTime,
  parseSpokenDate,
  parseSpokenTime,
} from './spoken-datetime';

// Thursday, July 2, 2026 — fixed reference point for relative dates.
const NOW = new Date(2026, 6, 2, 10, 0);

describe('parseSpokenDate', () => {
  it('parses relative words', () => {
    expect(parseSpokenDate('today', NOW)).toBe('2026-07-02');
    expect(parseSpokenDate('tomorrow', NOW)).toBe('2026-07-03');
  });

  it('parses weekday names as the upcoming occurrence', () => {
    expect(parseSpokenDate('monday', NOW)).toBe('2026-07-06');
    expect(parseSpokenDate('Friday', NOW)).toBe('2026-07-03');
    // Same weekday as today resolves to today.
    expect(parseSpokenDate('thursday', NOW)).toBe('2026-07-02');
    // "next" always moves at least one day forward.
    expect(parseSpokenDate('next thursday', NOW)).toBe('2026-07-09');
    expect(parseSpokenDate('next monday', NOW)).toBe('2026-07-06');
  });

  it('parses month-name dates with digit, ordinal, and word days', () => {
    expect(parseSpokenDate('july 5', NOW)).toBe('2026-07-05');
    expect(parseSpokenDate('July 5th', NOW)).toBe('2026-07-05');
    expect(parseSpokenDate('july fifth', NOW)).toBe('2026-07-05');
    expect(parseSpokenDate('august twenty first', NOW)).toBe('2026-08-21');
    expect(parseSpokenDate('december thirty first', NOW)).toBe('2026-12-31');
  });

  it('parses "the fifth of july" word order', () => {
    expect(parseSpokenDate('the fifth of july', NOW)).toBe('2026-07-05');
    expect(parseSpokenDate('5th of July', NOW)).toBe('2026-07-05');
  });

  it('honors an explicit year and rolls past dates to next year', () => {
    expect(parseSpokenDate('july 5 2027', NOW)).toBe('2027-07-05');
    // January 5 already passed in 2026, so assume the next occurrence.
    expect(parseSpokenDate('january 5', NOW)).toBe('2027-01-05');
  });

  it('rejects unparseable or invalid input', () => {
    expect(parseSpokenDate('banana', NOW)).toBeNull();
    expect(parseSpokenDate('', NOW)).toBeNull();
    expect(parseSpokenDate('july', NOW)).toBeNull();
    expect(parseSpokenDate('february 30', NOW)).toBeNull();
  });
});

describe('formatSpokenDate / formatSpokenTime', () => {
  it('speaks back a parsed date and time naturally', () => {
    // The year is spoken only when it differs from the current year.
    expect(formatSpokenDate('2026-07-05', NOW)).toBe('Sunday, July 5');
    expect(formatSpokenDate('2027-12-31', NOW)).toBe('Friday, December 31, 2027');
    expect(formatSpokenTime('14:30')).toBe('2:30 PM');
    expect(formatSpokenTime('00:00')).toBe('12:00 AM');
    expect(formatSpokenTime('09:05')).toBe('9:05 AM');
  });
});

describe('parseSpokenTime', () => {
  it('parses digit hours with am/pm', () => {
    expect(parseSpokenTime('9 am')).toBe('09:00');
    expect(parseSpokenTime('3 PM')).toBe('15:00');
    expect(parseSpokenTime('12 pm')).toBe('12:00');
    expect(parseSpokenTime('12 am')).toBe('00:00');
  });

  it('parses "9:30 AM" after punctuation stripping ("9 30 AM")', () => {
    expect(parseSpokenTime('9 30 am')).toBe('09:30');
    expect(parseSpokenTime('2 15 pm')).toBe('14:15');
  });

  it('parses spelled-out a.m. / p.m. ("a m" / "p m")', () => {
    expect(parseSpokenTime('9 a m')).toBe('09:00');
    expect(parseSpokenTime('9 30 p m')).toBe('21:30');
  });

  it('parses word-number times', () => {
    expect(parseSpokenTime('nine thirty am')).toBe('09:30');
    expect(parseSpokenTime('three pm')).toBe('15:00');
    expect(parseSpokenTime('nine oh five am')).toBe('09:05');
    expect(parseSpokenTime('ten forty five pm')).toBe('22:45');
  });

  it('parses noon, midnight, and o\'clock', () => {
    expect(parseSpokenTime('noon')).toBe('12:00');
    expect(parseSpokenTime('midnight')).toBe('00:00');
    expect(parseSpokenTime('9 o clock')).toBe('09:00');
    expect(parseSpokenTime('nine o clock am')).toBe('09:00');
  });

  it('parses 24-hour input without am/pm', () => {
    expect(parseSpokenTime('15 30')).toBe('15:30');
    expect(parseSpokenTime('9')).toBe('09:00');
  });

  it('parses squashed Whisper transcripts like "1pm" and "130 pm"', () => {
    expect(parseSpokenTime('1pm')).toBe('13:00');
    expect(parseSpokenTime('12pm')).toBe('12:00');
    expect(parseSpokenTime('130 pm')).toBe('13:30');
    expect(parseSpokenTime('130pm')).toBe('13:30');
    expect(parseSpokenTime('1030 am')).toBe('10:30');
    expect(parseSpokenTime('1230 pm')).toBe('12:30');
    expect(parseSpokenTime('930')).toBe('09:30');
    expect(parseSpokenTime('1530')).toBe('15:30');
  });

  it('parses "in the morning / afternoon / evening / at night" phrasing', () => {
    expect(parseSpokenTime('1 in the afternoon')).toBe('13:00');
    expect(parseSpokenTime('8 in the morning')).toBe('08:00');
    expect(parseSpokenTime('8 30 in the evening')).toBe('20:30');
    expect(parseSpokenTime('9 at night')).toBe('21:00');
    expect(parseSpokenTime('one thirty in the afternoon')).toBe('13:30');
    // "12 in the morning" behaves like 12 AM.
    expect(parseSpokenTime('12 in the morning')).toBe('00:00');
    expect(parseSpokenTime('at noon')).toBe('12:00');
  });

  it('parses 24-hour "hundred hours" times', () => {
    expect(parseSpokenTime('13 hundred')).toBe('13:00');
    expect(parseSpokenTime('thirteen hundred hours')).toBe('13:00');
    expect(parseSpokenTime('zero hundred hours')).toBe('00:00');
    expect(parseSpokenTime('oh eight hundred')).toBe('08:00');
    expect(parseSpokenTime('twenty three hundred')).toBe('23:00');
    expect(parseSpokenTime('1600 hours')).toBe('16:00');
    // 2400 is midnight.
    expect(parseSpokenTime('2400')).toBe('00:00');
    expect(parseSpokenTime('24 hundred hours')).toBe('00:00');
  });

  it('rejects unparseable or out-of-range input', () => {
    expect(parseSpokenTime('banana')).toBeNull();
    expect(parseSpokenTime('')).toBeNull();
    expect(parseSpokenTime('25 00')).toBeNull();
    expect(parseSpokenTime('9 75 am')).toBeNull();
    // Squashed digits with an impossible minute part.
    expect(parseSpokenTime('190 pm')).toBeNull();
    expect(parseSpokenTime('1390')).toBeNull();
    // 24 is only valid as exactly 24:00 / "24 hundred".
    expect(parseSpokenTime('2430')).toBeNull();
    expect(parseSpokenTime('25 hundred')).toBeNull();
  });
});
