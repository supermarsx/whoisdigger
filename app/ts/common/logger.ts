import debug from 'debug';

export function debugFactory(namespace: string) {
  return debug(namespace);
}

export function errorFactory(namespace: string) {
  return debug(`${namespace}:error`);
}

