import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// O shell vai para o cache; dado, nunca. Registro e fila moram no IndexedDB,
// e a sincronizacao e sempre online — cachear resposta de API criaria um
// segundo caminho de leitura, com regra de autorizacao propria.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-v2.png', 'logo-transparent.png'],
      manifest: {
        name: 'Atlas Campo',
        short_name: 'Atlas Campo',
        description: 'A ponte do chao da Marina para o escritorio',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#010c20',
        theme_color: '#010c20',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Runtime do workbox dentro do proprio sw.js: um arquivo a menos para
        // buscar no registro, e um ponto a menos de falha no primeiro acesso.
        inlineWorkboxRuntime: true,
        // Shell: HTML, JS, CSS, fontes e imagens do proprio app.
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        // telas.html e ferramenta de conferencia do desenvolvimento. Nao e
        // app, nao tem rota, e nao ocupa espaco no celular do colaborador.
        globIgnores: ['telas.html'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Inter vem do Google Fonts. Sem ela em cache, o app abre em
            // Arial no modo aviao — deixa de ser identico ao Atlas.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fontes',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      // DESLIGADO no dia a dia, de proposito. Com o service worker ligado em
      // desenvolvimento, o shell vem do cache e a tela continua mostrando a
      // versao antiga depois de cada alteracao — custou uma rodada inteira de
      // "nada mudou" em 10/09/2026.
      //
      // O teste de offline que vale e o do build de producao (npm run build +
      // vite preview), nao o de desenvolvimento. Ligue de volta so quando for
      // mexer no proprio serviceworker.
      devOptions: { enabled: false, type: 'module' },
    }),
  ],
  server: { host: true, port: 6002 },
})
