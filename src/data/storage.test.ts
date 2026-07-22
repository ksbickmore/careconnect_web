import { loadJSON, removeJSON, saveJSON } from './storage';

describe('storage helpers', () => {
  it('round-trips a value through localStorage with the namespaced key', () => {
    saveJSON('sample', { a: 1 });
    expect(localStorage.getItem('careconnect:web:v1:sample')).toBe('{"a":1}');
    expect(loadJSON('sample', null)).toEqual({ a: 1 });
  });

  it('falls back when the key is missing', () => {
    expect(loadJSON('missing', 'fallback')).toBe('fallback');
  });

  it('falls back when the stored value is corrupt JSON', () => {
    localStorage.setItem('careconnect:web:v1:bad', '{not json');
    expect(loadJSON('bad', 42)).toBe(42);
  });

  it('falls back when localStorage.getItem throws', () => {
    const spy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(loadJSON('any', 'safe')).toBe('safe');
    spy.mockRestore();
  });

  it('silently no-ops when localStorage.setItem throws (quota)', () => {
    const spy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => saveJSON('any', 'value')).not.toThrow();
    spy.mockRestore();
  });

  it('removes a stored value so the next load reseeds', () => {
    saveJSON('gone', 1);
    removeJSON('gone');
    expect(loadJSON('gone', 'seed')).toBe('seed');
  });
});
