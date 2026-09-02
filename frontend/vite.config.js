import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// dev 전용 CSP 완화 플러그인
// 왜 dev 만 완화하는지: @vitejs/plugin-react 의 React Refresh 는 index.html 에
// 인라인 preamble(<script>)을 주입하므로 dev 에서는 script-src 'unsafe-inline' 이 필요하다.
// prod 빌드본에는 인라인 스크립트가 없으므로 index.html 원본의 엄격한 CSP 를 유지한다.
function devCspPlugin() {
  const DEV_CSP =
    "default-src 'self'; script-src 'self' 'unsafe-inline' http://localhost:5173; " +
    "style-src 'self' 'unsafe-inline'; " +
    "connect-src 'self' http://localhost:3000 http://localhost:5173 ws://localhost:5173";
  return {
    name: 'dev-csp',
    apply: 'serve',
    transformIndexHtml(html) {
      // prod CSP 의 content 값을 dev 값으로 치환
      return html.replace(
        /(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")/,
        `$1${DEV_CSP}$2`
      );
    },
  };
}

export default defineConfig({
  root: 'src',
  base: './',
  plugins: [react(), devCspPlugin()],
  server: { port: 5173, strictPort: true },
  build: { outDir: '../dist', emptyOutDir: true },
});
