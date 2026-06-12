import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          }
        }
      },
      plugins: [react(), tailwindcss()],
      // SECURITY NOTE — read carefully before "fixing" the key handling:
      //
      // The Gemini API key is currently a CLIENT-SIDE secret. Both the old
      // `define` block AND `import.meta.env.VITE_GEMINI_API_KEY` cause Vite to
      // inline the key as a plain string literal into the production bundle
      // (verified: `grep AQ.Ab8 dist/assets/*.js` finds it). ANY browser-side
      // Vite app that reads the key will leak it — there is no client-only fix.
      //
      // The ONLY real fix is a SERVER-SIDE PROXY: the browser calls our Express
      // backend (`npm run server`), which holds GEMINI_API_KEY (un-prefixed, so
      // Vite never sees it) and forwards requests to Gemini. Until that proxy
      // exists, treat the deployed key as public and scope/rotate it
      // accordingly. The `define` block was removed because it was a second,
      // redundant inlining path using non-standard `process.env.*` globals.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext',
        rollupOptions: {
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              ui: ['lucide-react', 'tailwindcss-animate'],
              ai: ['@google/genai'],
              charts: ['recharts'],
              anim: ['lottie-web'],
            }
          }
        }
      },
      test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
      }
    };
});
