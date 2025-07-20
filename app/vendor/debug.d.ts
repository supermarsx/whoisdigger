type DebugFn = (...args: any[]) => void;
export default function debug(ns: string): DebugFn;
export const enable: (pattern: string) => void;
export const disable: () => void;
export const enabled: (ns: string) => boolean;
