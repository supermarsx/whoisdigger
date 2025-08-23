import { RequestCache } from './requestCache.js';
export const requestCache = new RequestCache();

const cleanup = (): void => {
  requestCache.close();
};

process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

export default requestCache;
