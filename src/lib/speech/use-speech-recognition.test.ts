import { act, renderHook } from '@testing-library/react';
import { useSpeechRecognition } from './use-speech-recognition';
import { startListening, isSpeechAvailable } from './speech-recognition';
import type { SpeechCallbacks } from './speech-recognition';

jest.mock('./speech-recognition');

const mockStartListening = startListening as jest.MockedFunction<
  typeof startListening
>;
const mockIsSpeechAvailable = isSpeechAvailable as jest.MockedFunction<
  typeof isSpeechAvailable
>;

let callbacks: SpeechCallbacks | undefined;

beforeEach(() => {
  callbacks = undefined;
  mockIsSpeechAvailable.mockReturnValue(true);
  mockStartListening.mockImplementation((cb) => {
    callbacks = cb;
    return () => {};
  });
});

describe('useSpeechRecognition transcript lifecycle', () => {
  it('clears the transcript after a final utterance is delivered', async () => {
    const onFinal = jest.fn();
    const { result } = renderHook(() => useSpeechRecognition(onFinal));
    await act(() => result.current.start());

    act(() => callbacks!.onPartial!('open medi'));
    expect(result.current.transcript).toBe('open medi');

    act(() => callbacks!.onFinal!('open medications'));
    expect(onFinal).toHaveBeenCalledWith('open medications');
    // Cleared so the voice bar can show command feedback between utterances.
    expect(result.current.transcript).toBe('');
  });
});

describe('useSpeechRecognition model progress', () => {
  it('exposes model-load progress while the model downloads', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await act(() => result.current.start());
    expect(result.current.modelProgress).toBeNull();

    act(() => callbacks!.onProgress!(42));
    expect(result.current.modelProgress).toBe(42);
  });

  it('clears progress once transcription output arrives', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await act(() => result.current.start());
    act(() => callbacks!.onProgress!(90));
    act(() => callbacks!.onPartial!('open'));
    expect(result.current.modelProgress).toBeNull();
  });

  it('clears progress when the session ends', async () => {
    const { result } = renderHook(() => useSpeechRecognition());
    await act(() => result.current.start());
    act(() => callbacks!.onProgress!(30));
    act(() => callbacks!.onEnd!());
    expect(result.current.modelProgress).toBeNull();
  });
});
