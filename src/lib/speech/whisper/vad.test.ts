import { computeRms, createVad } from './vad';

describe('computeRms', () => {
  it('is 0 for silence', () => {
    expect(computeRms(new Float32Array(160))).toBe(0);
  });

  it('equals the amplitude of a constant signal', () => {
    expect(computeRms(new Float32Array(160).fill(0.5))).toBeCloseTo(0.5);
  });

  it('is 0 for an empty frame', () => {
    expect(computeRms(new Float32Array(0))).toBe(0);
  });
});

describe('createVad', () => {
  // 10ms frames keep the arithmetic simple: 80 frames = 800ms.
  const FRAME_MS = 10;
  const LOUD = 0.2;
  const QUIET = 0.001;

  it('emits no events while only silence is heard', () => {
    const vad = createVad(FRAME_MS);
    for (let i = 0; i < 200; i++) {
      expect(vad(QUIET)).toBe('none');
    }
  });

  it('emits speech-start on the first frame above the threshold', () => {
    const vad = createVad(FRAME_MS);
    expect(vad(QUIET)).toBe('none');
    expect(vad(LOUD)).toBe('speech-start');
    expect(vad(LOUD)).toBe('none');
  });

  it('emits utterance-end after speech followed by enough silence', () => {
    const vad = createVad(FRAME_MS, { silenceMs: 800 });
    vad(LOUD); // speech-start
    const events: string[] = [];
    for (let i = 0; i < 80; i++) events.push(vad(QUIET));
    expect(events.slice(0, 79)).not.toContain('utterance-end');
    expect(events[79]).toBe('utterance-end');
  });

  it('a brief dip below the threshold does not end the utterance', () => {
    const vad = createVad(FRAME_MS, { silenceMs: 800 });
    vad(LOUD);
    for (let i = 0; i < 40; i++) expect(vad(QUIET)).toBe('none'); // 400ms dip
    expect(vad(LOUD)).toBe('none'); // speech resumes, silence timer resets
    for (let i = 0; i < 79; i++) expect(vad(QUIET)).toBe('none');
    expect(vad(QUIET)).toBe('utterance-end');
  });

  it('forces utterance-end at the max utterance duration during continuous speech', () => {
    const vad = createVad(FRAME_MS, { maxUtteranceMs: 1000 });
    vad(LOUD); // speech-start, 10ms elapsed
    const events: string[] = [];
    for (let i = 0; i < 99; i++) events.push(vad(LOUD));
    expect(events.slice(0, 98)).not.toContain('utterance-end');
    expect(events[98]).toBe('utterance-end');
  });

  it('resets after utterance-end so the next speech starts a new utterance', () => {
    const vad = createVad(FRAME_MS, { silenceMs: 800 });
    vad(LOUD);
    for (let i = 0; i < 80; i++) vad(QUIET); // ends utterance
    expect(vad(LOUD)).toBe('speech-start');
  });

  it('honors a custom speech threshold', () => {
    const vad = createVad(FRAME_MS, { speechThreshold: 0.5 });
    expect(vad(0.2)).toBe('none');
    expect(vad(0.6)).toBe('speech-start');
  });
});
