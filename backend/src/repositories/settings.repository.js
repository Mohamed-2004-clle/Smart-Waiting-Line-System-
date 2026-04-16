import { readJson } from "../storage/fileStorage.js";
import { getTenantFilePath } from "../utils/paths.js";

export const getSettingsFilePath = (tenantId) =>
  getTenantFilePath(tenantId, "settings.json");

export const getSettings = async (tenantId) => {
  const filePath = getSettingsFilePath(tenantId);
  return await readJson(filePath);
};