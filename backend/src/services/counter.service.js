import {
  getAllCounters,
  getCountersData,
  saveCountersData
} from "../repositories/counter.repository.js";
import { getUserById } from "../repositories/user.repository.js";
import { AppError } from "../errors/AppError.js";
import { logAuditEvent } from "./audit.service.js";
import { emitToTenant } from "../sockets/index.js";

export const getAllCountersService = async (tenantId) => {
  return await getAllCounters(tenantId);
};

export const openCounterService = async (tenantId, counterId, userId = null) => {
  if (!userId) {
    throw new AppError("User is required", 401);
  }

  const user = await getUserById(tenantId, userId);
  if (!user || !user.isActive) {
    throw new AppError("User not found or inactive", 404);
  }

  const countersData = await getCountersData(tenantId);

  const counterIndex = countersData.counters.findIndex(
    (counter) => counter.id === counterId
  );

  if (counterIndex === -1) {
    throw new AppError("Counter not found", 404);
  }

  const targetCounter = countersData.counters[counterIndex];

  if (targetCounter.requiredRole && targetCounter.requiredRole !== user.role) {
    throw new AppError("Your role is not allowed to open this counter", 403);
  }

  const userTracks = Array.isArray(user.allowedTracks) ? user.allowedTracks : [];
  const counterTracks = Array.isArray(targetCounter.allowedTracks)
    ? targetCounter.allowedTracks
    : [];

  const hasSharedTrack = counterTracks.some((track) => userTracks.includes(track));

  if (!hasSharedTrack) {
    throw new AppError("You are not allowed to serve this counter tracks", 403);
  }

  if (
    targetCounter.status === "open" &&
    targetCounter.currentStaffId &&
    targetCounter.currentStaffId !== userId
  ) {
    throw new AppError("This counter is already opened by another staff member", 400);
  }

  const anotherOpenCounter = countersData.counters.find(
    (counter) =>
      counter.id !== counterId &&
      counter.status === "open" &&
      counter.currentStaffId === userId
  );

  if (anotherOpenCounter) {
    throw new AppError("You already have another open counter", 400);
  }

  if (
    targetCounter.status === "open" &&
    targetCounter.currentStaffId === userId
  ) {
    return targetCounter;
  }

  countersData.counters[counterIndex].status = "open";
  countersData.counters[counterIndex].currentStaffId = userId;
  countersData.counters[counterIndex].updatedAt = new Date().toISOString();

  await saveCountersData(tenantId, countersData);

  const updatedCounter = countersData.counters[counterIndex];

  await logAuditEvent({
    tenantId,
    userId,
    action: "OPEN_COUNTER",
    entityType: "counter",
    entityId: updatedCounter.id,
    details: {
      name: updatedCounter.name,
      allowedTracks: updatedCounter.allowedTracks || [],
      requiredRole: updatedCounter.requiredRole || null
    }
  });

  emitToTenant(tenantId, "counter_updated", updatedCounter);

  return updatedCounter;
};

export const closeCounterService = async (tenantId, counterId, userId = null) => {
  const countersData = await getCountersData(tenantId);
  const counterIndex = countersData.counters.findIndex(
    (counter) => counter.id === counterId
  );

  if (counterIndex === -1) {
    throw new AppError("Counter not found", 404);
  }

  countersData.counters[counterIndex].status = "closed";
  countersData.counters[counterIndex].currentStaffId = null;
  countersData.counters[counterIndex].currentTicketId = null;
  countersData.counters[counterIndex].updatedAt = new Date().toISOString();

  await saveCountersData(tenantId, countersData);

  const updatedCounter = countersData.counters[counterIndex];

  await logAuditEvent({
    tenantId,
    userId,
    action: "CLOSE_COUNTER",
    entityType: "counter",
    entityId: updatedCounter.id,
    details: {
      name: updatedCounter.name
    }
  });

  emitToTenant(tenantId, "counter_updated", updatedCounter);

  return updatedCounter;
};

export const assignStaffToCounterService = async (
  tenantId,
  counterId,
  staffId,
  userId = null
) => {
  const countersData = await getCountersData(tenantId);
  const counterIndex = countersData.counters.findIndex(
    (counter) => counter.id === counterId
  );

  if (counterIndex === -1) {
    throw new AppError("Counter not found", 404);
  }

  const staffUser = await getUserById(tenantId, staffId);
  if (!staffUser || !staffUser.isActive) {
    throw new AppError("Staff user not found or inactive", 404);
  }

  const targetCounter = countersData.counters[counterIndex];

  if (
    targetCounter.requiredRole &&
    targetCounter.requiredRole !== staffUser.role
  ) {
    throw new AppError("This staff role is not allowed for this counter", 403);
  }

  const staffTracks = Array.isArray(staffUser.allowedTracks)
    ? staffUser.allowedTracks
    : [];
  const counterTracks = Array.isArray(targetCounter.allowedTracks)
    ? targetCounter.allowedTracks
    : [];

  const hasSharedTrack = counterTracks.some((track) => staffTracks.includes(track));

  if (!hasSharedTrack) {
    throw new AppError("This staff member is not allowed for this counter tracks", 403);
  }

  const occupiedByAnotherStaff = countersData.counters.find(
    (counter) =>
      counter.id !== counterId &&
      counter.currentStaffId === staffId
  );

  if (occupiedByAnotherStaff) {
    throw new AppError("This staff member is already assigned to another counter", 400);
  }

  if (
    targetCounter.currentStaffId &&
    targetCounter.currentStaffId !== staffId &&
    targetCounter.status === "open"
  ) {
    throw new AppError("This counter is currently in use by another staff member", 400);
  }

  countersData.counters[counterIndex].currentStaffId = staffId;
  countersData.counters[counterIndex].updatedAt = new Date().toISOString();

  await saveCountersData(tenantId, countersData);

  const updatedCounter = countersData.counters[counterIndex];

  await logAuditEvent({
    tenantId,
    userId,
    action: "ASSIGN_STAFF_TO_COUNTER",
    entityType: "counter",
    entityId: updatedCounter.id,
    details: {
      staffId,
      allowedTracks: updatedCounter.allowedTracks || [],
      requiredRole: updatedCounter.requiredRole || null
    }
  });

  emitToTenant(tenantId, "counter_updated", updatedCounter);

  return updatedCounter;
};