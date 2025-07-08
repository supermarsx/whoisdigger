export function randomInt(min: number, max: number): number {
  min = Math.floor(min);
  max = Math.floor(max);
  if (min > max) [min, max] = [max, min];
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default { randomInt };
