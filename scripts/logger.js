import debug from 'debug';

export function debugFactory(namespace) {
  return debug(namespace);
}

export function errorFactory(namespace) {
  return debug(`${namespace}:error`);
}
