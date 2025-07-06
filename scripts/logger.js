export function debugFactory(namespace) {
  return (...args) => {
    const message = `[${namespace}] ${args.map(String).join(' ')}`;
    console.debug(message);
  };
}

export function errorFactory(namespace) {
  return (...args) => {
    const message = `[${namespace}] ${args.map(String).join(' ')}`;
    console.error(message);
  };
}
