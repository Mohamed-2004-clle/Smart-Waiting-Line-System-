import { runTenantBackup } from "./jobs/backup.job.js";

const result = await runTenantBackup("tenant-001");
console.log("Backup created:", result);