const jQuery: typeof import('jquery') | undefined =
  (globalThis as any).jQuery ?? (globalThis as any).$;

export default jQuery as typeof import('jquery');
