import { speechService } from './speech';

describe('speechService', () => {
  afterEach(() => {
    delete (window as { speechSynthesis?: unknown }).speechSynthesis;
  });

  describe('without speechSynthesis (plain jsdom)', () => {
    it('reports voice output as unsupported', () => {
      expect(speechService.isSupported).toBe(false);
    });

    it('speak and cancel are safe no-ops', () => {
      expect(() => speechService.speak('Hello')).not.toThrow();
      expect(() => speechService.cancel()).not.toThrow();
    });
  });

  describe('with speechSynthesis available', () => {
    const speak = jest.fn();
    const cancel = jest.fn();

    beforeEach(() => {
      speak.mockClear();
      cancel.mockClear();
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: { speak, cancel },
      });
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: class {
          constructor(public text: string) {}
        },
      });
    });

    it('reports voice output as supported', () => {
      expect(speechService.isSupported).toBe(true);
    });

    it('cancels in-progress speech before speaking the new text', () => {
      speechService.speak('Read this aloud');
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(speak).toHaveBeenCalledTimes(1);
      expect((speak.mock.calls[0][0] as { text: string }).text).toBe(
        'Read this aloud',
      );
    });

    it('ignores empty or whitespace-only text', () => {
      speechService.speak('   ');
      expect(speak).not.toHaveBeenCalled();
      expect(cancel).not.toHaveBeenCalled();
    });

    it('cancel forwards to the synthesizer', () => {
      speechService.cancel();
      expect(cancel).toHaveBeenCalledTimes(1);
    });
  });
});
