// jshint esversion: 8

/*
  .format String Prototype
    formats a given string with input parameters
  parameters
    string + x (string) - String to include in string
 */
declare global {
  interface String {
    format(...args: any[]): string;
  }
}

String.prototype.format = function (...args: any[]): string {
  let a = this as string;
  for (const k in args) {
    a = a.replace(new RegExp(`\\{${k}\\}`, 'g'), args[k]);
  }
  return a;
};

export {};
