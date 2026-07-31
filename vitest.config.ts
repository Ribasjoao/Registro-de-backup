import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/hooks/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        'src/services/auditService.ts',
        'src/components/RegisterBackupModal.tsx',
        'src/components/RecordsView.tsx',
        'src/components/DashboardView.tsx',
        'src/components/UI.tsx',
      ],
      exclude: ['src/test/**', 'src/main.tsx', 'src/vite-env.d.ts', 'src/types.ts', 'src/constants.ts'],
      thresholds: {
        lines: 50,
        functions: 50,
      },
    },
  },
});
