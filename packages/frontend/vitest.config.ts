import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // 컴포넌트 서버 렌더 테스트(.test.ts + react-dom/server)가 .tsx 컴포넌트를 import 할 수 있도록 자동 JSX 런타임을 쓴다
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', '.next'],
    testTimeout: 30000,
  },
});
