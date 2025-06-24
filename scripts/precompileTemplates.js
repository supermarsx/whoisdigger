const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function precompileTemplates(outputDir = path.join(__dirname, '..', 'app', 'compiled-templates')) {
  const templatesDir = path.join(__dirname, '..', 'app', 'html', 'templates');
  fs.mkdirSync(outputDir, { recursive: true });

  const handlebarBin = path.join(
    __dirname,
    '..',
    'node_modules',
    'handlebars',
    'bin',
    'handlebars'
  );

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

if (require.main === module) {
  const dir = process.argv[2];
  precompileTemplates(dir && path.resolve(dir));
}

module.exports = { precompileTemplates };
