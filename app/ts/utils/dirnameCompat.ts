export function dirnameCompat(): string {
  const globalDir = (global as any).__dirname;
  if (typeof globalDir === 'string') {
    return globalDir;
  }
  return process.cwd();
}
