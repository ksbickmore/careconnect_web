import {
  clockLabel,
  displayName,
  minuteStamp,
  slugify,
  todayLabel,
  whenLabel,
} from './format';

// 2026-06-10 14:30 local time.
const stamp = new Date(2026, 5, 10, 14, 30).getTime();

describe('format helpers', () => {
  it('clockLabel renders a 12-hour label with AM/PM and 12-o-clock edge cases', () => {
    expect(clockLabel(stamp)).toBe('2:30 PM');
    expect(clockLabel(new Date(2026, 5, 10, 0, 5).getTime())).toBe('12:05 AM');
    expect(clockLabel(new Date(2026, 5, 10, 12, 0).getTime())).toBe('12:00 PM');
  });

  it('whenLabel prefixes the weekday', () => {
    expect(whenLabel(stamp)).toBe('Wed · 2:30 PM');
  });

  it('todayLabel renders a 24-hour Today stamp', () => {
    expect(todayLabel(stamp)).toBe('Today 14:30');
  });

  it('minuteStamp renders a sortable minute-resolution id fragment', () => {
    expect(minuteStamp(stamp)).toBe('202606101430');
  });

  it('displayName capitalizes an email prefix and falls back for empty input', () => {
    expect(displayName('demo')).toBe('Demo');
    expect(displayName('')).toBe('User');
  });

  it('slugify produces stable kebab-case ids', () => {
    expect(slugify('Lisinopril 10 mg')).toBe('lisinopril-10-mg');
    expect(slugify('  Hello,  World!  ')).toBe('hello-world');
  });
});
