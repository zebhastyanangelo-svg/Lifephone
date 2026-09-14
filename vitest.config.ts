import { defineConfig } from 'vitest/config';

/**
 * Component test surface (SPEC-04 §8, SPEC-07 §6):
 * los tests de UI (tests/ui/**) corren en jsdom con React Testing Library;
 * el resto de la suite permanece en node, sin cambios.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: false,
  },
});