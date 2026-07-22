import { speechService } from './speech';

describe('speechService placeholder', () => {
  it('reports voice as unsupported until a real engine ships', () => {
    expect(speechService.isSupported).toBe(false);
  });

  it('speak and cancel are safe no-ops', () => {
    expect(() => speechService.speak('Hello')).not.toThrow();
    expect(() => speechService.cancel()).not.toThrow();
  });
});
