import { renderHook } from '@testing-library/react';
import {
  dispatchVoiceCommand,
  registeredHints,
  useVoiceRegistryStore,
} from './voice-registry';
import { useVoiceCommands } from './use-voice-commands';

afterEach(() => {
  useVoiceRegistryStore.setState({ scopes: [] });
});

describe('voice registry dispatch', () => {
  it('runs the matched command and returns its feedback', () => {
    useVoiceRegistryStore.getState().register({
      id: 's1',
      kind: 'screen',
      commands: [{ phrases: ['snooze'], run: () => 'Snoozed.' }],
    });
    expect(dispatchVoiceCommand('snooze')).toEqual({
      handled: true,
      feedback: 'Snoozed.',
    });
  });

  it('reports unhandled transcripts', () => {
    expect(dispatchVoiceCommand('gibberish').handled).toBe(false);
  });

  it('unregister removes a scope', () => {
    const store = useVoiceRegistryStore.getState();
    store.register({
      id: 's1',
      kind: 'screen',
      commands: [{ phrases: ['snooze'], run: jest.fn() }],
    });
    useVoiceRegistryStore.getState().unregister('s1');
    expect(dispatchVoiceCommand('snooze').handled).toBe(false);
  });

  it('collects hints from registered commands', () => {
    useVoiceRegistryStore.getState().register({
      id: 's1',
      kind: 'screen',
      commands: [
        { phrases: ['snooze'], hint: 'snooze', run: jest.fn() },
        { phrases: ['name *'], run: jest.fn() }, // no hint -> first phrase
      ],
    });
    expect(registeredHints()).toEqual(['snooze', 'name *']);
  });
});

describe('useVoiceCommands', () => {
  it('registers on mount, unregisters on unmount, keeps handlers fresh', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender, unmount } = renderHook(
      ({ run }: { run: () => void }) =>
        useVoiceCommands('screen', [{ phrases: ['go'], run }]),
      { initialProps: { run: first } },
    );

    dispatchVoiceCommand('go');
    expect(first).toHaveBeenCalledTimes(1);

    rerender({ run: second });
    dispatchVoiceCommand('go');
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);

    unmount();
    expect(dispatchVoiceCommand('go').handled).toBe(false);
  });

  it('re-registers when the phrase set changes', () => {
    const run = jest.fn();
    const { rerender } = renderHook(
      ({ phrases }: { phrases: string[] }) =>
        useVoiceCommands('screen', [{ phrases, run }]),
      { initialProps: { phrases: ['confirm taken'] } },
    );
    expect(dispatchVoiceCommand('confirm taken').handled).toBe(true);

    rerender({ phrases: ['confirm', 'yes'] });
    expect(dispatchVoiceCommand('confirm taken').handled).toBe(false);
    expect(dispatchVoiceCommand('yes').handled).toBe(true);
  });

  it('registers nothing for an empty command list', () => {
    renderHook(() => useVoiceCommands('screen', []));
    expect(useVoiceRegistryStore.getState().scopes).toHaveLength(0);
  });
});
