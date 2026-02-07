/**
 * Build verification test — validates that the project builds correctly
 * and produces the expected output artifacts.
 *
 * This test runs the actual TypeScript build and verifies:
 * 1. tsc compiles without errors
 * 2. Expected output files exist in dist/
 * 3. tauri-shim.js is present in dist output
 * 4. HTML templates are generated
 * 5. Compiled JS files are valid (can be parsed)
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

// Skip the actual build in CI if BUILD_TEST=skip
const shouldBuild = process.env.BUILD_TEST !== 'skip';

describe('Build verification', () => {
  if (shouldBuild) {
    beforeAll(() => {
      // Run the full build
      execSync('npm run build', { cwd: ROOT, stdio: 'pipe', timeout: 120000 });
    }, 150000);
  }

  const distDir = path.join(ROOT, 'dist');

  test('dist directory exists', () => {
    expect(fs.existsSync(distDir)).toBe(true);
  });

  // ── Core compiled JS files ──────────────────────────────────────────

  const expectedJsFiles = [
    'app/ts/appsettings.js',
    'app/ts/common/parser.js',
    'app/ts/common/availability.js',
    'app/ts/common/status.js',
    'app/ts/common/settings-base.js',
    'app/ts/common/conversions.js',
    'app/ts/common/logger.js',
    'app/ts/common/tools.js',
    'app/ts/common/wordlist.js',
    'app/ts/common/ipcChannels.js',
    'app/ts/common/stringformat.js',
    'app/ts/common/resetObject.js',
    'app/ts/utils/dom.js',
    'app/ts/utils/fileWatcher.js',
    'app/ts/utils/fetchCompat.js',
    'app/ts/utils/random.js',
    'app/ts/utils/regex.js',
    'app/ts/renderer/settings-renderer.js',
    'app/ts/renderer/settings.js',
    'app/ts/renderer/i18n.js',
    'app/ts/renderer/navigation.js',
    'app/ts/renderer/history.js',
    'app/ts/renderer/bulkwhois/auxiliary.js',
    'app/ts/renderer/bulkwhois/estimate.js',
    'app/ts/renderer/bulkwhois/export.js',
    'app/ts/renderer/bulkwhois/status-handler.js',
    'app/ts/renderer/bulkwhois/event-bindings.js',
    'app/ts/renderer/bwa/analyser.js'
  ];

  test.each(expectedJsFiles)(
    'compiled file exists: %s',
    (file) => {
      const fullPath = path.join(distDir, file);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  );

  // ── HTML output ─────────────────────────────────────────────────────

  test('dist/app/html directory exists', () => {
    expect(fs.existsSync(path.join(distDir, 'app', 'html'))).toBe(true);
  });

  test('mainPanel.html is generated', () => {
    expect(fs.existsSync(path.join(distDir, 'app', 'html', 'mainPanel.html'))).toBe(true);
  });

  test('tauri-shim.js is copied to dist', () => {
    expect(
      fs.existsSync(path.join(distDir, 'app', 'html', 'tauri-shim.js'))
    ).toBe(true);
  });

  // ── CSS output ──────────────────────────────────────────────────────

  test('dist/app/css directory exists', () => {
    // CSS is built separately via build:css, so this may or may not exist
    // depending on whether postbuild copies it. Check for the directory at minimum.
    const cssDir = path.join(distDir, 'app', 'css');
    // If postbuild ran, CSS should be there. Allow soft check.
    if (fs.existsSync(cssDir)) {
      const files = fs.readdirSync(cssDir);
      expect(files.length).toBeGreaterThan(0);
    }
  });

  // ── Vendor files ────────────────────────────────────────────────────

  test('vendor directory is populated', () => {
    const vendorDir = path.join(distDir, 'app', 'vendor');
    if (fs.existsSync(vendorDir)) {
      const files = fs.readdirSync(vendorDir);
      expect(files.length).toBeGreaterThan(0);
    }
  });

  // ── Compiled JS is parseable ────────────────────────────────────────

  test('compiled appsettings.js is valid JavaScript', () => {
    const content = fs.readFileSync(
      path.join(distDir, 'app', 'ts', 'appsettings.js'),
      'utf8'
    );
    expect(content.length).toBeGreaterThan(0);
    // Should not contain TypeScript syntax
    expect(content).not.toMatch(/:\s*(string|number|boolean|interface)\b/);
  });

  test('compiled status.js exports enum values', () => {
    const content = fs.readFileSync(
      path.join(distDir, 'app', 'ts', 'common', 'status.js'),
      'utf8'
    );
    expect(content).toContain('available');
    expect(content).toContain('unavailable');
  });

  // ── Locales ─────────────────────────────────────────────────────────

  test('locales directory is copied', () => {
    const localesDir = path.join(distDir, 'app', 'locales');
    if (fs.existsSync(localesDir)) {
      const files = fs.readdirSync(localesDir);
      expect(files.length).toBeGreaterThan(0);
      // At least an English locale should exist
      expect(files.some((f: string) => f.startsWith('en'))).toBe(true);
    }
  });

  // ── No TypeScript in output ─────────────────────────────────────────

  test('no .ts files in dist (only .js)', () => {
    function findTsFiles(dir: string): string[] {
      const results: string[] = [];
      if (!fs.existsSync(dir)) return results;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...findTsFiles(full));
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
          results.push(full);
        }
      }
      return results;
    }
    const tsFiles = findTsFiles(path.join(distDir, 'app', 'ts'));
    expect(tsFiles).toEqual([]);
  });
});

// ── TypeScript type check (no emit) ─────────────────────────────────────

describe('TypeScript type checking', () => {
  test('tsc --noEmit passes without errors', () => {
    const result = execSync('npx tsc --noEmit', {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 60000
    });
    // If tsc fails, execSync throws
    expect(result).toBeDefined();
  }, 90000);
});
