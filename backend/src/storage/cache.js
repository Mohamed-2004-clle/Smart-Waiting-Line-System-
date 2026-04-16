const cache = new Map();

export const getCache = (key) => cache.get(key);

export const setCache = (key, value) => {
  cache.set(key, value);
};

export const deleteCache = (key) => {
  cache.delete(key);
};

export const clearAllCache = () => {
  cache.clear();
};

export default cache;