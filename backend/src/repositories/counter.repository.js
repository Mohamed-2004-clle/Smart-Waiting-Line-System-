import { readJson, updateJson } from "../storage/fileStorage.js";
import { getTenantFilePath } from "../utils/paths.js";

export const getCountersFilePath = (tenantId) =>
  getTenantFilePath(tenantId, "counters.json");

export const getCountersData = async (tenantId) => {
  const filePath = getCountersFilePath(tenantId);
  return await readJson(filePath);
};

export const getAllCounters = async (tenantId) => {
  const data = await getCountersData(tenantId);
  return Array.isArray(data.counters) ? data.counters : [];
};

export const getCounterById = async (tenantId, counterId) => {
  const counters = await getAllCounters(tenantId);
  return counters.find((counter) => counter.id === counterId) || null;
};

export const getOpenCounterByStaffId = async (tenantId, staffId) => {
  const counters = await getAllCounters(tenantId);

  return (
    counters.find(
      (counter) =>
        counter.status === "open" && counter.currentStaffId === staffId
    ) || null
  );
};

export const getOpenCounterByStaffIdAndTrack = async (
  tenantId,
  staffId,
  track
) => {
  const counters = await getAllCounters(tenantId);

  return (
    counters.find(
      (counter) =>
        counter.status === "open" &&
        counter.currentStaffId === staffId &&
        Array.isArray(counter.allowedTracks) &&
        counter.allowedTracks.includes(track)
    ) || null
  );
};

export const saveCountersData = async (tenantId, countersData) => {
  const filePath = getCountersFilePath(tenantId);
  return await updateJson(filePath, () => countersData);
};