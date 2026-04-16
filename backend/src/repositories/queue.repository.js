import { readJson } from "../storage/fileStorage.js";
import { getTenantFilePath } from "../utils/paths.js";

export const getQueuesFilePath = (tenantId) =>
  getTenantFilePath(tenantId, "queues.json");

export const getAllQueues = async (tenantId) => {
  const filePath = getQueuesFilePath(tenantId);
  const data = await readJson(filePath);
  return Array.isArray(data.queues) ? data.queues : [];
};

export const getQueueByTrack = async (tenantId, track) => {
  const queues = await getAllQueues(tenantId);
  return queues.find((queue) => queue.track === track) || null;
};