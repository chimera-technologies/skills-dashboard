import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    environment: 'jsdom',
    // scripts/test-file.mjs sets TEST_FILE to run exactly one file
    include: process.env.TEST_FILE ? [process.env.TEST_FILE] : ['tests/unit/**/*.test.{ts,tsx}'],
    // Full runs also write per-test results (JUnit) for the SDLC test report and Xray.
    reporters: process.env.TEST_FILE ? ['default'] : ['default', 'junit'],
    outputFile: { junit: '.sdlc-results/junit-unit.xml' },
  },
});
