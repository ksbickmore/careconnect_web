/**
 * Jest stand-in for Vite `?worker` imports (mapped via moduleNameMapper).
 * jsdom has no Worker; suites that exercise transcription mock the module
 * that consumes this constructor instead.
 */
export default class WorkerStub {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage(): void {}
  terminate(): void {}
}
