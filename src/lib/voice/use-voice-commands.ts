import { useEffect, useId, useRef } from 'react';
import type { VoiceCommand, VoiceScopeKind } from './match-command';
import { useVoiceRegistryStore } from './voice-registry';

/**
 * Register a voice command scope for the lifetime of the component. Handlers
 * stay fresh across re-renders without churning the registry; the scope only
 * re-registers when the phrase set itself changes (e.g. an armed two-tap
 * button swapping "confirm taken" for "confirm"/"yes").
 */
export function useVoiceCommands(
  kind: VoiceScopeKind,
  commands: readonly VoiceCommand[],
): void {
  const id = useId();
  // Assigned in an effect (not during render) so aborted renders can't leak
  // into the ref. Declared before the register effect below so the ref is
  // fresh by the time registration (re)runs in the same commit.
  const ref = useRef(commands);
  useEffect(() => {
    ref.current = commands;
  });

  const phrasesKey = JSON.stringify(commands.map((c) => c.phrases));

  useEffect(() => {
    if (ref.current.length === 0) return;
    const { register, unregister } = useVoiceRegistryStore.getState();
    register({
      id,
      kind,
      commands: ref.current.map((c, i) => ({
        phrases: c.phrases,
        hint: c.hint,
        // Delegate through the ref so the latest closure runs.
        run: (value?: string) => ref.current[i]?.run(value),
      })),
    });
    return () => unregister(id);
  }, [id, kind, phrasesKey]);
}
