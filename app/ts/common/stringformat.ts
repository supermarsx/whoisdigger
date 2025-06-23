// jshint esversion: 8

/*
  formatString Helper
    formats a given string with input parameters
  parameters
    str (string) - String with placeholders
    ...args (unknown[]) - values to insert
*/

export function formatString(str: string, ...args: unknown[]): string {
  let result = str;
  for (const k in args) {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(args[k]));
  }
  return result;
}

