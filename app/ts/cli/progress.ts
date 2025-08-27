export function createProgressRenderer(total: number, interval?: number) {
  const step = interval ?? Math.max(1, Math.floor(total / 10));
  let completed = 0;
  return () => {
    completed++;
    if (completed % step === 0 || completed === total) {
      const pct = Math.floor((completed / total) * 100);
      process.stderr.write(`${pct}%\n`);
    }
  };
}
