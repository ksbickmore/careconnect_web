import { create } from 'zustand';
import { matchCommand, type VoiceScope } from './match-command';

/**
 * App-wide registry of voice command scopes. Screens and dialogs register
 * their commands (via useVoiceCommands); the global VoiceInputBar dispatches
 * each final transcript through the registry.
 */
interface VoiceRegistryStore {
  readonly scopes: readonly VoiceScope[];
  register(scope: VoiceScope): void;
  unregister(id: string): void;
}

export const useVoiceRegistryStore = create<VoiceRegistryStore>()((set) => ({
  scopes: [],
  register: (scope) =>
    set((s) => ({ scopes: [...s.scopes.filter((x) => x.id !== scope.id), scope] })),
  unregister: (id) =>
    set((s) => ({ scopes: s.scopes.filter((x) => x.id !== id) })),
}));

export interface DispatchResult {
  handled: boolean;
  feedback?: string;
}

export function dispatchVoiceCommand(transcript: string): DispatchResult {
  const match = matchCommand(useVoiceRegistryStore.getState().scopes, transcript);
  if (!match) return { handled: false };
  const feedback = match.command.run(match.value);
  return { handled: true, feedback: feedback ?? undefined };
}

/** Hints for "what can I say", in registration order. */
export function registeredHints(): string[] {
  return useVoiceRegistryStore
    .getState()
    .scopes.flatMap((s) => s.commands.map((c) => c.hint ?? c.phrases[0]));
}
