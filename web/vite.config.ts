import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 統一平台子路徑掛載：三國誌戰鬥模擬器掛在閘道的 /sanguo/ 前綴下
export default defineConfig({
  base: '/sanguo/',
  plugins: [react()],
});
