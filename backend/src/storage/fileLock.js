import lockfile from "proper-lockfile";

export const lockFile = async (filePath) => {
  return await lockfile.lock(filePath, {
    retries: 3
  });
};