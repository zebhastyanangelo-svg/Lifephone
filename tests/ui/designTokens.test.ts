import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// process.cwd() es la raíz del repo; import.meta.url no es file: en jsdom.
const repoRoot = process.cwd();
const tokenCssPath = resolve(repoRoot, 'src/index.css');
const componentsDir = resolve(repoRoot, 'src/components');

async function readTokenCss(): Promise<string> {
  return readFile(tokenCssPath, 'utf8');
}

async function collectComponentSources(dir = componentsDir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectComponentSources(path)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

describe('design tokens y recetas (SPEC-07 §2)', () => {
  it.each<[string, string]>([
    ['--lp-bg-base', '#050505'],
    ['--lp-bg-surface', '#0a0a0c'],
    ['--lp-glass-bg', 'rgba(255, 255, 255, 0.03)'],
    ['--lp-glass-border', 'rgba(255, 255, 255, 0.08)'],
    ['--lp-glass-blur', '12px'],
    ['--lp-primary', '#ffffff'],
    ['--lp-accent-electric', '#0044ff'],
    ['--lp-accent-cyan', '#00f0ff'],
    ['--lp-text-muted', '#94a3b8'],
    ['--lp-radius', '12px'],
    ['--lp-radius-lg', '16px'],
    ['--lp-shadow-glass', '0 8px 32px rgba(0, 0, 0, 0.45)'],
    ['--lp-motion-fast', '160ms ease-out'],
    ['--lp-motion-base', '240ms ease-out']
  ])('define %s con el valor exacto %s', async (token, expected) => {
    const css = await readTokenCss();
    expect(css).toContain(`${token}: ${expected}`);
  });

  it('importa Tailwind', async () => {
    const css = await readTokenCss();
    expect(css).toContain('@import "tailwindcss"');
  });

  it('receta life-glass: blur(12px) tokenizado, borde y sombra sin valores mágicos', async () => {
    const css = await readTokenCss();
    expect(css).toMatch(/backdrop-filter:\s*blur\(var\(--lp-glass-blur\)\)/);
    expect(css).toMatch(/-webkit-backdrop-filter:\s*blur\(var\(--lp-glass-blur\)\)/);
    expect(css).toContain('border: 1px solid var(--lp-glass-border)');
    expect(css).toContain('box-shadow: var(--lp-shadow-glass)');
  });

  it('fallback @supports para navegadores sin backdrop-filter (SPEC-07 §2.4)', async () => {
    const css = await readTokenCss();
    expect(css).toContain('@supports not (backdrop-filter: blur(1px))');
    expect(css).toContain('rgba(10, 10, 12, 0.92)');
  });

  it('isotipo: keyframes lp-pulse y desactivación con prefers-reduced-motion (SPEC-07 §2.5)', async () => {
    const css = await readTokenCss();
    expect(css).toContain('@keyframes lp-pulse');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation: none');
  });

  it('ningún componente duplica valores mágicos de la paleta (SPEC-07 §2.2 / §6.2)', async () => {
    const magic = [
      '#050505',
      '#0a0a0c',
      '#ffffff',
      '#00f0ff',
      '#0044ff',
      '#94a3b8',
      'rgba(255, 255, 255, 0.03)',
      'rgba(255, 255, 255, 0.08)'
    ];
    const sources = await collectComponentSources();
    for (const file of sources) {
      const content = await readFile(file, 'utf8');
      for (const value of magic) {
        expect(content, `${file} no debe hardcodear ${value}`).not.toContain(value);
      }
    }
  });
});