import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { dirnameCompat } from './dirnameCompat.js';
import { fileURLToPath } from 'url';

const baseDir = dirnameCompat();

export function precompileTemplates(
  outputDir = path.join(baseDir, '..', 'app', 'compiled-templates')
) {
  const templatesDir = path.join(baseDir, '..', 'app', 'html', 'templates');
  fs.mkdirSync(outputDir, { recursive: true });

  const handlebarBin = path.join(baseDir, '..', 'node_modules', 'handlebars', 'bin', 'handlebars');

  for (const file of fs.readdirSync(templatesDir)) {
    if (path.extname(file) !== '.hbs') continue;
    const src = path.join(templatesDir, file);
    const result = spawnSync('node', [handlebarBin, src, '-s'], { encoding: 'utf8' });
    if (result.error || result.status !== 0) {
      console.error(`Failed to precompile ${file}`);
      process.exit(result.status || 1);
    }
    const compiled = result.stdout.trim();
    const outPath = path.join(outputDir, file.replace(/\.hbs$/, '.js'));
    fs.writeFileSync(outPath, `export default ${compiled};\n`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  precompileTemplates(dir && path.resolve(dir));
}
