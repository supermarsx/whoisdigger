export function debugFactory(namespace: string) {
  return (...args: unknown[]): void => {
    const message = `[${namespace}] ${args.map(String).join(' ')}`;
    if (typeof window !== 'undefined' && (window as any)?.electron) {
      (window as any).electron.send('app:debug', message);
    } else {
      console.debug(message);
    }
  };
}

export function errorFactory(namespace: string) {
  return (...args: unknown[]): void => {
    const message = `[${namespace}] ${args.map(String).join(' ')}`;
    if (typeof window !== 'undefined' && (window as any)?.electron) {
      (window as any).electron.send('app:error', message);
    } else {
      console.error(message);
    }
  };
}
