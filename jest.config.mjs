/** @type {import('jest').Config} */
export default {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/test/polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  transform: {
    '^.+\\.[tj]sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.module\\.css$': 'identity-obj-proxy',
    '\\.css$': '<rootDir>/src/test/style-stub.ts',
    '^virtual:pwa-register/react$': '<rootDir>/src/test/pwa-register-stub.ts',
    '\\?worker$': '<rootDir>/src/test/worker-stub.ts',
    '\\?url$': '<rootDir>/src/test/asset-url-stub.ts',
  },
  transformIgnorePatterns: ['/node_modules/(?!(lucide-react|react-router|react-router-dom)/)'],
  coverageProvider: 'v8',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/models/**',
    '!src/test/**',
    // Runs only inside the Web Worker with the WASM ONNX runtime; exercised
    // by e2e and manual verification, not measurable under jsdom.
    '!src/lib/speech/whisper/whisper-worker.ts',
  ],
  coverageThreshold: {
    global: { lines: 75, branches: 75, functions: 75, statements: 75 },
  },
};
