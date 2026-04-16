import fs from "fs/promises";
import { getCache, setCache, deleteCache } from "./cache.js";
import { lockFile } from "./fileLock.js";

export const readJson = async (filePath) => {
  const cached = getCache(filePath);

  if (cached) {
    return cached;
  }

  const content = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(content);

  setCache(filePath, data);

  return data;
};

export const writeJson = async (filePath, data) => {
  const release = await lockFile(filePath);

  try {
    const tempPath = `${filePath}.tmp`;

    await fs.writeFile(
      tempPath,
      JSON.stringify(data, null, 2),
      "utf-8"
    );

    await fs.rename(tempPath, filePath);

    setCache(filePath, data);
  } finally {
    await release();
  }
};

export const updateJson = async (filePath, updater) => {
  const current = await readJson(filePath);
  const updated = await updater(current);

  await writeJson(filePath, updated);

  return updated;
};

export const clearFileCache = (filePath) => {
  deleteCache(filePath);
};