import { restoreTenantBackup } from "./jobs/backup.job.js";

const backupFolderName = "2026-04-10T16-47-57-594Z";

const result = await restoreTenantBackup("tenant-001", backupFolderName);
console.log("Restore completed:", result);