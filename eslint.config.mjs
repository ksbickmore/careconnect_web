import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // public/models holds downloaded Whisper models + the vendored ONNX
  // runtime bundle — third-party build output, not our code.
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'docs/', 'public/models/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat.recommended,
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['*.config.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    // AudioWorklet global scope: AudioWorkletProcessor/registerProcessor
    // exist only inside the audio rendering thread.
    files: ['src/lib/speech/whisper/pcm-worklet.js'],
    languageOptions: {
      globals: {
        AudioWorkletProcessor: 'readonly',
        registerProcessor: 'readonly',
        sampleRate: 'readonly',
      },
    },
  },
);
