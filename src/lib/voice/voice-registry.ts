import { create } from 'zustand';
import {
  KIND_PRIORITY,
  matchCommand,
  type VoiceScope,
  type VoiceScopeKind,
} from './match-command';

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

export interface HintGroup {
  kind: VoiceScopeKind;
  hints: string[];
}

/**
 * Hints for "what can I say", grouped by scope kind and most relevant
 * first: open-dialog commands, then the current page's, then global ones
 * (registration order within each kind; same-kind scopes merged). Pure so
 * components can pass a subscribed `scopes` snapshot and stay reactive.
 */
export function hintGroups(scopes: readonly VoiceScope[]): HintGroup[] {
  const ordered = [...scopes].sort(
    (a, b) => KIND_PRIORITY[b.kind] - KIND_PRIORITY[a.kind],
  );
  const groups: HintGroup[] = [];
  for (const s of ordered) {
    const hints = s.commands.map((c) => c.hint ?? c.phrases[0]);
    const existing = groups.find((g) => g.kind === s.kind);
    if (existing) existing.hints.push(...hints);
    else groups.push({ kind: s.kind, hints });
  }
  return groups;
}

export function registeredHintGroups(): HintGroup[] {
  return hintGroups(useVoiceRegistryStore.getState().scopes);
}

/** Flat hint list, same relevance order as `registeredHintGroups`. */
export function registeredHints(): string[] {
  return registeredHintGroups().flatMap((g) => g.hints);
}
