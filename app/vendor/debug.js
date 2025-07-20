const namespaces = new Set();
function enabled(ns) {
  for (const pat of namespaces) {
    if (pat === '*' || ns.startsWith(pat)) return true;
  }
  return false;
}
export default function debug(ns) {
  const fn = (...args) => {
    if (enabled(ns)) {
      console.debug(`[${ns}]`, ...args);
    }
  };
  fn.namespace = ns;
  return fn;
}
debug.enable = pattern => {
  pattern.split(/[,:\s]+/).forEach(p => p && namespaces.add(p));
};
debug.disable = () => namespaces.clear();
debug.enabled = enabled;
