import path from "path";

const ROOT_DIR = path.resolve(process.cwd(), "..");
const DATA_DIR = path.join(ROOT_DIR, "data");

export const getTenantDir = (tenantId) => {
  return path.join(DATA_DIR, "tenants", tenantId);
};

export const getTenantFilePath = (tenantId, fileName) => {
  return path.join(getTenantDir(tenantId), fileName);
};

export const getGlobalFilePath = (fileName) => {
  return path.join(DATA_DIR, "global", fileName);
};