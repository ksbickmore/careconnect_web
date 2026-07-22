// Globals missing from jest-environment-jsdom that the app or its
// dependencies rely on. Loaded via Jest `setupFiles` (before the framework).
import { TextDecoder, TextEncoder } from 'node:util';

globalThis.TextEncoder ??= TextEncoder as typeof globalThis.TextEncoder;
globalThis.TextDecoder ??= TextDecoder as typeof globalThis.TextDecoder;

// jsdom does not implement structuredClone; a JSON round-trip is safe for the
// plain-data models used by the repositories.
globalThis.structuredClone ??= (value) => JSON.parse(JSON.stringify(value));
