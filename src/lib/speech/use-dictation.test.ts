/**
 * useDictation appends final utterances into caller-owned string state and
 * exposes a single toggle. Speech capture itself is mocked — that engine has
 * its own tests.
 */
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useDictation } from './use-dictation';
import { useSpeechRecognition } from './use-speech-recognition';

jest.mock('./use-speech-recognition');

const mockUseSpeechRecognition = jest.mocked(useSpeechRecognition);

let onFinal: ((transcript: string) => void) | undefined;
const start = jest.fn(() => Promise.resolve());
const stop = jest.fn();

function mockSpeech(state: { listening?: boolean; available?: boolean }) {
  mockUseSpeechRecognition.mockImplementation((handler) => {
    onFinal = handler;
    return {
      listening: state.listening ?? false,
      transcript: '',
      error: null,
      modelProgress: null,
      available: state.available ?? true,
      start,
      stop,
    };
  });
}

const setup = () =>
  renderHook(() => {
    const [text, setText] = useState('');
    return { text, dictation: useDictation(setText) };
  });

beforeEach(() => {
  onFinal = undefined;
  start.mockClear();
  stop.mockClear();
  mockSpeech({});
});

describe('useDictation', () => {
  it('appends final utterances to the text, space-separated', () => {
    const { result } = setup();
    act(() => onFinal!('Wrist pain'));
    expect(result.current.text).toBe('Wrist pain');
    act(() => onFinal!('after typing.'));
    expect(result.current.text).toBe('Wrist pain after typing.');
  });

  it('toggle starts when idle and stops when listening', () => {
    const { result } = setup();
    act(() => result.current.dictation.toggle());
    expect(start).toHaveBeenCalledTimes(1);

    mockSpeech({ listening: true });
    const listening = setup();
    act(() => listening.result.current.dictation.toggle());
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('toggle is a no-op when speech is unavailable', () => {
    mockSpeech({ available: false });
    const { result } = setup();
    expect(result.current.dictation.available).toBe(false);
    act(() => result.current.dictation.toggle());
    expect(start).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
  });
});
