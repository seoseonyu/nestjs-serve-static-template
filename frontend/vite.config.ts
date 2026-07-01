import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // NestJS(ServeStaticModule)가 서빙하는 레포 루트의 client/ 로 빌드한다.
    // outDir 은 이 config 디렉터리 기준 상대 경로로 해석된다.
    outDir: '../client',
    emptyOutDir: true,
  },
  server: {
    // 개발 시 /api 호출을 NestJS(:3000)로 프록시 → HMR 유지하며 실제 API 사용.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
