const Module = require('module');

try {
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  };
} catch {}

const origRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'server-only') return {};
  if (id === 'next/cache') {
    return {
      revalidatePath: () => {},
      revalidateTag: () => {},
      unstable_cache: (fn) => fn,
    };
  }
  return origRequire.apply(this, arguments);
};

const origLoad = Module._load;
Module._load = function (request) {
  if (request === 'server-only') return {};
  if (request === 'next/cache') {
    return {
      revalidatePath: () => {},
      revalidateTag: () => {},
      unstable_cache: (fn) => fn,
    };
  }
  return origLoad.apply(this, arguments);
};
