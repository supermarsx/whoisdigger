// custom ambient declarations to satisfy TypeScript when we dynamically import optional
// fetch polyfill packages. We don't ship these by default, so they're declared as any.

declare module 'node-fetch';
declare module 'undici';
