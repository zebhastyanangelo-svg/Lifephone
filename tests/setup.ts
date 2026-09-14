import '@testing-library/jest-dom/vitest';

// RTL monta componentes con act(); Vitest limpia el DOM tras cada test
// (auto-cleanup por globals:true). Este setup garantiza los matchers de
// jest-dom en la suite vitest (SPEC-04 §8 / SPEC-07 §6).