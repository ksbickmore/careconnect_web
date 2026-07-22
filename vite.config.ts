import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const MODEL_MIME: Record<string, string> = {
  '.json': 'application/json',
  '.onnx': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.mjs': 'text/javascript',
  '.js': 'text/javascript',
};

/**
 * Dev-only static server for /models/. Vite serves public/ assets for plain
 * fetches, but onnxruntime-web *dynamically imports* its runtime module
 * (`/models/ort/ort-wasm-simd-threaded.jsep.mjs`); Vite's import analysis
 * appends `?import` and refuses to serve public-directory files as modules,
 * so model loading fails in dev without this. Production builds are
 * unaffected — dist/models/ is plain static hosting. (Same approach as the
 * desktop app's serve-models plugin.)
 */
function pluginServeModels(): Plugin {
  return {
    name: 'careconnect-serve-models',
    configureServer(server) {
      const root = fileURLToPath(new URL('./public/models', import.meta.url));
      server.middlewares.use('/models', (req, res, next) => {
        const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
        const filePath = normalize(join(root, urlPath));
        if (!filePath.startsWith(root + sep) || !existsSync(filePath)) {
          next();
          return;
        }
        res.setHeader(
          'Content-Type',
          MODEL_MIME[extname(filePath)] ?? 'application/octet-stream',
        );
        // Keep the response COEP-embeddable for the worker thread.
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Content-Length', statSync(filePath).size);
        createReadStream(filePath).pipe(res);
      });
    },
  };
}

/**
 * COOP/COEP make the origin cross-origin isolated, unlocking
 * SharedArrayBuffer so onnxruntime-web can run the Whisper model with
 * multiple threads. The app is fully self-hosted (fonts, icons, models all
 * same-origin), so `require-corp` blocks nothing; if a browser or proxy
 * strips the headers, ORT silently falls back to single-threaded inference.
 * vercel.json applies the same headers in production.
 */
const crossOriginIsolationHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [
    react(),
    pluginServeModels(),
    VitePWA({
      // Update flow: the SW waits until the user confirms via ReloadPrompt.
      registerType: 'prompt',
      // Keep the handwritten public/manifest.webmanifest (linked in index.html).
      manifest: false,
      includeAssets: ['icons/*', 'robots.txt'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        // The Whisper models (~40–85 MB each) must never be precached — every
        // visitor would pay the full download on install. They are cached at
        // runtime instead (below) after the first voice use.
        globIgnores: ['models/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // SPA offline fallback: deep links resolve to the cached shell.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/models\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Model + ORT runtime files: cache-first so the model downloads
            // once per device and voice keeps working offline afterwards.
            urlPattern: /\/models\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'whisper-models',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 60 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // transformers.js uses dynamic import() inside its worker code.
  worker: { format: 'es' },
  build: {
    // The AudioWorklet processor must stay a real file: audioWorklet
    // .addModule() cannot load data: URLs, which Vite would produce for
    // small assets by default.
    assetsInlineLimit: (filePath) =>
      filePath.endsWith('pcm-worklet.js') ? false : undefined,
  },
  server: {
    headers: crossOriginIsolationHeaders,
    watch: { ignored: ['**/public/models/**'] },
  },
  preview: {
    headers: crossOriginIsolationHeaders,
  },
});
