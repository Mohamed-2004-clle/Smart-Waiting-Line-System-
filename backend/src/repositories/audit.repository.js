import { readJson, updateJson } from "../storage/fileStorage.js";
import { getGlobalFilePath } from "../utils/paths.js";

export const getAuditFilePath = () => getGlobalFilePath("audit.json");

export const getAuditData = async () => {
  const filePath = getAuditFilePath();
  return await readJson(filePath);
};

export const addAuditEvent = async (event) => {
  const filePath = getAuditFilePath();

  return await updateJson(filePath, (data) => {
    if (!Array.isArray(data.events)) {
      data.events = [];
    }

    data.events.push(event);
    return data;
  });
};