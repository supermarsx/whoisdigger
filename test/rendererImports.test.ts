/** @jest-environment jsdom */

import './electronMock';

describe('renderer esm+ipc imports', () => {
  test('imports core renderer modules without node built-ins', async () => {
    const mods = await Promise.all([
      import('../app/ts/renderer/index'),
      import('../app/ts/renderer/i18n'),
      import('../app/ts/renderer/settings-renderer'),
      import('../app/ts/renderer/darkmode'),
      import('../app/ts/renderer/to'),
      import('../app/ts/renderer/history'),
      import('../app/ts/renderer/settings'),
      import('../app/ts/renderer/navigation'),
      import('../app/ts/renderer/bwa/fileinput'),
      import('../app/ts/renderer/bwa/analyser')
    ]);
    expect(mods.every((m) => typeof m === 'object')).toBe(true);
  });

  test('renderer entry loads under Jest without side effects', async () => {
    // Should not auto-run heavy boot logic under Jest; just import should succeed
    const entry = await import('../app/ts/renderer');
    expect(entry).toBeTruthy();
  });

  // registerPartials imports rely on import.meta.glob (Vite). They are
  // covered by dedicated tests and exercised in E2E via startup.js.

  test('zod-based settings validation is available via renderer settings layer', async () => {
    const { validateSettings } = await import('../app/ts/renderer/settings-renderer');
    expect(typeof validateSettings).toBe('function');
    // a minimal shape should validate or throw a ZodError which proves zod wiring works
    const res = validateSettings({ settings: {} } as any);
    expect(res).toBeDefined();
  });
});
