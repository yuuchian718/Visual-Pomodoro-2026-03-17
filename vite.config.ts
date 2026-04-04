import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const productionEnv = loadEnv('production', '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png'],
        filename: 'sw.js',
        manifestFilename: 'manifest.json',
        manifest: {
          name: 'Visual Pomodoro',
          short_name: 'Pomodoro',
          description: 'A minimalist 3D Pomodoro timer for deep focus.',
          theme_color: '#000000',
          background_color: '#000000',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_KOTO_PUBLIC_KEY_B64': JSON.stringify(
        env.VITE_KOTO_PUBLIC_KEY_B64 ||
          productionEnv.VITE_KOTO_PUBLIC_KEY_B64 ||
          process.env.VITE_KOTO_PUBLIC_KEY_B64 ||
          '',
      ),
      'import.meta.env.VITE_KOTO_TRIAL_PUBLIC_KEY_B64': JSON.stringify(
        env.VITE_KOTO_TRIAL_PUBLIC_KEY_B64 ||
          productionEnv.VITE_KOTO_TRIAL_PUBLIC_KEY_B64 ||
          process.env.VITE_KOTO_TRIAL_PUBLIC_KEY_B64 ||
          '',
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
