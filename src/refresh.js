const layerRegistry = window.layerRegistry ?? new Map();
window.layerRegistry = layerRegistry;

const rendererRegistry = window.rendererRegistry ?? new Set();
window.rendererRegistry = rendererRegistry;

function debounce(fn) {
  let timerId = null;
  return () => {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(() => fn(), 16);
  };
}

function _requestRerender() {
  for (const renderer of rendererRegistry) {
    renderer.rerender();
  }
}
const requestRerender = debounce(_requestRerender);

export function registerLayers(id, module) {
  for (const value of Object.values(module)) {
    if (typeof value === "function" && /^[A-Z]/u.test(value.name)) {
      value.id = `${id}#${value.name}`;
      layerRegistry.set(value.id, value);
    }
  }
}

export function performRefresh(oldModule, newModule) {
  const oldKeys = new Set(Object.keys(oldModule));
  const newKeys = new Set(Object.keys(newModule));
  for (const oldKey of oldKeys) {
    if (!newKeys.has(oldKey)) {
      // export removed
      return false;
    }
  }
  for (const newKey of newKeys) {
    if (!oldKeys.has(newKey)) {
      // export added
      return false;
    }
  }
  for (const key of newKeys) {
    const oldValue = oldModule[key];
    const newValue = newModule[key];
    if (
      typeof oldValue === "function"
      && typeof newValue === "function"
      && /^[A-Z]/u.test(oldValue.name)
      && /^[A-Z]/u.test(newValue.name)
      && oldValue.id
      && newValue.id
      && oldValue.id === newValue.id
    ) {
      continue;
    }
    if (Object.is(oldValue, newValue)) {
      continue;
    }
    // export updated
    return false;
  }
  requestRerender();
  return true;
}

export const importModule = (module) => import(/* @vite-ignore */ module);
