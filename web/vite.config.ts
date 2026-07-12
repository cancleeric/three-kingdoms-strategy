import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// 統一平台子路徑掛載：三國誌戰鬥模擬器掛在閘道的 /sanguo/ 前綴下
export default defineConfig({
  base: '/sanguo/',
  plugins: [react()],
  server: {
    // dev-only：讓單獨 `npm run dev`（不經閘道）也能連上本機 server（PORT=3300）
    // 只代理 socket.io 專用路徑，不動 Vite 自己的 HMR websocket，避免搶路徑
    proxy: {
      '/sanguo/socket': {
        target: 'http://localhost:3300',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
});
