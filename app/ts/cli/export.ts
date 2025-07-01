export function generateFilename(ext: string): string {
  function pad(n: number): string {
    return String(n).padStart(2, '0');
  }
  const d = new Date();
  const datetime =
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds());
  const hex = Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0');
  return `bulkwhois-export-${datetime}-${hex}${ext}`;
}
