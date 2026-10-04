import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    // scripts/test-file.mjs sets TEST_FILE to run exactly one file
    include: process.env.TEST_FILE ? [process.env.TEST_FILE] : ['tests/unit/**/*.test.{ts,tsx}'],
  },
});
