import fs from "fs/promises";
import path from "path";
import { getTenantDir, getGlobalFilePath } from "../utils/paths.js";
import { readJson } from "../storage/fileStorage.js";

const FILES_TO_BACKUP = [
  "queues.json",
  "tickets.json",
  "counters.json",
  "users.json",
  "settings.json",
  "services.json",
  "metrics.json",
  "migrations.json"
];

const MAX_BACKUPS = 24;

const getTimestamp = () => {
  return new Date().toISOString().replace(/[:.]/g, "-");
};

const cleanupOldBackups = async (backupDir) => {
  const entries = await fs.readdir(backupDir, { withFileTypes: true });

  const backupFolders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (backupFolders.length <= MAX_BACKUPS) {
    return;
  }

  const foldersToDelete = backupFolders.slice(0, backupFolders.length - MAX_BACKUPS);

  for (const folderName of foldersToDelete) {
    const folderPath = path.join(backupDir, folderName);
    await fs.rm(folderPath, { recursive: true, force: true });
  }
};

export const runTenantBackup = async (tenantId) => {
  const tenantDir = getTenantDir(tenantId);
  const backupDir = path.join(tenantDir, "backups");
  const timestamp = getTimestamp();
  const currentBackupDir = path.join(backupDir, timestamp);

  await fs.mkdir(currentBackupDir, { recursive: true });

  for (const fileName of FILES_TO_BACKUP) {
    const sourcePath = path.join(tenantDir, fileName);
    const targetPath = path.join(currentBackupDir, fileName);

    await fs.copyFile(sourcePath, targetPath);
  }

  await cleanupOldBackups(backupDir);

  return {
    tenantId,
    backupPath: currentBackupDir,
    files: FILES_TO_BACKUP
  };
};

export const runAllTenantsBackup = async () => {
  const tenantsFilePath = getGlobalFilePath("tenants.json");
  const tenantsData = await readJson(tenantsFilePath);

  const tenants = Array.isArray(tenantsData.tenants) ? tenantsData.tenants : [];
  const activeTenants = tenants.filter((tenant) => tenant.status === "active");

  const results = [];

  for (const tenant of activeTenants) {
    const result = await runTenantBackup(tenant.id);
    results.push(result);
  }

  return results;
};

export const startBackupScheduler = () => {
  const ONE_HOUR = 60 * 60 * 1000;

  setInterval(async () => {
    try {
      const results = await runAllTenantsBackup();
      console.log("Scheduled backups completed:", results);
    } catch (error) {
      console.error("Scheduled backup failed:", error);
    }
  }, ONE_HOUR);
};

export const restoreTenantBackup = async (tenantId, backupFolderName) => {
  const tenantDir = getTenantDir(tenantId);
  const backupDir = path.join(tenantDir, "backups", backupFolderName);

  for (const fileName of FILES_TO_BACKUP) {
    const backupFilePath = path.join(backupDir, fileName);
    const targetFilePath = path.join(tenantDir, fileName);

    await fs.copyFile(backupFilePath, targetFilePath);
  }

  return {
    tenantId,
    restoredFrom: backupFolderName,
    files: FILES_TO_BACKUP
  };
};