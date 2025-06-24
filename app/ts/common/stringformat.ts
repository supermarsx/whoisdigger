/*
  formatString Helper
    formats a given string with input parameters
  parameters
    str (string) - String with placeholders
    ...args (unknown[]) - values to insert
*/

export function formatString(str: string, ...args: unknown[]): string {
  let result = str;
  args.forEach((arg, i) => {
    result = result.replace(new RegExp(`\\{${i}\\}`, 'g'), String(arg));
  });
  return result;
}
