const electron = (window as any).electron as {
  send: (channel: string, ...args: any[]) => void;
};

export function sendDebug(message: string): void {
  electron.send('app:debug', message);
}

export function sendError(message: string): void {
  electron.send('app:error', message);
}
